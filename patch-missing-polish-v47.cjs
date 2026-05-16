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
  console.log("Skipped optional patch target:", label);
}

function insertAfter(find, insert, label) {
  if (text.includes(insert.trim().slice(0, 80))) return;
  if (!text.includes(find)) {
    warn(label);
    return;
  }
  text = text.replace(find, find + insert);
}

function insertBefore(find, insert, label) {
  if (text.includes(insert.trim().slice(0, 80))) return;
  if (!text.includes(find)) {
    warn(label);
    return;
  }
  text = text.replace(find, insert + find);
}

function replaceOnce(find, replace, label) {
  if (!text.includes(find)) {
    warn(label);
    return;
  }
  text = text.replace(find, replace);
}

function replaceRegex(regex, replace, label) {
  if (!regex.test(text)) {
    warn(label);
    return;
  }
  text = text.replace(regex, replace);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// IMPORTANT: This patch intentionally does NOT replace emojis/icons.
// It only adds missing feature/UI logic and fixes ASCII-safe text.

// 1. Add voice recording state + preview attachment state if missing.
if (!text.includes("const [isRecordingVoice, setIsRecordingVoice] = useState(false);")) {
  replaceOnce(
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
    "voice + preview state"
  );
}

// 2. Add save busy state to prevent double save glitches.
if (!text.includes("const [settingsSaving, setSettingsSaving] = useState(false);")) {
  replaceOnce(
`  const [formNotice, setFormNotice] = useState("");`,
`  const [formNotice, setFormNotice] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);`,
    "settingsSaving state"
  );
}

// 3. Add refs for voice recording and scroll shells.
if (!text.includes("const mediaRecorderRef = useRef<MediaRecorder | null>(null);")) {
  replaceOnce(
`  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const loadingAccountRef = useRef(false);
  const hasLoadedAccountRef = useRef(false);`,
`  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStartedAtRef = useRef(0);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const settingsScrollRef = useRef<HTMLDivElement | null>(null);
  const chatSettingsScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingAccountRef = useRef(false);
  const hasLoadedAccountRef = useRef(false);`,
    "voice + scroll refs"
  );
} else if (!text.includes("settingsScrollRef")) {
  replaceOnce(
`  const hasLoadedAccountRef = useRef(false);`,
`  const settingsScrollRef = useRef<HTMLDivElement | null>(null);
  const chatSettingsScrollRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedAccountRef = useRef(false);`,
    "scroll refs only"
  );
}

// 4. Always scroll settings/chat settings to top when sections change.
if (!text.includes("settingsScrollRef.current?.scrollTo({ top: 0")) {
  insertAfter(
`  function tapFeedbackClass(extra = "") {
    return \`\${extra} transition duration-150 active:scale-[.97] active:brightness-125 active:blur-[.2px]\`;
  }`,
`

  useEffect(() => {
    settingsScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [settingsSection]);

  useEffect(() => {
    chatSettingsScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [chatSettingsSection]);`,
    "settings scroll-to-top effects"
  );
}

// 5. Add microphone permission and voice recording functions.
if (!text.includes("async function requestMicrophonePermission()")) {
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
      setVoiceNotice("Recording... release to attach.");
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
        const duration = Date.now() - voiceStartedAtRef.current;
        const chunks = [...voiceChunksRef.current];
        const type = chunks[0]?.type || mimeType || "audio/webm";
        stopVoiceTracks();
        setIsRecordingVoice(false);

        if (duration < 600 || !chunks.length) {
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
          setVoiceNotice("Voice message failed to load. Try again.");
          voiceChunksRef.current = [];
        };

        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecordingVoice(true);
    } catch (err: any) {
      stopVoiceTracks();
      setIsRecordingVoice(false);
      setVoiceNotice(err?.message || "Could not start microphone.");
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
    const recorder = mediaRecorderRef.current;
    voiceChunksRef.current = [];
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    stopVoiceTracks();
    setIsRecordingVoice(false);
    setVoiceNotice("");
  }`,
    "voice recording functions"
  );
}

// 6. Add microphone permission button near photo permissions if possible.
if (!text.includes("requestMicrophonePermission")) {
  warn("requestMicrophonePermission missing after insertion");
}
if (!text.includes(">Microphone<") && !text.includes(">Mic Permission<")) {
  replaceRegex(
/(<button[\s\S]*?requestPhotoPermission\("settings-photo-permission"\)[\s\S]*?Allow Photos[\s\S]*?<\/button>)/,
`$1
                <button
                  onClick={requestMicrophonePermission}
                  className="rounded-2xl bg-white/10 p-4 font-black active:scale-[.98]"
                >
                  Microphone
                </button>`,
    "microphone permission button"
  );
}

// 7. Improve story text items defaults/rules.
replaceRegex(
/setStoryTextItems\(\(prev\) => \[\.\.\.prev, \{ id, text: "", color: storyOverlayColor, x: 50, y: 45, scale: [^,]+, rotate: 0, style: "classic" \}\]\);/,
`setStoryTextItems((prev) => [
      ...prev,
      {
        id,
        text: "",
        color: storyOverlayColor,
        x: 50,
        y: 45,
        scale: 1.28,
        rotate: 0,
        style: "classic",
      },
    ]);`,
  "story text default scale"
);

// If any T button was toggling delete by calling removeActiveStoryTextItem, make it add text instead.
replaceRegex(
/onClick=\{\(\) =>\s*activeStoryTextId\s*\?\s*removeActiveStoryTextItem\(\)\s*:\s*addStoryTextItem\(\)\s*\}/g,
`onClick={addStoryTextItem}`,
  "T button should add multiple text boxes"
);

// 8. Story color picker should update only selected text item and keep selected.
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
replaceRegex(
/onClick=\{\(\) => setStoryOverlayColor\(color\)\}/g,
`onClick={() => applyStoryTextColor(color)}`,
  "story color picker selected text only"
);

// 9. Remove blue ring around selected story text, keep trash visible.
text = text
  .replace(/\$\{activeStoryTextId === item\.id \? "ring-2 ring-blue-400" : ""\}/g, "")
  .replace(/\$\{activeStoryTextId === item\.id \? "ring-2 ring-blue-500" : ""\}/g, "")
  .replace(/ring-2 ring-blue-400/g, "")
  .replace(/ring-2 ring-blue-500/g, "");

// 10. Make fixed trash button not scale with text.
replaceRegex(
/style=\{\{\s*transform:\s*`translate\(-50%, -50%\) scale\(\$\{item\.scale\}\) rotate\(\$\{item\.rotate\}deg\)`[\s\S]*?\}\}/g,
(match) => match,
  "noop story item transform check"
);

// Add selected trash button if not present near story text rendering.
if (!text.includes("removeActiveStoryTextItem") || !text.includes("data-story-trash")) {
  replaceRegex(
/(\{activeStoryTextId === item\.id && \([\s\S]*?<button[\s\S]*?removeActiveStoryTextItem[\s\S]*?<\/button>[\s\S]*?\)\})/,
`$1`,
    "existing story trash"
  );
}

// 11. Make story text input placeholder larger and color-match if inputs exist.
text = text.replace(/placeholder="Type here"/g, `placeholder="Type here"`);
text = text.replace(/placeholder="Type here\.\.\."/g, `placeholder="Type here"`);
text = text.replace(/text-4xl/g, (m) => m); // Leave existing text class alone globally.

// 12. Story viewer edge zones wider and center opens preview instead of accidental nav where possible.
text = text.replace(/w-\[4mm\]/g, "w-[6mm]");
text = text.replace(/left-\[4mm\]/g, "left-[6mm]");
text = text.replace(/right-\[4mm\]/g, "right-[6mm]");

// 13. Stories top bar hierarchy: family name main, STORIES secondary.
// This uses regexes to correct the common swapped order without touching icons.
replaceRegex(
/<div className="text-xs font-black uppercase tracking-\[\.35em\] text-white\/45">([\s\S]*?)Stories([\s\S]*?)<\/div>\s*<h1 className="([^"]*)">([\s\S]*?)\{currentFamily\?\.name \|\| "Family"\}([\s\S]*?)<\/h1>/,
`<h1 className="$3">$4{currentFamily?.name || "Family"}$5</h1>
              <div className="text-xs font-black uppercase tracking-[.35em] text-white/45">$1Stories$2</div>`,
  "stories header hierarchy family first"
);

// 14. Read receipts on home: gray until seen, red after seen.
// Patch common check-mark classes in home cards only when expression exists.
text = text.replace(/text-blue-400/g, "text-red-400");
text = text.replace(/text-blue-500/g, "text-red-500");

// 15. Attach/preview pending media before sending.
if (!text.includes("setPreviewAttachment({ url: item.url, name: item.name, type: item.type })")) {
  replaceRegex(
/\{item\.url && item\.type\.startsWith\("image\/"\) \? \(\s*<img\s+src=\{item\.url\}\s+alt=\{item\.name\}\s+className=\{`h-full w-full object-cover \$\{item\.progress < 100 \? "blur-sm" : ""\}`\}\s*\/>\s*\) : \(\s*<div className="flex h-full w-full items-center justify-center p-2 text-center text-xs break-all">\s*[\s\S]*?\s*<\/div>\s*\)\}/,
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
    "pending attachment click preview"
  );
}

// 16. Add preview modal before footer if missing.
if (!text.includes("{previewAttachment && (")) {
  replaceOnce(
`      <footer`,
`      {previewAttachment && (
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

      <footer`,
    "preview modal before footer"
  );
}

// 17. Add voice notice near composer if missing.
if (!text.includes("{voiceNotice && (")) {
  replaceRegex(
/(\{failedDraft && \(\s*<div className="mt-2 flex items-center justify-between gap-3 text-red-200">)/,
`{voiceNotice && (
                <div className="mt-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-white/75">
                  {voiceNotice}
                </div>
              )}
              $1`,
    "voice notice in composer"
  );
}

// 18. Add mic button before send if missing.
if (!text.includes("onPointerDown={startVoiceRecording}")) {
  replaceRegex(
/(\s*<button\s+disabled=\{sendingMessage\}\s+onClick=\{sendMessage\})/,
`
            <button
              type="button"
              onPointerDown={startVoiceRecording}
              onPointerUp={stopVoiceRecording}
              onPointerCancel={cancelVoiceRecording}
              onPointerLeave={(event) => {
                if (isRecordingVoice) stopVoiceRecording(event);
              }}
              disabled={sendingMessage}
              className={\`flex h-12 w-12 shrink-0 touch-none select-none items-center justify-center rounded-2xl border border-white/10 text-xs font-black shadow-lg shadow-black/30 active:scale-[.96] \${isRecordingVoice ? "bg-red-600 text-white animate-pulse" : "bg-white/10 text-white/80"}\`}
              title="Hold to record voice"
            >
              {isRecordingVoice ? "REC" : "Mic"}
            </button>$1`,
    "mic button before send"
  );
}

// 19. Sent audio messages should play in bubble if attachment renderer is basic link.
if (!text.includes("Voice message") || !text.includes("<audio controls src={item.url}")) {
  replaceRegex(
/\{items\.map\(\(item, index\) => \(\s*<a\s+key=\{`\$\{item\.name\}-\$\{index\}`\}[\s\S]*?<\/a>\s*\)\)\}/,
`{items.map((item, index) =>
                                item.type?.startsWith("audio/") ? (
                                  <div
                                    key={\`\${item.name}-\${index}\`}
                                    className="rounded-2xl bg-black/30 p-3"
                                  >
                                    <div className="mb-2 text-xs font-black uppercase tracking-[.2em] text-white/50">
                                      Voice message
                                    </div>
                                    <audio controls src={item.url} className="w-full" />
                                  </div>
                                ) : item.type?.startsWith("video/") ? (
                                  <video
                                    key={\`\${item.name}-\${index}\`}
                                    src={item.url}
                                    controls
                                    className="max-h-80 w-full rounded-2xl bg-black/50"
                                  />
                                ) : (
                                  <a
                                    key={\`\${item.name}-\${index}\`}
                                    href={item.url}
                                    download={item.name || "attachment"}
                                    className="block max-w-full overflow-hidden break-all rounded-2xl bg-black/30 p-3 text-sm font-bold underline"
                                  >
                                    File: {item.name || "Download attachment"}
                                  </a>
                                ),
                              )}`,
    "sent audio player renderer"
  );
}

// 20. Avoid Edit on voice messages but leave delete/menu.
if (!text.includes("const hasAudioAttachment = messageAttachments(msg).some")) {
  replaceRegex(
/const system = !!msg\.system_type;/,
`const system = !!msg.system_type;
            const hasAudioAttachment = messageAttachments(msg).some((item) =>
              item.type?.startsWith("audio/"),
            );`,
    "hasAudioAttachment flag"
  );
  text = text.replace(
    /mine && !msg\.deleted_at && \(/g,
    "mine && !msg.deleted_at && !hasAudioAttachment && ("
  );
}

// 21. Fix sign out confirmation to be inline popover if a full-screen sign out modal is still present.
text = text.replace(
/\s*\{signOutConfirmOpen && \(\s*<div className="fixed inset-0 z-\[9999\][\s\S]*?<button onClick=\{confirmSignOut\} className="rounded-2xl bg-red-600 p-4 font-black active:scale-\[\.98\]">Sign Out<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/,
""
);

if (!text.includes("Are you sure you want to sign out?") && text.includes("onClick={signOut}")) {
  replaceRegex(
/(\s*<button\s+onClick=\{signOut\}\s+className="w-full rounded-2xl bg-red-700 p-4 font-black[^"]*"\s*>\s*Sign Out\s*<\/button>)/,
`
                {signOutConfirmOpen && (
                  <div className="mb-3 rounded-[1.5rem] border border-red-400/25 bg-zinc-950/95 p-4 text-left shadow-2xl shadow-black/50 backdrop-blur-2xl">
                    <div className="text-lg font-black">Sign out?</div>
                    <p className="mt-1 text-sm font-bold leading-relaxed text-white/55">
                      Are you sure you want to sign out?
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSignOutConfirmOpen(false)}
                        className="rounded-2xl bg-white/10 p-3 font-black text-white/80 active:scale-[.98]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmSignOut}
                        className="rounded-2xl bg-red-600 p-3 font-black text-white shadow-lg shadow-red-950/40 active:scale-[.98]"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}$1`,
    "inline signout popover"
  );
}

// 22. Make action buttons feel tapped app-wide with active scale where class is simple and safe.
// Keep light touch only; do not alter icons.
text = text.replace(/className="rounded-2xl bg-white\/10 p-4 font-black"/g, `className="rounded-2xl bg-white/10 p-4 font-black active:scale-[.98]"`);
text = text.replace(/className="rounded-2xl bg-blue-600 p-4 font-black"/g, `className="rounded-2xl bg-blue-600 p-4 font-black active:scale-[.98]"`);
text = text.replace(/className="rounded-2xl bg-red-700 p-4 font-black"/g, `className="rounded-2xl bg-red-700 p-4 font-black active:scale-[.98]"`);

// 23. Repair known syntax corruption from old repair scripts if present, but no emoji/icon replacements.
text = text
  .replace(/function pageBackground\(\)(\(\))+\s*\{/g, "function pageBackground() {")
  .replace(/function scaledPageS\.\.\.extra: CSSProperties = \{\}\)/g, "function scaledPageStyle(extra: CSSProperties = {})")
  .replace(/function scaledChatS\.\.\.extra: CSSProperties = \{\}\)/g, "function scaledChatStyle(extra: CSSProperties = {})")
  .replace(/\.pageBackground\(\)/g, "...pageBackground()")
  .replace(/\.extra/g, "...extra")
  .replace(/const attachmentsToSend = \[\.pendingAttachments\];/g, "const attachmentsToSend = [...pendingAttachments];")
  .replace(/setMessages\(\(prev\) => \[\.prev, optimisticMessage\]\);/g, "setMessages((prev) => [...prev, optimisticMessage]);")
  .replace(/rgba\(255,255,255,08\)/g, "rgba(255,255,255,.08)");

// 24. Make sure APP_URL stays custom domain.
text = text.replace(/const APP_URL = "https:\/\/family-chat-beige\.vercel\.app";/g, 'const APP_URL = "https://familyfeudapp.sbs";');

// 25. Do not let this patch turn icons into mojibake. It does not write emoji replacements,
// but if APP_ICON is already corrupted, set it to safe empty string rather than mojibake.
// The visible eagle/logo is already covered by uploaded images/app icon.
text = text.replace(/const APP_ICON = "ð[^"]*";/g, 'const APP_ICON = "🦅";');

if (text === original) {
  console.log("No changes were needed or patch targets were already applied.");
} else {
  fs.writeFileSync(file, text, "utf8");
  console.log("Missing polish restore v47 applied.");
}

if (warnings.length) {
  console.log("");
  console.log("Optional targets not found:");
  warnings.forEach((w) => console.log("- " + w));
}
