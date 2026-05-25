import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "@/components/nav/UserMenu";

const navItems = [
  { href: "/canvas", label: "Canvas",   icon: "⬡" },
  { href: "/feed",   label: "Feed",     icon: "◈" },
  { href: "/inbox",  label: "Inbox",    icon: "📥" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check — belt-and-suspenders on top of middleware.
  // getUser() makes a network call to Supabase to validate the JWT,
  // so it can't be spoofed by a tampered cookie.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-surface flex flex-col py-6 px-4 fixed h-full z-20">
        <Link
          href="/"
          className="text-lg font-bold mb-8 tracking-tight bg-gradient-to-r from-white to-accent bg-clip-text text-transparent"
        >
          Storyboard
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-[var(--border)] flex flex-col gap-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted2 hover:text-white hover:bg-white/5 transition"
          >
            <span>⚙</span> Settings
          </Link>
          {/* User email + sign-out */}
          <UserMenu email={user.email ?? ""} />
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1 min-h-screen bg-bg">{children}</main>
    </div>
  );
}

// Active-link highlight is client-side, so isolate it
function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted2 hover:text-white hover:bg-white/5 transition"
    >
      <span>{icon}</span>
      {children}
    </Link>
  );
}
