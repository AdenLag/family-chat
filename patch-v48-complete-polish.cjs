const fs = require("fs");
const path = require("path");

const file = path.join("app", "page.tsx");

if (!fs.existsSync(file)) {
  console.error("Could not find app/page.tsx. Run this from C:\\Users\\adenl\\family-chat");
  process.exit(1);
}

let text = fs.readFileSync(file, "utf8");
const original = text;
const warnings = [];

function warn(label) {
  warnings.push(label);
  console.log("Skipped optional target:", label);
}

function replaceExact(find, replace, label) {
  if (!text.includes(find)) {
    warn(label);
    return false;
  }
  text = text.replace(find, replace);
  return true;
}

function replaceRegex(regex, replace, label) {
  if (!regex.test(text)) {
    warn(label);
    return false;
  }
  text = text.replace(regex, replace);
  return true;
}

function insertAfter(find, insert, label) {
  if (text.includes(insert.trim().slice(0, 100))) return true;
  if (!text.includes(find)) {
    warn(label);
    return false;
  }
  text = text.replace(find, find + insert);
  return true;
}

// This patch is intentionally icon-safe.
// It does NOT do global emoji replacement or mojibake repair.
// New icon-like UI uses escaped unicode strings in JSX where possible.

// ---------------------------------------------------------------------------
// Safety: fix only known spread corruption if it exists.
// ---------------------------------------------------------------------------
text = text
  .replace(/\.{4,}pageBackground\(\)/g, "...pageBackground()")
  .replace(/\.{4,}extra/g, "...extra")
  .replace(/function pageBackground\(\)(\(\))+\s*\{/g, "function pageBackground() {");

// ---------------------------------------------------------------------------
// State and refs for voice previews if missing.
// ---------------------------------------------------------------------------
if (!text.includes("const [previewAttachment, setPreviewAttachment] = useState<")) {
  replaceExact(
`  const [sendingMessage, setSendingMessage] = useState(false);
  const [galleryItems, setGalleryItems] = useState<
    { url: string; name: string; type: string }[] | null
  >(null);`,
`  const [sendingMessage, setSendingMessage] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);
  const [galleryItems, setGalleryItems] = useState<
    { url: string; name: string; type: string }[] | null
  >(null);`,
    "voice/preview state"
  );
} else if (!text.includes("const [voiceNotice, setVoiceNotice]")) {
  replaceExact(
`  const [previewAttachment, setPreviewAttachment] = useState<{`,
`  const [voiceNotice, setVoiceNotice] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<{`,
    "voiceNotice state"
  );
}

if (!text.includes("const mediaRecorderRef = useRef<MediaRecorder | null>(null);") && !text.includes("const voiceRecorderRef = useRef<MediaRecorder | null>(null);")) {
  replaceExact(
`  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const loadingAccountRef = useRef(false);
  const hasLoadedAccountRef = useRef(false);`,
`  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStartedAtRef = useRef(0);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const loadingAccountRef = useRef(false);
  const hasLoadedAccountRef = useRef(false);`,
    "voice refs"
  );
}

// ---------------------------------------------------------------------------
// Voice functions if missing. Uses isRecordingVoice state.
// If the older voiceRecording version exists, leave it and only improve UI.
// ---------------------------------------------------------------------------
if (!text.includes("async function startVoiceRecording")) {
  insertAfter(
`  async function openCameraCapture() {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      // The file input still opens so iOS/Android can request permission normally.
    }
    document.getElementById("message-camera-input")?.click();
  }`,
`

  async function requestMicrophonePermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Microphone permission is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      alert("Microphone permission allowed.");
    } catch (err: any) {
      alert(err?.message || "Microphone permission was blocked.");
    }
  }

  function stopVoiceTracks() {
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
  }

  async function startVoiceRecording(event?: React.PointerEvent<HTMLButtonElement>) {
    event?.preventDefault();
    if (isRecordingVoice || sendingMessage) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceNotice("Voice recording is not available in this browser.");
      return;
    }

    try {
      setVoiceNotice("Recording voice message...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      voiceStartedAtRef.current = Date.now();

      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : MediaRecorder.isTypeSupported("audio/mp4")
              ? "audio/mp4"
              : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (recEvent) => {
        if (recEvent.data && recEvent.data.size > 0) {
          voiceChunksRef.current.push(recEvent.data);
        }
      };

      recorder.onstop = () => {
        const elapsed = Date.now() - voiceStartedAtRef.current;
        const chunks = [...voiceChunksRef.current];
        const type = chunks[0]?.type || mimeType || "audio/webm";
        stopVoiceTracks();
        setIsRecordingVoice(false);

        if (elapsed < 600 || !chunks.length) {
          setVoiceNotice("Hold the mic to record a voice message.");
          voiceChunksRef.current = [];
          return;
        }

        const blob = new Blob(chunks, { type });
        const reader = new FileReader();
        const extension = type.includes("mp4") ? "m4a" : "webm";
        const name = "voice-message-" + new Date().toISOString().replace(/[:.]/g, "-") + "." + extension;

        reader.onload = () => {
          setPendingAttachments((prev) =>
            [
              ...prev,
              {
                url: String(reader.result || ""),
                name,
                type,
                progress: 100,
              },
            ].slice(0, 18),
          );
          setVoiceNotice("Voice ready. Tap play to listen, then send.");
          voiceChunksRef.current = [];
        };

        reader.onerror = () => {
          setVoiceNotice("That voice message could not be added.");
          voiceChunksRef.current = [];
        };

        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecordingVoice(true);
    } catch (err: any) {
      stopVoiceTracks();
      setIsRecordingVoice(false);
      setVoiceNotice(err?.message || "Microphone permission was blocked.");
    }
  }

  function stopVoiceRecording(event?: React.PointerEvent<HTMLButtonElement>) {
    event?.preventDefault();
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      stopVoiceTracks();
      setIsRecordingVoice(false);
      return;
    }
    recorder.stop();
  }

  function cancelVoiceRecording() {
    voiceChunksRef.current = [];
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stopVoiceTracks();
    setIsRecordingVoice(false);
    setVoiceNotice("");
  }`,
    "voice functions"
  );
}

const recordVar = text.includes("const [voiceRecording, setVoiceRecording]") ? "voiceRecording" : "isRecordingVoice";

// ---------------------------------------------------------------------------
// Permissions: microphone button.
// ---------------------------------------------------------------------------
if (!text.includes("requestMicrophonePermission")) {
  warn("requestMicrophonePermission function unavailable");
}
if (!text.includes("Allow Microphone") && !text.includes(">Microphone<")) {
  replaceRegex(
/(<button[\s\S]*?requestPhotoPermission\("settings-photo-permission"\)[\s\S]*?Allow Photos[\s\S]*?<\/button>)/,
`$1
                <button
                  onClick={requestMicrophonePermission}
                  className="rounded-2xl bg-white/10 p-4 font-black active:scale-[.98]"
                >
                  Allow Microphone
                </button>`,
    "microphone permission button"
  );
}

// ---------------------------------------------------------------------------
// Chat list and chat header avatars/icons.
// ---------------------------------------------------------------------------
// Home chat rows already usually have avatars. Make sure read receipts are red when seen.
text = text.replace(/text-blue-400">✓✓/g, 'text-red-400">✓✓');
text = text.replace(/text-blue-500">✓✓/g, 'text-red-500">✓✓');

// Active chat header: direct already has avatar; add group/chat avatar in front of name too.
if (!text.includes("data-chat-header-avatar=\"group\"")) {
  replaceRegex(
/(\s*\{activeChat\?\.direct_key && \(\s*<Avatar[\s\S]*?rounded="rounded-full"\s*\/>\s*\)\})/,
`$1
            {activeChat && !activeChat.direct_key && (
              activeChat.icon_url ? (
                <div data-chat-header-avatar="group" className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/15 bg-black/40">
                  <img src={activeChat.icon_url} alt={chatTitle(activeChat)} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div
                  data-chat-header-avatar="group"
                  className={\`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black text-white \${bubbleClass(activeChat.chat_color || "patriot")}\`}
                  style={bubbleStyle(activeChat.chat_color)}
                >
                  {initials(chatTitle(activeChat))}
                </div>
              )
            )}`,
    "group chat header avatar"
  );
}

// In group chats, show sender avatar/profile before sender name for other people's messages.
if (!text.includes("data-sender-name-row=\"true\"")) {
  replaceRegex(
/\{!activeChat\?\.direct_key && !mine && \(\s*<div className="mb-1 text-sm font-bold opacity-70">\s*\{profileName\(msg\.user_id\)\}\s*<\/div>\s*\)\}/,
`{!activeChat?.direct_key && !mine && (
                    <div data-sender-name-row="true" className="mb-2 flex items-center gap-2 text-sm font-bold opacity-80">
                      <Avatar
                        id={msg.user_id}
                        name={profileName(msg.user_id)}
                        size="h-7 w-7"
                        rounded="rounded-full"
                      />
                      <span>{profileName(msg.user_id)}</span>
                    </div>
                  )}`,
    "sender avatar row in group messages"
  );
}

// ---------------------------------------------------------------------------
// Stories top bar hierarchy: Family big, STORIES smaller.
// ---------------------------------------------------------------------------
replaceRegex(
/<div className="text-xs font-black uppercase tracking-\[\.2em\] text-blue-200\/70">\{currentFamily\?\.name \|\| "Family Feud"\}<\/div>\s*<h1 className="text-4xl font-black">Stories<\/h1>/,
`<h1 className="text-4xl font-black">{currentFamily?.name || "Family Feud"}</h1>
                <div className="text-xs font-black uppercase tracking-[.2em] text-blue-200/70">Stories</div>`,
  "stories header family big"
);

// Story viewer edge zones 6mm.
text = text.replace(/w-\[4mm\]/g, "w-[6mm]");

// ---------------------------------------------------------------------------
// Story editor text fixes.
// ---------------------------------------------------------------------------
// T button should keep adding text boxes, not toggle/delete.
replaceRegex(
/onClick=\{\(\) =>\s*activeStoryTextId\s*\?\s*removeActiveStoryTextItem\(\)\s*:\s*addStoryTextItem\(\)\s*\}/g,
`onClick={addStoryTextItem}`,
  "T button add multiple text boxes"
);

// Remove blue ring around selected story text; trash can indicates selection.
text = text.replace(/\s*\+ \(activeStoryTextId === item\.id \? "ring-2 ring-blue-400\/80" : ""\)/g, "");
text = text.replace(/\s*\+ \(activeStoryTextId === item\.id \? "ring-2 ring-blue-400" : ""\)/g, "");
text = text.replace(/\s*\+ \(activeStoryTextId === item\.id \? "ring-2 ring-blue-500" : ""\)/g, "");
text = text.replace(/ ring-2 ring-blue-400\/80/g, "");
text = text.replace(/ ring-2 ring-blue-400/g, "");
text = text.replace(/ ring-2 ring-blue-500/g, "");

// Make text hit area a little larger and placeholder/caret match current text color.
text = text.replace(/className=\{"absolute z-30 max-w-\[92%\] select-none rounded-\[2rem\] p-4 "\s*\}/g, 'className="absolute z-30 max-w-[94%] select-none rounded-[2rem] p-5"');
text = text.replace(/min-h-\[72px\] w-\[300px\]/g, "min-h-[88px] w-[330px]");
text = text.replace(/left-6 top-5 z-0 whitespace-nowrap text-6xl/g, "left-7 top-6 z-0 whitespace-nowrap text-6xl");

// Color picker: keep selected text active and only change selected item.
if (!text.includes("function applyStoryTextColor(")) {
  insertAfter(
`  function updateStoryTextItem(id: string, patch: Partial<StoryTextItem>) {
    setStoryTextItems((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  }`,
`

  function applyStoryTextColor(color: string) {
    setStoryOverlayColor(color);
    if (activeStoryTextId) {
      updateStoryTextItem(activeStoryTextId, { color });
    }
  }`,
    "applyStoryTextColor helper"
  );
}

text = text.replace(
/onClick=\{\(\) => \{\s*setStoryOverlayColor\(color\);\s*if \(activeTextItem\) updateStoryTextItem\(activeTextItem\.id, \{ color \}\);\s*\}\}/g,
`onClick={() => applyStoryTextColor(color)}`
);

// ---------------------------------------------------------------------------
// Voice UI: restore the better WhatsApp-like hold-to-record button and banner.
// ---------------------------------------------------------------------------
if (!text.includes("Recording voice message")) {
  replaceRegex(
/(\s*\{\(pendingAttachments\.length > 0 \|\| failedDraft\) && \()/,
`
          {${recordVar} && (
            <div className="mb-2 flex items-center justify-between rounded-2xl border border-red-400/30 bg-red-950/45 px-4 py-3 text-red-50 shadow-lg shadow-red-950/30 backdrop-blur-xl">
              <div className="flex items-center gap-3 font-black">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-400" />
                </span>
                Recording voice message
              </div>
              <div className="text-xs font-bold uppercase tracking-[.18em] text-red-100/70">release to attach</div>
            </div>
          )}$1`,
    "recording banner"
  );
}

const micButtonRegex = /<button\s+type="button"\s+onPointerDown=\{startVoiceRecording\}[\s\S]*?<\/button>\s*(?=<button\s+disabled=\{sendingMessage\})/;
const micButtonReplacement =
`<button
              type="button"
              onPointerDown={startVoiceRecording}
              onPointerUp={stopVoiceRecording}
              onPointerCancel={cancelVoiceRecording || stopVoiceRecording}
              onPointerLeave={(event) => {
                if (${recordVar}) stopVoiceRecording(event);
              }}
              onClick={(event) => event.preventDefault()}
              disabled={sendingMessage}
              className={\`relative flex h-12 w-12 shrink-0 touch-none select-none items-center justify-center rounded-2xl border border-white/10 text-2xl font-black shadow-lg transition active:scale-95 disabled:opacity-60 \${${recordVar} ? "bg-red-600 text-white shadow-red-950/60" : "bg-white/10 text-white hover:bg-white/15"}\`}
              title="Hold to record voice message"
            >
              {${recordVar} && (
                <span className="absolute -inset-1 animate-ping rounded-2xl bg-red-500/35" />
              )}
              <span className="relative">{"\\uD83C\\uDF99\\uFE0F"}</span>
            </button>

            `;
replaceRegex(micButtonRegex, micButtonReplacement, "replace mic button with better UI");

// Add mic before send if missing entirely.
if (!text.includes("onPointerDown={startVoiceRecording}")) {
  replaceRegex(
/(\s*<button\s+disabled=\{sendingMessage\}\s+onClick=\{sendMessage\})/,
`
            ${micButtonReplacement}$1`,
    "insert mic button before send"
  );
}

// Voice notice near pending attachments if voiceNotice exists.
if (text.includes("voiceNotice") && !text.includes("{voiceNotice && (")) {
  replaceRegex(
/(\s*\{\(pendingAttachments\.length > 0 \|\| failedDraft\) && \()/,
`
          {voiceNotice && !${recordVar} && (
            <div className="mb-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-white/75">
              {voiceNotice}
            </div>
          )}$1`,
    "voice notice"
  );
}

// Pending preview before sending.
if (!text.includes("setPreviewAttachment({ url: item.url, name: item.name, type: item.type })")) {
  replaceRegex(
/\{item\.url && item\.type\.startsWith\("image\/"\) \? \(\s*<img\s+src=\{item\.url\}\s+alt=\{item\.name\}\s+className=\{`h-full w-full object-cover \$\{item\.progress < 100 \? "blur-sm" : ""\}`\}\s*\/>\s*\) : item\.url && item\.type\.startsWith\("audio\/"\) \? \(\s*<div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-\[10px\] font-black text-white">[\s\S]*?<\/div>\s*\) : \(\s*<div className="flex h-full w-full items-center justify-center p-2 text-center text-xs break-all">[\s\S]*?<\/div>\s*\)\}/,
`{item.url && item.type.startsWith("image/") ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewAttachment({ url: item.url, name: item.name, type: item.type })
                          }
                          className="block h-full w-full"
                          title="Preview photo"
                        >
                          <img
                            src={item.url}
                            alt={item.name}
                            className={\`h-full w-full object-cover \${item.progress < 100 ? "blur-sm" : ""}\`}
                          />
                        </button>
                      ) : item.url && item.type.startsWith("video/") ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewAttachment({ url: item.url, name: item.name, type: item.type })
                          }
                          className="flex h-full w-full items-center justify-center p-2 text-center text-xs font-black"
                          title="Preview video"
                        >
                          Video
                        </button>
                      ) : item.url && item.type.startsWith("audio/") ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewAttachment({ url: item.url, name: item.name, type: item.type })
                            }
                            className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-black"
                            title="Listen before sending"
                          >
                            Play
                          </button>
                          <span className="text-[10px] font-black text-white/70">Voice</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            item.url && setPreviewAttachment({ url: item.url, name: item.name, type: item.type })
                          }
                          className="flex h-full w-full items-center justify-center p-2 text-center text-xs break-all"
                          title="Preview file"
                        >
                          File
                        </button>
                      )}`,
    "pending attachment preview buttons"
  );
}

// Add preview modal before footer if not present.
if (!text.includes("{previewAttachment && (")) {
  replaceRegex(
/(\s*<footer className="shrink-0 border-t border-white\/10 bg-black\/80)/,
`
      {previewAttachment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/92 p-4 text-white backdrop-blur-xl">
          <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-zinc-950/95 p-4 shadow-2xl shadow-black/60">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-lg font-black">{previewAttachment.name}</div>
                <div className="text-xs font-bold text-white/45">Preview before sending</div>
              </div>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="rounded-2xl bg-white/10 px-4 py-3 font-black active:scale-[.98]"
              >
                Close
              </button>
            </div>

            {previewAttachment.type.startsWith("image/") ? (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-h-[70dvh] w-full rounded-3xl object-contain"
              />
            ) : previewAttachment.type.startsWith("video/") ? (
              <video
                src={previewAttachment.url}
                controls
                className="max-h-[70dvh] w-full rounded-3xl bg-black"
              />
            ) : previewAttachment.type.startsWith("audio/") ? (
              <div className="rounded-3xl bg-white/5 p-5">
                <div className="mb-3 text-sm font-black uppercase tracking-[.2em] text-white/45">
                  Voice message
                </div>
                <audio controls src={previewAttachment.url} className="w-full" />
              </div>
            ) : (
              <a
                href={previewAttachment.url}
                download={previewAttachment.name || "attachment"}
                className="block rounded-3xl bg-white/10 p-5 font-black underline"
              >
                Open file
              </a>
            )}
          </div>
        </div>
      )}
$1`,
    "preview modal"
  );
}

// Sent audio player if generic attachment renderer still uses only links.
if (!text.includes("audioOnly")) {
  warn("audioOnly sent-message renderer not found; current file may already have voice player or different renderer");
}

// No edit for audio messages. If current renderer has this exact menu, make sure Edit is hidden for audio.
if (!text.includes("item.type?.startsWith(\"audio/\")") && text.includes("setEditingId(msg.id)")) {
  warn("audio edit guard not detected");
}

// Keep custom domain.
text = text.replace(/const APP_URL = "https:\/\/family-chat-beige\.vercel\.app";/g, 'const APP_URL = "https://familyfeudapp.sbs";');

if (text === original) {
  console.log("No changes were made; targets may already be applied.");
} else {
  fs.writeFileSync(file, text, "utf8");
  console.log("v48 complete polish restore applied.");
}

if (warnings.length) {
  console.log("");
  console.log("Warnings / skipped optional targets:");
  warnings.forEach((w) => console.log("- " + w));
}
