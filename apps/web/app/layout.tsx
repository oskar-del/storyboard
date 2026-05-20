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
      <body>{children}</body>
    </html>
  );
}
