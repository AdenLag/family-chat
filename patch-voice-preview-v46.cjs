const fs = require("fs");
const path = require("path");

const file = path.join("app", "page.tsx");

if (!fs.existsSync(file)) {
  console.error("Could not find app/page.tsx. Run from C:\\Users\\adenl\\family-chat");
  process.exit(1);
}

let text = fs.readFileSync(file, "utf8");
const original = text;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function once(find, replace, label) {
  if (!text.includes(find)) fail("Could not find patch target: " + label);
  text = text.replace(find, replace);
}

function maybe(find, replace) {
  if (text.includes(find)) text = text.replace(find, replace);
}

// Keep this patch icon-safe: no emoji replacements and no mojibake repair here.

// 1) Add voice recording state and preview state.
if (!text.includes("const [isRecordingVoice, setIsRecordingVoice] = useState(false);")) {
  once(
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
    "voice state near sendingMessage"
  );
}

// 2) Add MediaRecorder refs.
if (!text.includes("const mediaRecorderRef = useRef<MediaRecorder | null>(null);")) {
  once(
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
    "MediaRecorder refs"
  );
}

// 3) Add microphone permission and voice recording functions.
if (!text.includes("async function requestMicrophonePermission()")) {
  once(
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
  }

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
    "voice functions after openCameraCapture"
  );
}

// 4) Add microphone permission button in permissions if the existing photo permission section exists.
if (!text.includes("Allow Microphone")) {
  maybe(
`                <button
                  onClick={() =>
                    requestPhotoPermission("settings-photo-permission")
                  }
                  className="rounded-2xl bg-white/10 p-4 font-black"
                >
                  🖼️ Allow Photos
                </button>`,
`                <button
                  onClick={() =>
                    requestPhotoPermission("settings-photo-permission")
                  }
                  className="rounded-2xl bg-white/10 p-4 font-black"
                >
                  🖼️ Allow Photos
                </button>
                <button
                  onClick={requestMicrophonePermission}
                  className="rounded-2xl bg-white/10 p-4 font-black"
                >
                  Mic Permission
                </button>`
  );
}

// 5) Enhance sent message attachments so voice messages play inside chats.
if (!text.includes("item.type?.startsWith(\"audio/\") ? (")) {
  const oldLinkBlockRegex = /\{items\.map\(\(item, index\) => \(\s*<a\s+key=\{`\$\{item\.name\}-\$\{index\}`\}\s+href=\{item\.url\}\s+download=\{item\.name \|\| "attachment"\}\s+className="block max-w-full overflow-hidden break-all rounded-2xl bg-black\/30 p-3 text-sm font-bold underline"\s*>\s*[\s\S]*?\{item\.name \|\| "Download attachment"\}\s*<\/a>\s*\)\)\}/;
  const newLinkBlock =
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
                              )}`;
  if (oldLinkBlockRegex.test(text)) {
    text = text.replace(oldLinkBlockRegex, newLinkBlock);
  } else {
    console.warn("Could not find sent attachment link block. Continuing without sent audio player patch.");
  }
}

// 6) Make before-send attachment cards clickable/playable for photo, video, and voice preview.
if (!text.includes("setPreviewAttachment({ url: item.url, name: item.name, type: item.type })")) {
  const pendingConditionalRegex = /\{item\.url && item\.type\.startsWith\("image\/"\) \? \(\s*<img\s+src=\{item\.url\}\s+alt=\{item\.name\}\s+className=\{`h-full w-full object-cover \$\{item\.progress < 100 \? "blur-sm" : ""\}`\}\s*\/>\s*\) : \(\s*<div className="flex h-full w-full items-center justify-center p-2 text-center text-xs break-all">\s*[\s\S]*?\s*<\/div>\s*\)\}/;
  const pendingReplacement =
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
                      )}`;
  if (pendingConditionalRegex.test(text)) {
    text = text.replace(pendingConditionalRegex, pendingReplacement);
  } else {
    console.warn("Could not find pending attachment preview conditional. Continuing.");
  }
}

// 7) Add voice notice above input when needed.
if (!text.includes("{voiceNotice && (")) {
  maybe(
`              {failedDraft && (
                <div className="mt-2 flex items-center justify-between gap-3 text-red-200">`,
`              {voiceNotice && (
                <div className="mt-2 rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-white/75">
                  {voiceNotice}
                </div>
              )}
              {failedDraft && (
                <div className="mt-2 flex items-center justify-between gap-3 text-red-200">`
  );
}

// 8) Add preview modal before the footer, right after the gallery modal.
if (!text.includes("{previewAttachment && (")) {
  const galleryEnd = `      )}

      <footer`;
  const previewModal = `      )}

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

      <footer`;
  if (text.includes(galleryEnd)) {
    text = text.replace(galleryEnd, previewModal);
  } else {
    console.warn("Could not find gallery modal end. Continuing without full preview modal.");
  }
}

// 9) Add mic hold-to-record button before Send button.
if (!text.includes("onPointerDown={startVoiceRecording}")) {
  const sendButtonStart = `            <button
              disabled={sendingMessage}
              onClick={sendMessage}`;
  const micPlusSend = `            <button
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
            </button>

            <button
              disabled={sendingMessage}
              onClick={sendMessage}`;
  if (text.includes(sendButtonStart)) {
    text = text.replace(sendButtonStart, micPlusSend);
  } else {
    console.warn("Could not find send button insertion point. Continuing without mic button.");
  }
}

// 10) Avoid editing voice messages: hide Edit button for audio attachment messages.
if (!text.includes("const hasAudioAttachment = messageAttachments(msg).some")) {
  maybe(
`            const mine = isOwnMessage(msg);
            const system = !!msg.system_type;`,
`            const mine = isOwnMessage(msg);
            const system = !!msg.system_type;
            const hasAudioAttachment = messageAttachments(msg).some((item) =>
              item.type?.startsWith("audio/"),
            );`
  );
  text = text.replace(
`                          {mine && !msg.deleted_at && (`,
`                          {mine && !msg.deleted_at && !hasAudioAttachment && (`
  );
}

// 11) Repair common syntax damage if the current local file still has dot corruption from older scripts.
// This is not icon repair; it only fixes broken spread syntax if present.
text = text
  .replace(/\{[\r\n]\s*\.pageBackground\(\),[\r\n]\s*\.extra,/g, "{\n      ...pageBackground(),\n      ...extra,")
  .replace(/const attachmentsToSend = \[\.pendingAttachments\];/g, "const attachmentsToSend = [...pendingAttachments];")
  .replace(/setMessages\(\(prev\) => \[\.prev, optimisticMessage\]\);/g, "setMessages((prev) => [...prev, optimisticMessage]);")
  .replace(/rgba\(255,255,255,08\)/g, "rgba(255,255,255,.08)");

if (text === original) {
  fail("No changes were made. The file may already have this patch or the structure changed.");
}

fs.writeFileSync(file, text, "utf8");
console.log("Voice message + preview restore patch applied without emoji/icon replacements.");
