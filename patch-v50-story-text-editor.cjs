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

// Icon-safe patch: no emoji/icon/global encoding replacements.
text = text
  .replace(/\.{4,}pageBackground\(\)/g, "...pageBackground()")
  .replace(/\.{4,}extra/g, "...extra")
  .replace(/function pageBackground\(\)(\(\))+\s*\{/g, "function pageBackground() {");

// Helper for text input style.
if (!text.includes("function storyTextInputClass(")) {
  insertAfter(
`  function storyTextDisplayClass(style?: string) {
    if (style === "serif") return "font-serif tracking-wide";
    if (style === "mono") return "font-mono uppercase tracking-[.18em]";
    if (style === "soft") return "font-black italic tracking-wide";
    if (style === "bubble") return "font-black";
    if (style === "outline") return "font-black";
    if (style === "glow") return "font-black tracking-wide";
    return "font-black";
  }`,
`

  function storyTextInputClass(style?: string) {
    const base =
      "min-h-[88px] w-[330px] max-w-[82vw] resize-none bg-transparent text-center text-6xl leading-tight outline-none placeholder:opacity-100 caret-current";
    return base + " " + storyTextDisplayClass(style);
  }

  function storyTextInputStyle(item: Partial<StoryTextItem>): CSSProperties {
    return {
      color: item.color || "#ffffff",
      textShadow: String(item.style || "classic") === "glow"
        ? "0 0 10px " + (item.color || "#ffffff") + ", 0 4px 18px rgba(0,0,0,.9)"
        : "0 4px 18px rgba(0,0,0,.9)",
      WebkitTextStroke:
        String(item.style || "classic") === "outline"
          ? "1.5px rgba(0,0,0,.85)"
          : undefined,
      caretColor: item.color || "#ffffff",
    } as CSSProperties;
  }`,
    "story text input helpers"
  );
}

// Color applies to selected text only.
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

text = text.replace(/onClick=\{\(\) => setStoryOverlayColor\(color\)\}/g, `onClick={() => applyStoryTextColor(color)}`);
text = text.replace(/onClick=\{\(\) => \{\s*setStoryOverlayColor\(color\);\s*if \(activeTextItem\) updateStoryTextItem\(activeTextItem\.id, \{ color \}\);\s*\}\}/g, `onClick={() => applyStoryTextColor(color)}`);
text = text.replace(/onClick=\{\(\) => \{\s*setStoryOverlayColor\(color\);\s*if \(activeStoryTextId\) updateStoryTextItem\(activeStoryTextId, \{ color \}\);\s*\}\}/g, `onClick={() => applyStoryTextColor(color)}`);

// Font/style applies to selected text only.
if (!text.includes("function applyStoryTextStyle(")) {
  insertAfter(
`  function selectStoryTextStyle(style: string) {
    if (!activeStoryTextId) return;
    updateStoryTextItem(activeStoryTextId, { style });
  }`,
`

  function applyStoryTextStyle(style: string) {
    if (activeStoryTextId) {
      updateStoryTextItem(activeStoryTextId, { style });
    }
  }`,
    "applyStoryTextStyle helper"
  );
}

text = text.replace(/onClick=\{\(\) => selectStoryTextStyle\(style\)\}/g, `onClick={() => applyStoryTextStyle(style)}`);

// Replace story textarea with matched style textarea.
replaceRegex(
/<textarea\s+value=\{item\.text\}\s+onChange=\{\(event\) => updateStoryTextItem\(item\.id, \{ text: event\.target\.value \}\)\}[\s\S]*?placeholder="Type here"[\s\S]*?\/>/g,
`<textarea
                              value={item.text}
                              onChange={(event) =>
                                updateStoryTextItem(item.id, {
                                  text: event.target.value,
                                })
                              }
                              onFocus={() => setActiveStoryTextId(item.id)}
                              onClick={() => setActiveStoryTextId(item.id)}
                              placeholder="Type here"
                              rows={2}
                              className={storyTextInputClass(item.style)}
                              style={storyTextInputStyle(item)}
                            />`,
  "story textarea matched text/caret"
);

// If contentEditable exists from v49, replace with matched textarea.
replaceRegex(
/<div\s+contentEditable\s+suppressContentEditableWarning[\s\S]*?role="textbox"[\s\S]*?tabIndex=\{0\}[\s\S]*?onInput=\{\(event\) =>[\s\S]*?updateStoryTextItem\(item\.id, \{[\s\S]*?text: event\.currentTarget\.textContent \|\| "",[\s\S]*?\}\)[\s\S]*?\}[\s\S]*?onFocus=\{\(\) => setActiveStoryTextId\(item\.id\)\}[\s\S]*?onClick=\{\(\) => setActiveStoryTextId\(item\.id\)\}[\s\S]*?className="[^"]*"[\s\S]*?style=\{\{[\s\S]*?\}\}\s*>\s*\{item\.text\}\s*<\/div>/g,
`<textarea
                              value={item.text}
                              onChange={(event) =>
                                updateStoryTextItem(item.id, {
                                  text: event.target.value,
                                })
                              }
                              onFocus={() => setActiveStoryTextId(item.id)}
                              onClick={() => setActiveStoryTextId(item.id)}
                              placeholder="Type here"
                              rows={2}
                              className={storyTextInputClass(item.style)}
                              style={storyTextInputStyle(item)}
                            />`,
  "replace contentEditable with matched textarea"
);

