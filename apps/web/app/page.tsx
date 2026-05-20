import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 text-accent text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          AI Memory Layer
        </span>
      </div>

      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">
        Context windows end.
        <br />
        <em className="not-italic bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
          Your project doesn't.
        </em>
      </h1>

      <p className="text-lg md:text-xl text-muted2 max-w-xl mb-10 leading-relaxed">
        Storyboard captures every AI session, decision, and idea — then seeds
        any new chat with complete project context. One click. Zero re-explaining.
      </p>

      <div className="flex gap-4 flex-wrap justify-center mb-8">
        <Link
          href="/canvas"
          className="bg-accent text-white font-bold px-8 py-4 rounded-xl text-base hover:opacity-90 transition shadow-[0_0_40px_rgba(124,107,255,0.35)]"
        >
          Open Dashboard
        </Link>
        <Link
          href="#install"
          className="bg-surface2 border border-[var(--border2)] text-white font-semibold px-8 py-4 rounded-xl text-base hover:border-white/25 transition"
        >
          Install MCP
        </Link>
      </div>

      <p className="text-xs text-muted">Free during beta · No credit card required</p>
    </main>
  );
}
