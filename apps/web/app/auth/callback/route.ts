import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * /auth/callback
 *
 * Supabase redirects here after:
 *  - Magic link sign-in
 *  - Email invite acceptance
 *  - OAuth sign-in (Google, GitHub, etc.)
 *  - Password reset
 *
 * The URL contains either:
 *  - ?code=...  (PKCE flow — what magic links and invites use)
 *  - #access_token=...&refresh_token=... (implicit flow — legacy, avoid)
 *
 * We exchange the code for a session, then redirect the user to their
 * intended destination (or /canvas as default).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/canvas"; // where to send the user after login
  const type = searchParams.get("type"); // "invite" | "recovery" | "signup" | null

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] code exchange failed:", error.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }

    if (data.user) {
      // Auto-create a profile row if this is the user's first sign-in.
      // The DB trigger (migration 004) also does this — this is a belt-and-suspenders
      // fallback for environments where the trigger hasn't run yet.
      await ensureProfile(supabase, data.user);
    }

    // For invite/recovery flows, send to /canvas directly regardless of `next`
    if (type === "invite" || type === "recovery") {
      return NextResponse.redirect(`${origin}/canvas`);
    }

    // Validate `next` — only allow relative paths on the same origin
    const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/canvas`;
    return NextResponse.redirect(redirectTo);
  }

  // No code — something went wrong (user tampered with URL, link expired, etc.)
  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}

// ---------------------------------------------------------------------------

async function ensureProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  user: { id: string; email?: string },
) {
  // Check if profile already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existing) return; // already set up

  // Derive a username from email (e.g. "sainath" from "sainath@example.com")
  const emailPrefix = (user.email ?? "user").split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase();
  const username = emailPrefix || `user_${user.id.slice(0, 8)}`;

  // author_key defaults to username — user can change it in Settings
  await supabase.from("profiles").insert({
    id: user.id,
    username,
    author_key: username,
  });
}
