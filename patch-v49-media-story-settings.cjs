const fs = require("fs");
const path = require("path");

const file = path.join("app", "page.tsx");
if (!fs.existsSync(file)) {
  console.error("Could not find app/page.tsx. Run from C:\\Users\\adenl\\family-chat");
  process.exit(1);
}

let text = fs.readFileSync(file, "utf8");
const original = text;
const warnings = [];

function warn(label) {
  warnings.push(label);
  console.log("Skipped optional target:", label);
}

function replaceRegex(regex, replace, label) {
  if (!regex.test(text)) {
    warn(label);
    return false;
  }
  text = text.replace(regex, replace);
  return true;
}

function replaceExact(find, replace, label) {
  if (!text.includes(find)) {
    warn(label);
    return false;
  }
  text = text.replace(find, replace);
  return true;
}

function insertAfter(find, insert, label) {
  if (text.includes(insert.trim().slice(0, 90))) return true;
  if (!text.includes(find)) {
    warn(label);
    return false;
  }
  text = text.replace(find, find + insert);
  return true;
}

// Icon-safe patch: no global emoji/mojibake replacement.
text = text
  .replace(/\.{4,}pageBackground\(\)/g, "...pageBackground()")
  .replace(/\.{4,}extra/g, "...extra")
  .replace(/function pageBackground\(\)(\(\))+\s*\{/g, "function pageBackground() {");

if (!text.includes("const [fullscreenMedia, setFullscreenMedia] = useState<")) {
  if (!replaceRegex(
/  const \[previewAttachment, setPreviewAttachment\] = useState<\{\s*url: string;\s*name: string;\s*type: string;\s*\} \| null>\(null\);/,
`  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    items: { url: string; name: string; type: string }[];
    index: number;
  } | null>(null);`,
    "fullscreenMedia state after previewAttachment"
  )) {
    replaceRegex(
/  const \[galleryItems, setGalleryItems\] = useState<\s*\{ url: string; name: string; type: string \}\[\] \| null\s*>\(null\);/,
`  const [fullscreenMedia, setFullscreenMedia] = useState<{
    items: { url: string; name: string; type: string }[];
    index: number;
  } | null>(null);
  const [galleryItems, setGalleryItems] = useState<
    { url: string; name: string; type: string }[] | null
  >(null);`,
      "fullscreenMedia fallback before galleryItems"
    );
  }
}

if (!text.includes("settingsScrollRef = useRef")) {
  replaceExact(
`  const typingTimer = useRef<NodeJS.Timeout | null>(null);`,
`  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const settingsScrollRef = useRef<HTMLDivElement | null>(null);
  const chatSettingsScrollRef = useRef<HTMLDivElement | null>(null);`,
    "settings scroll refs"
  );
}

if (!text.includes("function forceTopScroll")) {
  insertAfter(
`  function tapFeedbackClass(extra = "") {
    return \`\${extra} transition duration-150 active:scale-[.97] active:brightness-125 active:blur-[.2px]\`;
  }`,
`

  function forceTopScroll(ref?: React.RefObject<HTMLDivElement | null>) {
    requestAnimationFrame(() => {
      ref?.current?.scrollTo({ top: 0, behavior: "auto" });
      document.scrollingElement?.scrollTo({ top: 0, behavior: "auto" });
      window.scrollTo({ top: 0, behavior: "auto" });
    });

    setTimeout(() => {
      ref?.current?.scrollTo({ top: 0, behavior: "auto" });
      document.scrollingElement?.scrollTo({ top: 0, behavior: "auto" });
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 60);
  }

  useEffect(() => {
    if (screen === "settings") forceTopScroll(settingsScrollRef);
    if (screen === "chatSettings") forceTopScroll(chatSettingsScrollRef);
  }, [screen]);

  useEffect(() => {
    forceTopScroll(settingsScrollRef);
  }, [settingsSection]);

  useEffect(() => {
    forceTopScroll(chatSettingsScrollRef);
  }, [chatSettingsSection]);`,
    "force top scroll helper/effects"
  );
} else {
  text = text.replace(/behavior: "smooth"/g, 'behavior: "auto"');
}

text = text.replace(/onClick=\{\(\) => setSettingsSection\(([^)]+)\)\}/g, 'onClick={() => { setSettingsSection($1); forceTopScroll(settingsScrollRef); }}');
text = text.replace(/onClick=\{\(\) => setChatSettingsSection\(([^)]+)\)\}/g, 'onClick={() => { setChatSettingsSection($1); forceTopScroll(chatSettingsScrollRef); }}');

