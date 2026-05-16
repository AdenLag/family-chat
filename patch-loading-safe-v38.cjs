
const fs = require("fs");
const path = require("path");

const appDir = path.join(process.cwd(), "app");
const pagePath = path.join(appDir, "page.tsx");

if (!fs.existsSync(pagePath)) {
  console.error("Could not find app/page.tsx. Run this from C:\\Users\\adenl\\family-chat");
  process.exit(1);
}

let text = fs.readFileSync(pagePath, "utf8");
const backup = path.join(appDir, `page.before-loading-safe-v38-${Date.now()}.bak.tsx`);
fs.writeFileSync(backup, text, "utf8");

function mustReplace(find, replace, label) {
  if (!text.includes(find)) {
    console.error("Patch could not find: " + label);
    process.exit(1);
  }
  text = text.replace(find, replace);
}

if (!text.includes('| "loading"')) {
  mustReplace(
`type Screen =
  | "auth"`,
`type Screen =
  | "loading"
  | "auth"`,
"Screen type auth line"
  );
}

if (!text.includes('const [screen, setScreen] = useState<Screen>("loading");')) {
  text = text.replace(
    'const [screen, setScreen] = useState<Screen>("auth");',
    'const [screen, setScreen] = useState<Screen>("loading");'
  );
}

if (!text.includes('const [startupProgress, setStartupProgress] = useState(8);')) {
  mustReplace(
`  const [isSignUp, setIsSignUp] = useState(true);`,
`  const [isSignUp, setIsSignUp] = useState(true);
  const [startupProgress, setStartupProgress] = useState(8);`,
"startup progress state"
  );
}

const oldEffect = `  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) loadAccount(data.session.user.id, true);
      else setScreen("auth");
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          hasLoadedAccountRef.current = false;
          setUserId("");
          setUserEmail("");
          setProfile(null);
          setChats([]);
          setMessages([]);
          setActiveChat(null);
          setScreen("auth");
          return;
        }

        if (event === "SIGNED_IN" && !hasLoadedAccountRef.current) {
          loadAccount(session.user.id, true);
          return;
        }

        setUserId(session.user.id);
        setUserEmail(session.user.email || "");
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);`;

const newEffect = `  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    const minimumMs = 5000;

    const progressTimer = window.setInterval(() => {
      setStartupProgress((value) => Math.min(96, value + 3));
    }, 160);

    const finishStartup = (nextScreen: Screen) => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, minimumMs - elapsed);
      window.setTimeout(() => {
        if (cancelled) return;
        setStartupProgress(100);
        window.setTimeout(() => {
          if (!cancelled) setScreen(nextScreen);
        }, 180);
      }, remaining);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;

      if (data.session?.user) {
        try {
          await loadAccount(data.session.user.id, false);
          if (!cancelled) finishStartup("home");
        } catch {
          if (!cancelled) finishStartup("auth");
        }
      } else {
        finishStartup("auth");
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          hasLoadedAccountRef.current = false;
          setUserId("");
          setUserEmail("");
          setProfile(null);
          setChats([]);
          setMessages([]);
          setActiveChat(null);
          if (screen !== "loading") setScreen("auth");
          return;
        }

        if (event === "SIGNED_IN" && !hasLoadedAccountRef.current) {
          loadAccount(session.user.id, true);
          return;
        }

        setUserId(session.user.id);
        setUserEmail(session.user.email || "");
      },
    );

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
      listener.subscription.unsubscribe();
    };
  }, []);`;

if (!text.includes("const minimumMs = 5000;")) {
  if (!text.includes(oldEffect)) {
    console.error("Patch could not find the existing auth useEffect. The file may have changed.");
    process.exit(1);
  }
  text = text.replace(oldEffect, newEffect);
}

const loadingBlock = `  if (screen === "loading") {
    return (
      <main
        className="flex min-h-screen items-center justify-center overflow-hidden p-6 text-white"
        style={scaledPageStyle()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,.35),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(185,28,28,.28),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(234,179,8,.16),transparent_38%)]" />
        <div className="relative w-full max-w-md rounded-[2rem] border border-white/15 bg-zinc-950/70 p-6 text-center shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/15 bg-white/10 shadow-2xl shadow-black/50">
            <span className="bg-gradient-to-br from-yellow-200 via-white to-yellow-500 bg-clip-text text-4xl font-black italic text-transparent">
              FF
            </span>
          </div>

          <h1 className="bg-gradient-to-r from-yellow-300 via-white to-yellow-500 bg-clip-text text-5xl font-black italic tracking-tight text-transparent">
            Family Feud
          </h1>
          <p className="mt-2 text-sm font-bold uppercase tracking-[.2em] text-white/45">
            Loading your family
          </p>

          <div className="mt-7 overflow-hidden rounded-full border border-white/10 bg-white/10 p-1">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-blue-500 via-white to-red-500 shadow-lg shadow-blue-950/40 transition-all duration-300"
              style={{ width: \`\${startupProgress}%\` }}
            />
          </div>

          <div className="mt-4 text-xs font-bold text-white/45">
            Checking your secure session...
          </div>
        </div>
      </main>
    );
  }

`;

if (!text.includes('if (screen === "loading")')) {
  const authMarker = `  if (screen === "auth") {`;
  if (!text.includes(authMarker)) {
    console.error("Patch could not find the auth screen render block.");
    process.exit(1);
  }
  text = text.replace(authMarker, loadingBlock + authMarker);
}

fs.writeFileSync(pagePath, text, "utf8");
console.log("Safe startup loading screen patch applied.");
console.log("Backup created: " + backup);
