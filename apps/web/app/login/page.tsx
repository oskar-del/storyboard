"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/canvas";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState(errorParam ?? "");

  useEffect(() => {
    if (errorParam) setErrorMsg(decodeURIComponent(errorParam));
  }, [errorParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // After clicking the magic link, Supabase will redirect to /auth/callback
        // which exchanges the code and sends the user to `next`.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: false, // only allow existing users — new users must be invited
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-accent bg-clip-text text-transparent">
            Storyboard
          </span>
          <p className="text-sm text-muted2 mt-2">Sign in to your workspace</p>
        </div>

        {status === "sent" ? (
          <div className="bg-surface border border-[var(--border)] rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-lg font-semibold mb-2">Check your email</h2>
            <p className="text-sm text-muted2 leading-relaxed">
              We sent a magic link to <strong className="text-white">{email}</strong>.
              Click it to sign in — no password needed.
            </p>
            <p className="text-xs text-muted mt-4">
              Link expires in 1 hour. Check spam if you don't see it.
            </p>
            <button
              onClick={() => { setStatus("idle"); setEmail(""); }}
              className="mt-6 text-xs text-accent hover:underline"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-surface border border-[var(--border)] rounded-2xl p-8 flex flex-col gap-5"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-bg border border-[var(--border2)] rounded-xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent transition"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending" || !email.trim()}
              className="bg-accent text-white font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>

            <p className="text-xs text-muted text-center leading-relaxed">
              Storyboard is invite-only during beta.
              <br />
              No account? Ask for an invite.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