// Remove duplicate microphone permission buttons, then add one back.
text = text.replace(
/\s*<button\s+onClick=\{requestMicrophonePermission\}\s+className="rounded-2xl bg-white\/10 p-4 font-black(?: active:scale-\[\.98\])?"\s*>\s*(?:Allow Microphone|Microphone|Mic Permission)\s*<\/button>/g,
""
);

if (!text.includes(">Allow Microphone<") && text.includes("requestMicrophonePermission")) {
  replaceRegex(
/(<button[\s\S]*?requestPhotoPermission\("settings-photo-permission"\)[\s\S]*?Allow Photos[\s\S]*?<\/button>)/,
`$1
                <button
                  onClick={requestMicrophonePermission}
                  className="rounded-2xl bg-white/10 p-4 font-black active:scale-[.98]"
                >
                  Allow Microphone
                </button>`,
    "single microphone permission button"
  );
}

if (!text.includes("function openMediaViewer(")) {
  insertAfter(
`  function visibleAttachmentGrid(
    items: { url: string; name: string; type: string }[],
  ) {
    const visible = items.slice(0, 6);
    const extra = Math.max(0, items.length - 6);
    return { visible, extra };
  }`,
`

  function openMediaViewer(
    items: { url: string; name: string; type: string }[],
    index = 0,
  ) {
    const media = items.filter((item) =>
      item.type?.startsWith("image/") ||
      item.type?.startsWith("video/") ||
      item.type?.startsWith("audio/"),
    );

    if (!media.length) return;
    setFullscreenMedia({
      items: media,
      index: Math.max(0, Math.min(index, media.length - 1)),
    });
  }

  function mediaGrid(items: { url: string; name: string; type: string }[]) {
    const media = items.filter((item) =>
      item.type?.startsWith("image/") ||
      item.type?.startsWith("video/"),
    );
    const visible = media.slice(0, 6);
    const extra = Math.max(0, media.length - visible.length);
    return { media, visible, extra };
  }`,
    "media viewer helpers"
  );
}

// Replace common image grid with 3x2 grid.
if (!text.includes("data-chat-media-grid=\"true\"")) {
  replaceRegex(
/\{items\.some\(\(item\) => item\.type\?\.startsWith\("image\/"\)\) && \([\s\S]*?<div className="grid grid-cols-2 gap-1 overflow-hidden rounded-\[1\.4rem\]">[\s\S]*?\{visibleAttachmentGrid\(items\)\.visible\.map\(\(item, index\) => \([\s\S]*?\)\)\}[\s\S]*?<\/div>\s*\)\}/,
`{items.some((item) => item.type?.startsWith("image/") || item.type?.startsWith("video/")) && (
                              <div
                                data-chat-media-grid="true"
                                className="grid grid-cols-3 gap-1 overflow-hidden rounded-[1.4rem]"
                              >
                                {mediaGrid(items).visible.map((item, index) => {
                                  const grid = mediaGrid(items);
                                  const isLastWithExtra = index === 5 && grid.extra > 0;
                                  return (
                                    <button
                                      key={\`\${item.name}-\${index}\`}
                                      type="button"
                                      onClick={() => openMediaViewer(grid.media, index)}
                                      className="relative aspect-square overflow-hidden bg-black/40"
                                      title="Open media"
                                    >
                                      {item.type?.startsWith("video/") ? (
                                        <video
                                          src={item.url}
                                          className={\`h-full w-full object-cover \${isLastWithExtra ? "blur-sm scale-110" : ""}\`}
                                          muted
                                          playsInline
                                        />
                                      ) : (
                                        <img
                                          src={item.url}
                                          alt={item.name || "Photo"}
                                          className={\`h-full w-full object-cover \${isLastWithExtra ? "blur-sm scale-110" : ""}\`}
                                          loading="lazy"
                                        />
                                      )}
                                      {isLastWithExtra && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-black backdrop-blur-[2px]">
                                          +{grid.extra}
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}`,
    "3x2 message media grid"
  );
}

