const fs = require('fs');
const path = require('path');

const root = 'C:/Users/adenl/family-chat';
const pagePath = path.join(root, 'app', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.error('Could not find app/page.tsx at ' + pagePath);
  process.exit(1);
}

let text = fs.readFileSync(pagePath, 'utf8');
const before = text;
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
fs.writeFileSync(path.join(root, 'app', `page.before-emoji-symbol-repair-v36-${stamp}.bak.tsx`), text, 'utf8');

const replacements = [
  ['ðŸ¦…', '🦅'], ['ðŸ‘¥', '👥'], ['ðŸ’¬', '💬'], ['ðŸ“·', '📷'], ['ðŸ‘¤', '👤'],
  ['ðŸ ', '🏠'], ['ðŸ¡', '🏠'], ['ðŸ”Ž', '🔎'], ['ðŸ”', '🔍'], ['ðŸ›¡ï¸', '🛡️'],
  ['ðŸ—‘ï¸', '🗑️'], ['ðŸ—‘', '🗑️'], ['ðŸŽ¨', '🎨'], ['ðŸ…°ï¸', '🅰️'], ['ðŸ§Š', '🧊'],
  ['âœ¨', '✨'], ['âœŽ', '✎'], ['âœ', '✎'], ['âœ•', '✕'], ['âœ–', '✖'], ['âœ“', '✓'], ['âœ”', '✔'],
  ['â†', '←'], ['â†’', '→'], ['â‹®', '⋮'], ['â‹¯', '⋯'], ['âŒ•', '🔍'], ['âŒ˜', '⌘'],
  ['â­•', '⭕'], ['â—‹', '○'], ['â—', '●'], ['â€¢', '•'], ['â€¦', '…'],
  ['â€“', '–'], ['â€”', '—'], ['â€˜', '‘'], ['â€™', '’'], ['â€œ', '“'], ['â€', '”'],
  ['Â·', '·'], ['Â ', ' '], ['Â', ''],
  ['Ã—', '×'], ['Ã©', 'é'], ['Ã¨', 'è'], ['Ã¡', 'á'], ['Ã³', 'ó'], ['Ã±', 'ñ'],
];
for (const [bad, good] of replacements) text = text.split(bad).join(good);

// Repair known app symbols/icons explicitly in case earlier mojibake produced unusual text.
text = text.replace(/const APP_ICON = "[^"]*";/, 'const APP_ICON = "🦅";');

const settingsIcons = [
  ['Profile', '👤'],
  ['Preset looks', '✨'],
  ['Home screen', '🏠'],
  ['Default chat look', '💬'],
  ['Display size', '🔎'],
  ['App bar', '🦅'],
  ['Permissions', '📷'],
  ['App admin', '🛡️'],
];
for (const [label, icon] of settingsIcons) {
  const re = new RegExp('icon="[^"]*"\\s+label="' + label.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '"', 'g');
  text = text.replace(re, `icon="${icon}"\n                  label="${label}"`);
}

// Common visible labels/buttons where corrupted leading icons appeared.
text = text.replace(/>\s*[^<]{0,12}Your Chats<\/h2>/g, '>👥 Your Chats</h2>');
text = text.replace(/>\s*[^<]{0,12}Chats\s*<\/button>/g, '>\n            💬 Chats\n          </button>');
text = text.replace(/>\s*[^<]{0,12}Stories\s*<\/button>/g, '>\n            ⭕ Stories\n          </button>');
text = text.replace(/title="New chat"[\s\S]*?>\s*[^<]{0,12}\s*<\/button>/, (m) => m.replace(/>\s*[^<]{0,12}\s*<\/button>$/, '>\n            ✎\n          </button>'));

// Repair common inline icons in search/menu/read receipt areas.
text = text.replace(/(<[^>]*(?:search|Search)[^>]*>)(?:\s*[^<]{1,8}\s*)(<\/[^>]+>)/gi, (m) => m.includes('placeholder') ? m : m);
text = text.replace(/aria-label="Search"[^>]*>\s*[^<]{0,8}\s*<\/[^>]+>/g, (m) => m.replace(/>\s*[^<]{0,8}\s*</, '>🔍<'));
text = text.replace(/title="Search"[^>]*>\s*[^<]{0,8}\s*<\/[^>]+>/g, (m) => m.replace(/>\s*[^<]{0,8}\s*</, '>🔍<'));
text = text.replace(/title="More"[^>]*>\s*[^<]{0,8}\s*<\/[^>]+>/g, (m) => m.replace(/>\s*[^<]{0,8}\s*</, '>⋮<'));
text = text.replace(/aria-label="More"[^>]*>\s*[^<]{0,8}\s*<\/[^>]+>/g, (m) => m.replace(/>\s*[^<]{0,8}\s*</, '>⋮<'));

// Fix the family invite optional chaining build issue if it is present.
text = text.replace(/currentFamily\.invite_code/g, '(currentFamily?.invite_code || "")');

// Extra cleanup for accidental replacement artifacts from old patch scripts.
text = text.replace(/\[\.chats\]/g, '[...chats]');
text = text.replace(/\[\.pendingAttachments\]/g, '[...pendingAttachments]');
text = text.replace(/\.pageBackground\(\)/g, '...pageBackground()');
text = text.replace(/\.extra,/g, '...extra,');
text = text.replace(/rgba\(255,255,255,08\)/g, 'rgba(255,255,255,.08)');

fs.writeFileSync(pagePath, text, 'utf8');

const changed = before !== text;
const remaining = (text.match(/[âðÃ]/g) || []).length;
console.log(changed ? 'Emoji/symbol repair applied to app/page.tsx.' : 'No emoji/symbol replacements were needed.');
console.log(`Remaining suspicious mojibake marker count: ${remaining}`);
console.log('A backup was created in app/.');
