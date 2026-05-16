const fs = require("fs");
const path = require("path");

const file = path.join("app", "page.tsx");

if (!fs.existsSync(file)) {
  console.error("Could not find app/page.tsx. Run from C:\\Users\\adenl\\family-chat");
  process.exit(1);
}

let text = fs.readFileSync(file, "utf8");
const original = text;

// Remove the old full-screen sign-out modal block if it exists.
const oldModalRegex =
/\s*\{signOutConfirmOpen && \(\s*<div className="fixed inset-0 z-\[9999\][\s\S]*?<button onClick=\{confirmSignOut\} className="rounded-2xl bg-red-600 p-4 font-black active:scale-\[\.98\]">Sign Out<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;

text = text.replace(oldModalRegex, "");

// Add an inline popover directly ABOVE the Sign Out button inside the red account box.
const signOutButtonBlock =
`                <button
                  onClick={signOut}
                  className="w-full rounded-2xl bg-red-700 p-4 font-black active:scale-[.98]"
                >
                  Sign Out
                </button>`;

const inlinePopover =
`                {signOutConfirmOpen && (
                  <div className="mb-3 rounded-[1.5rem] border border-red-400/25 bg-zinc-950/95 p-4 text-left shadow-2xl shadow-black/50 backdrop-blur-2xl">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-lg">
                        !
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-black">Sign out?</div>
                        <p className="mt-1 text-sm font-bold leading-relaxed text-white/55">
                          Are you sure you want to sign out?
                        </p>
                      </div>
                    </div>
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
                )}

${signOutButtonBlock}`;

if (text.includes(signOutButtonBlock)) {
  text = text.replace(signOutButtonBlock, inlinePopover);
} else {
  // Fallback for versions missing active scale class.
  const altSignOutButtonBlock =
`                <button
                  onClick={signOut}
                  className="w-full rounded-2xl bg-red-700 p-4 font-black"
                >
                  Sign Out
                </button>`;

  const altInlinePopover = inlinePopover.replace(signOutButtonBlock, altSignOutButtonBlock);

  if (text.includes(altSignOutButtonBlock)) {
    text = text.replace(altSignOutButtonBlock, altInlinePopover);
  } else {
    console.error("Could not find the Sign Out button block to patch.");
    process.exit(1);
  }
}

if (text === original) {
  console.error("No changes were made.");
  process.exit(1);
}

fs.writeFileSync(file, text, "utf8");
console.log("Sign-out confirmation changed from full-screen modal to inline popover above the Sign Out button.");
