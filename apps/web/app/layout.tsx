import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Storyboard — Context windows end. Your project doesn't.",
  description:
    "The AI memory layer. Captures every session, decision, and idea — then seeds any new chat with complete project context.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/*
        No global client-side provider needed here — @supabase/ssr manages
        sessions via cookies and the middleware refreshes them on every request.
        Client components call createClient() directly when they need the
        Supabase client.
      */}
      <body>{children}</body>
    </html>
  );
}
