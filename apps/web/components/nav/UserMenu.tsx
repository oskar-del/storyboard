"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu({ email }: { email: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="px-3 py-2">
      <p className="text-xs text-muted truncate mb-1" title={email}>
        {email}
      </p>
      <button
        onClick={handleSignOut}
        className="text-xs text-muted2 hover:text-red-400 transition"
      >
        Sign out
      </button>
    </div>
  );
}