// Remove fake placeholder layer if present.
text = text.replace(/\s*\{!item\.text && \(\s*<div\s+className="pointer-events-none absolute[^"]*"[\s\S]*?Type here[\s\S]*?<\/div>\s*\)\}/g, "");

// Make larger/easier to tap.
text = text.replace(/max-w-\[92%\] select-none rounded-\[2rem\] p-4/g, "max-w-[94%] select-none rounded-[2rem] p-5");
text = text.replace(/min-h-\[72px\] w-\[300px\]/g, "min-h-[88px] w-[330px]");
text = text.replace(/text-5xl/g, "text-6xl");

// New text uses selected color and bigger default.
text = text.replace(/\{ id, text: "", color: storyOverlayColor, x: 50, y: 45, scale: ([^,]+), rotate: 0, style: "classic" \}/g, `{ id, text: "", color: storyOverlayColor, x: 50, y: 45, scale: 1.28, rotate: 0, style: "classic" }`);

// Remove blue ring.
text = text.replace(/\s*\+ \(activeStoryTextId === item\.id \? "ring-2 ring-blue-400\/80" : ""\)/g, "");
text = text.replace(/\s*\+ \(activeStoryTextId === item\.id \? "ring-2 ring-blue-400" : ""\)/g, "");
text = text.replace(/\s*\+ \(activeStoryTextId === item\.id \? "ring-2 ring-blue-500" : ""\)/g, "");
text = text.replace(/ ring-2 ring-blue-400\/80/g, "");
text = text.replace(/ ring-2 ring-blue-400/g, "");
text = text.replace(/ ring-2 ring-blue-500/g, "");

// T button always adds text.
text = text.replace(/onClick=\{\(\) =>\s*activeStoryTextId\s*\?\s*removeActiveStoryTextItem\(\)\s*:\s*addStoryTextItem\(\)\s*\}/g, `onClick={addStoryTextItem}`);

// Keep custom domain.
text = text.replace(/const APP_URL = "https:\/\/family-chat-beige\.vercel\.app";/g, 'const APP_URL = "https://familyfeudapp.sbs";');

if (text === original) {
  console.log("No changes were made. Targets may already be applied.");
} else {
  fs.writeFileSync(file, text, "utf8");
  console.log("v50 story text editor fix applied.");
}

if (warnings.length) {
  console.log("");
  console.log("Warnings / skipped optional targets:");
  warnings.forEach((w) => console.log("- " + w));
}
