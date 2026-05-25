"use client";

import Link from "next/link";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Badge */}
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          AI Memory Layer · Beta
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 max-w-4xl">
        Context windows end.
        <br />
        <em className="not-italic bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
          Your project doesn't.
        </em>
      </h1>

      {/* Sub */}
      <p className="text-lg md:text-xl text-muted2 max-w-xl mb-10 leading-relaxed">
        Storyboard captures every AI session, decision, and idea — then seeds
        any new chat with complete project context. One click. Zero re-explaining.
      </p>

      {/* CTAs */}
      <div className="flex gap-4 flex-wrap justify-center mb-14">
        <Link
          href="/login"
          className="bg-accent text-white font-bold px-8 py-4 rounded-xl text-base hover:opacity-90 transition shadow-[0_0_40px_rgba(124,107,255,0.35)]"
        >
          Sign in
        </Link>
        <a
          href="#waitlist"
          className="bg-surface2 border border-[var(--border2)] text-white font-semibold px-8 py-4 rounded-xl text-base hover:border-white/25 transition"
        >
          Request access
        </a>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 mb-16 text-sm text-muted2">
        {[
          "🧠 Captures every session automatically",
          "🎯 Seeds new chats with full context",
          "🔗 Works with Claude, Cursor & more",
          "🤝 Shared project memory for teams",
        ].map((f) => (
          <span
            key={f}
            className="bg-surface border border-[var(--border)] px-4 py-2 rounded-full text-xs"
          >
            {f}
          </span>
        ))}
      </div>

      {/* Waitlist section */}
      <section id="waitlist" className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2">Get early access</h2>
        <p className="text-sm text-muted2 mb-6">
          Storyboard is invite-only during beta. Drop your email and we'll reach
          out when a spot opens up.
        </p>
        <WaitlistForm />
      </section>
    </main>
  );
}

// ── Waitlist form ─────────────────────────────────────────────────────────────

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_URL}/api/v1/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source: "landing" }),
      });

      const json = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Something went wrong");
      } else {
        setStatus("done");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error — please try again");
    }
  }

  if (status === "done") {
    return (
      <div className="bg-surface border border-[var(--border)] rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-lg font-semibold mb-2">You're on the list!</h3>
        <p className="text-sm text-muted2">
          We'll email you at <strong className="text-white">{email}</strong> when
          your spot is ready.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1 bg-surface border border-[var(--border2)] rounded-xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent transition"
      />
      <button
        type="submit"
        disabled={status === "submitting" || !email.trim()}
        className="bg-accent text-white font-semibold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50 whitespace-nowrap"
      >
        {status === "submitting" ? "Joining…" : "Request access"}
      </button>

      {errorMsg && (
        <p className="text-xs text-red-400 mt-2 text-left">{errorMsg}</p>
      )}
    </form>
  );
}
