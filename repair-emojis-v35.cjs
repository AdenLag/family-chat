const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "app", "page.tsx");
let text = fs.readFileSync(file, "utf8");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function brokenLatin1(value) {
  return Buffer.from(value, "utf8").toString("latin1");
}

const symbols = [
  "🦅","👥","💬","⭕","✎","🔒","🔍","⚙️","👤","✨","👑","🛡️","🖼️","📎","📤","🎬","🎨","🔥","⭐","🧊","🌀","🌙","🗑️","📷","📹","🎞️","📝","✅","☑️","✔","✓","✕","×","←","→","‹","›","•","…","“","”","‘","’","—","–","‑"," ","❤️","💙","💚","💛","🧡","💜","🖤","🤍","🤎","🚀","📱","📩","🔔","🔕","📌","📍","🔗","📋","🔄","➕","➖","⬅️","➡️","⬆️","⬇️","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪"
];

const manual = new Map([
  ["ðŸ¦…", "🦅"],
  ["ðŸ¦", "🦅"],
  ["ðŸ‘¥", "👥"],
  ["ðŸ’¬", "💬"],
  ["â­•", "⭕"],
  ["âœŽ", "✎"],
  ["ðŸ”’", "🔒"],
  ["ðŸ”", "🔍"],
  ["âš™ï¸", "⚙️"],
  ["ðŸ‘¤", "👤"],
  ["âœ¨", "✨"],
  ["ðŸ‘‘", "👑"],
  ["ðŸ›¡ï¸", "🛡️"],
  ["ðŸ–¼ï¸", "🖼️"],
  ["ðŸ“Ž", "📎"],
  ["ðŸ“¤", "📤"],
  ["ðŸŽ¬", "🎬"],
  ["ðŸŽ¨", "🎨"],
  ["ðŸ”¥", "🔥"],
  ["â­", "⭐"],
  ["ðŸ§Š", "🧊"],
  ["ðŸŒ€", "🌀"],
  ["ðŸŒ™", "🌙"],
  ["ðŸ—‘ï¸", "🗑️"],
  ["ðŸ“·", "📷"],
  ["ðŸ“¹", "📹"],
  ["ðŸŽžï¸", "🎞️"],
  ["ðŸ“", "📝"],
  ["âœ…", "✅"],
  ["â˜‘ï¸", "☑️"],
  ["âœ”", "✔"],
  ["âœ“", "✓"],
  ["âœ•", "✕"],
  ["Ã—", "×"],
  ["â†", "←"],
  ["â†’", "→"],
  ["â€¹", "‹"],
  ["â€º", "›"],
  ["â€¢", "•"],
  ["â€¦", "…"],
  ["â€œ", "“"],
  ["â€", "”"],
  ["â€˜", "‘"],
  ["â€™", "’"],
  ["â€”", "—"],
  ["â€“", "–"],
  ["Â ", " "],
]);

for (const sym of symbols) {
  manual.set(brokenLatin1(sym), sym);
}

// Replace longest broken sequences first.
const entries = [...manual.entries()].filter(([bad]) => bad && bad !== manual.get(bad)).sort((a, b) => b[0].length - a[0].length);
let changed = 0;
for (const [bad, good] of entries) {
  const before = text;
  text = text.replace(new RegExp(escapeRegExp(bad), "g"), good);
  if (text !== before) changed++;
}

// Fix common replacement leftovers from partial mojibake where a control char got rendered as visible junk.
text = text
  .replace(/ðŸ¦[\u0080-\u00BF]?/g, "🦅")
  .replace(/ðŸ‘[\u0080-\u00BF]?/g, "👥")
  .replace(/ðŸ’[\u0080-\u00BF]?/g, "💬")
  .replace(/ðŸ”[\u0080-\u00BF]?/g, "🔒")
  .replace(/âœ[\u0080-\u00BF]?/g, "✓")
  .replace(/â­[\u0080-\u00BF]?/g, "⭕");

// Make sure the most visible home icons are exactly right even if previous replacements missed them.
text = text
  .replace(/>\s*ð[^<]{0,8}\s*Chats/g, ">💬 Chats")
  .replace(/>\s*â[^<]{0,8}\s*Stories/g, ">⭕ Stories")
  .replace(/>\s*ð[^<]{0,8}\s*Your Chats/g, ">👥 Your Chats")
  .replace(/title="New chat"\s*>\s*[^<]{1,12}\s*<\/button>/g, 'title="New chat">✎</button>');

fs.writeFileSync(file, text, { encoding: "utf8" });
console.log(`Emoji repair v35 complete. Replacement groups applied: ${changed}.`);
