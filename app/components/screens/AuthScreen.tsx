"use client";

type Props = {
  scaledPageStyle: any;
  card: any;
  isSignUp: boolean;
  setIsSignUp: (value: boolean) => void;
  signInWithGoogle: () => void;
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  authError: string;
  authBusy: boolean;
  signUp: () => void;
  signIn: () => void;
  bubbleClass: any;
  bubbleStyle: any;
  settingsColor: string;
};

export default function AuthScreen({
  scaledPageStyle,
  card,
  isSignUp,
  setIsSignUp,
  signInWithGoogle,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  authError,
  authBusy,
  signUp,
  signIn,
  bubbleClass,
  bubbleStyle,
  settingsColor,
}: Props) {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-white"
      style={scaledPageStyle()}
    >
      <div className="pointer-events-none fixed left-6 top-6 text-6xl drop-shadow-[0_0_25px_rgba(250,204,21,0.35)]">
        🦅
      </div>

      <div className="pointer-events-none fixed right-6 top-6 text-5xl drop-shadow-[0_0_25px_rgba(255,255,255,0.25)]">
        👨‍👩‍👧‍👦
      </div>

      <div className={`relative z-10 w-full max-w-md rounded-[2rem] p-6 ${card()}`}>
        <h1 className="mb-1 bg-gradient-to-r from-yellow-300 via-white to-yellow-500 bg-clip-text text-center text-5xl font-black italic tracking-tight text-transparent">
          Family Feud
        </h1>

        <p className="mb-6 text-center text-gray-400">
          {isSignUp ? "Create your account" : "Sign in to your account"}
        </p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={authBusy}
          className="mb-4 w-full rounded-2xl bg-white p-4 font-black text-black shadow-lg shadow-black/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with Google
        </button>

        {isSignUp && (
          <input
            className="mb-3 w-full rounded-2xl border border-white/10 bg-zinc-900/90 p-4 text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-zinc-900"
            placeholder="Display name"
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          className="mb-3 w-full rounded-2xl border border-white/10 bg-zinc-900/90 p-4 text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-zinc-900"
          placeholder="Email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="mb-4 w-full rounded-2xl border border-white/10 bg-zinc-900/90 p-4 text-white outline-none transition placeholder:text-white/35 focus:border-white/25 focus:bg-zinc-900"
          placeholder="Password"
          type="password"
          value={password}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          onChange={(e) => setPassword(e.target.value)}
        />

        {authError && (
          <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
            {authError}
          </div>
        )}

        <button
          type="button"
          disabled={authBusy}
          onClick={isSignUp ? signUp : signIn}
          className={`mb-4 w-full rounded-2xl p-4 font-black text-white shadow-lg shadow-black/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${bubbleClass(settingsColor)}`}
          style={bubbleStyle(settingsColor)}
        >
          {authBusy ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
        </button>

        <button
          type="button"
          disabled={authBusy}
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full rounded-2xl p-2 text-gray-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSignUp
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
      </div>
    </main>
  );
}
