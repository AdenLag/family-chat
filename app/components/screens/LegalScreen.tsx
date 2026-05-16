"use client";

type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

export default function LegalScreen({ onAccept, onDecline }: Props) {
  return (
    <main className="min-h-screen bg-black p-5 text-white">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-xl">
        <h1 className="mb-2 text-4xl font-black">Terms & Privacy</h1>
        <p className="mb-4 text-sm font-semibold text-white/60">
          You must read and accept before using Family Feud.
        </p>

        <div className="mb-5 h-[58vh] overflow-y-auto rounded-3xl border border-white/10 bg-black/60 p-5 text-sm leading-7 text-white/80">
          <h2 className="mb-3 text-2xl font-black text-white">Family Feud Terms of Use</h2>

          <p>
            Family Feud is a private family and social messaging app for chats, group conversations, direct messages, stories, photos, videos, files, and family spaces.
            By using the app, you agree to follow these rules.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">1. Your Responsibility</h3>
          <p>
            You are fully responsible for anything you send, post, upload, share, write, record, or store in the app.
            This includes messages, photos, videos, stories, files, profile pictures, names, captions, and comments.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">2. No Illegal or Harmful Content</h3>
          <p>
            You may not use Family Feud to post or share illegal, abusive, threatening, hateful, violent, explicit, unsafe, harassing, harmful, copyrighted, stolen, or misleading content.
            You may not impersonate others, scam people, stalk, threaten, bully, exploit, or encourage dangerous activity.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">3. Photos, Videos, Files, and Stories</h3>
          <p>
            You must only upload content you own or have permission to share.
            Stories may disappear after 24 hours, but other users may screenshot, record, copy, download, or save content.
            Do not upload private or sensitive content unless you accept that risk.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">4. Family Spaces and Admins</h3>
          <p>
            Family admins can manage family spaces, invite links, family members, chats, roles, settings, and some customization.
            Admins are responsible for managing their own family spaces and invite links.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">5. Privacy Notice</h3>
          <p>
            The app may collect and store your email address, display name, profile photo, family memberships, messages, stories, uploads, read receipts, typing status, settings, and app preferences.
            This data is used so the app can work.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">6. Cloud Services</h3>
          <p>
            Family Feud may use services such as Supabase, Vercel, Google sign-in, and other hosting or storage services.
            Your information may be processed by those services to provide login, storage, messaging, and app functionality.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">7. No Guarantee</h3>
          <p>
            The app is provided as-is and as-available. There is no guarantee the app will always work, be error-free, be secure, preserve all data, or prevent screenshots, copying, misuse, or unauthorized sharing by other users.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">8. User Disputes</h3>
          <p>
            The app owner is not responsible for disputes, arguments, content, messages, files, posts, or actions between users.
            Users and family admins are responsible for their own behavior and spaces.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">9. Account Removal</h3>
          <p>
            You may stop using the app at any time. Some information may remain in backups, logs, messages sent to others, screenshots, or records needed for security and operation.
          </p>

          <br />

          <h3 className="text-lg font-black text-white">10. Agreement</h3>
          <p>
            If you do not agree, tap Decline and you will be signed out. By tapping I Read and Agree, you confirm that you have read, understand, and agree to these Terms and Privacy Notice.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onDecline}
            className="rounded-2xl bg-zinc-800 p-4 font-black text-white"
          >
            Decline
          </button>

          <button
            onClick={onAccept}
            className="rounded-2xl bg-blue-700 p-4 font-black text-white"
          >
            I Read and Agree
          </button>
        </div>
      </div>
    </main>
  );
}

