const fs = require("fs");
const path = require("path");

const file = path.join("app", "page.tsx");

if (!fs.existsSync(file)) {
  console.error("Could not find app/page.tsx. Run this from C:\\Users\\adenl\\family-chat");
  process.exit(1);
}

let text = fs.readFileSync(file, "utf8");

const replacements = [
  ["ðŸ¦…", String.fromCodePoint(0x1F985)],          // eagle
  ["âœŽ", "\u270e"],                               // pencil
  ["ðŸ’¬", String.fromCodePoint(0x1F4AC)],          // chat bubble
  ["â­•", "\u2b55"],                               // circle
  ["ðŸ—‘", String.fromCodePoint(0x1F5D1)],          // trash
  ["ðŸŽ¨", String.fromCodePoint(0x1F3A8)],          // palette
  ["âœ¦", "\u2726"],                               // sparkle
  ["ðŸ‡ºðŸ‡¸", String.fromCodePoint(0x1F1FA, 0x1F1F8)], // US flag
  ["â†", "\u2190"],                               // left arrow
  ["ðŸ”", String.fromCodePoint(0x1F510)],          // lock
  ["ðŸ‘¥", String.fromCodePoint(0x1F465)],          // people
  ["âœ“", "\u2713"],                               // check
  ["ï¼‹", "\uff0b"],                               // fullwidth plus
  ["âŒ•", "\u2315"],                               // search symbol
  ["Ã—", "\u00d7"],                                // x
  ["ðŸ—³ï¸", String.fromCodePoint(0x1F5F3) + "\ufe0f"], // ballot
  ["Â·", "\u00b7"],                                // middle dot
  ["â‹®", "\u22ee"],                               // vertical ellipsis
  ["â†”", "\u2194"],                               // left-right arrow
  ["â€º", "\u203a"],                               // single right angle
  ["ðŸ‘¤", String.fromCodePoint(0x1F464)],          // bust
  ["âœ¨", "\u2728"],                               // sparkles
  ["ðŸ ", String.fromCodePoint(0x1F3E0)],          // home
  ["ðŸ”Ž", String.fromCodePoint(0x1F50E)],          // magnifier
  ["ðŸ“·", String.fromCodePoint(0x1F4F7)],          // camera
  ["ðŸ›¡ï¸", String.fromCodePoint(0x1F6E1) + "\ufe0f"], // shield
  ["ðŸ–¼ï¸", String.fromCodePoint(0x1F5BC) + "\ufe0f"], // framed picture
  ["â„¹ï¸", "\u2139\ufe0f"],                       // info
  ["âž•", "\u2795"],                               // plus
  ["ðŸ”—", String.fromCodePoint(0x1F517)],          // link
  ["ðŸ“Ž", String.fromCodePoint(0x1F4CE)],          // paperclip
  ["âž¤", "\u27a4"],                               // send arrow
];

for (const [bad, good] of replacements) {
  text = text.split(bad).join(good);
}

// Extra hard fixes for the exact app constants if needed.
text = text.replace(/const APP_ICON = ".*?";/, 'const APP_ICON = "🦅";');

// Report remaining suspicious mojibake markers.
// This only reports likely corruption; it does not edit random code.
const suspicious = [...text.matchAll(/(?:ð|â|Ã|Â|ï)/g)].length;

fs.writeFileSync(file, text, "utf8");

console.log("Icon/symbol repair applied to app/page.tsx.");
console.log("Remaining suspicious marker count:", suspicious);

if (suspicious > 0) {
  console.log("There may still be a few suspicious characters, but build will confirm whether code is safe.");
}