// Full-screen modal.
if (!text.includes("{fullscreenMedia && (")) {
  replaceRegex(
/(\s*<footer className="shrink-0 border-t border-white\/10 bg-black\/80)/,
`      {fullscreenMedia && (
        <div className="fixed inset-0 z-[80] bg-black text-white">
          <div className="fixed inset-x-0 top-0 z-10 flex items-center justify-between bg-black/70 px-4 py-4 backdrop-blur-xl">
            <div className="text-sm font-black text-white/75">
              {fullscreenMedia.index + 1} / {fullscreenMedia.items.length}
            </div>
            <button
              onClick={() => setFullscreenMedia(null)}
              className="rounded-full bg-white/10 px-4 py-2 font-black active:scale-[.98]"
            >
              Close
            </button>
          </div>

          <div className="h-dvh overflow-y-auto px-0 pb-12 pt-20">
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {fullscreenMedia.items.map((item, index) => (
                <div
                  key={\`\${item.name}-\${index}\`}
                  className={\`flex min-h-[70dvh] items-center justify-center px-2 \${index === fullscreenMedia.index ? "scroll-mt-24" : ""}\`}
                >
                  {item.type?.startsWith("image/") ? (
                    <img
                      src={item.url}
                      alt={item.name || "Photo"}
                      className="max-h-[86dvh] w-full object-contain"
                      loading={index > 2 ? "lazy" : "eager"}
                    />
                  ) : item.type?.startsWith("video/") ? (
                    <video
                      src={item.url}
                      controls
                      playsInline
                      className="max-h-[86dvh] w-full bg-black object-contain"
                    />
                  ) : item.type?.startsWith("audio/") ? (
                    <div className="w-full rounded-[2rem] bg-white/10 p-5">
                      <div className="mb-3 text-xs font-black uppercase tracking-[.22em] text-white/45">
                        Voice message
                      </div>
                      <audio controls src={item.url} className="w-full" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
$1`,
    "fullscreen media modal"
  );
}

// Pending media preview before sending.
if (!text.includes("title=\"Preview photo\"")) {
  replaceRegex(
/\{item\.url && item\.type\.startsWith\("image\/"\) \? \(\s*<img\s+src=\{item\.url\}\s+alt=\{item\.name\}\s+className=\{`h-full w-full object-cover \$\{item\.progress < 100 \? "blur-sm" : ""\}`\}\s*\/>\s*\) : item\.url && item\.type\.startsWith\("audio\/"\) \? \([\s\S]*?\) : \(\s*<div className="flex h-full w-full items-center justify-center p-2 text-center text-xs break-all">[\s\S]*?<\/div>\s*\)\}/,
`{item.url && item.type.startsWith("image/") ? (
                        <button
                          type="button"
                          onClick={() => openMediaViewer(pendingAttachments, index)}
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
                          onClick={() => openMediaViewer(pendingAttachments, index)}
                          className="flex h-full w-full items-center justify-center p-2 text-center text-xs font-black"
                          title="Preview video"
                        >
                          Video
                        </button>
                      ) : item.url && item.type.startsWith("audio/") ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment({ url: item.url, name: item.name, type: item.type })}
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
                          onClick={() => item.url && setPreviewAttachment({ url: item.url, name: item.name, type: item.type })}
                          className="flex h-full w-full items-center justify-center p-2 text-center text-xs break-all"
                          title="Preview file"
                        >
                          File
                        </button>
                      )}`,
    "pending attachment preview"
  );
}

// Story editor contentEditable cursor where simple textarea exists.
if (!text.includes("contentEditable")) {
  replaceRegex(
/<textarea\s+value=\{item\.text\}\s+onChange=\{\(event\) => updateStoryTextItem\(item\.id, \{ text: event\.target\.value \}\)\}[\s\S]*?\/>/,
`<div
                              contentEditable
                              suppressContentEditableWarning
                              role="textbox"
                              tabIndex={0}
                              onInput={(event) =>
                                updateStoryTextItem(item.id, {
                                  text: event.currentTarget.textContent || "",
                                })
                              }
                              onFocus={() => setActiveStoryTextId(item.id)}
                              onClick={() => setActiveStoryTextId(item.id)}
                              className="min-h-[88px] w-[330px] max-w-[82vw] cursor-text whitespace-pre-wrap break-words bg-transparent text-center text-6xl font-black leading-tight outline-none caret-current"
                              style={{
                                color: item.color,
                                textShadow: "0 4px 18px rgba(0,0,0,.9)",
                              }}
                            >
                              {item.text}
                            </div>`,
    "story editor typing cursor"
  );
}

text = text.replace(/style=\{\{ color: item\.color, opacity: \.45 \}\}/g, 'style={{ color: item.color, opacity: .55 }}');

// Keep domain.
text = text.replace(/const APP_URL = "https:\/\/family-chat-beige\.vercel\.app";/g, 'const APP_URL = "https://familyfeudapp.sbs";');

if (text === original) {
  console.log("No changes were made. Targets may already be applied.");
} else {
  fs.writeFileSync(file, text, "utf8");
  console.log("v49 media/story/settings polish applied.");
}

if (warnings.length) {
  console.log("");
  console.log("Warnings / skipped optional targets:");
  warnings.forEach((w) => console.log("- " + w));
}
