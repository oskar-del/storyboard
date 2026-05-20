"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { href: "/canvas", label: "Canvas", icon: "⬡" },
  { href: "/feed",   label: "Feed",   icon: "◈" },
  { href: "/inbox",  label: "Inbox",  icon: "📥" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-surface flex flex-col py-6 px-4 fixed h-full z-20">
        <Link href="/" className="text-lg font-bold mb-8 tracking-tight bg-gradient-to-r from-white to-accent bg-clip-text text-transparent">
          Storyboard
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition",
                pathname.startsWith(item.href)
                  ? "bg-accent/15 text-accent"
                  : "text-muted2 hover:text-white hover:bg-white/5"
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-[var(--border)]">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted2 hover:text-white hover:bg-white/5 transition"
          >
            <span>⚙</span> Settings
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen bg-bg">
        {children}
      </main>
    </div>
  );
}
