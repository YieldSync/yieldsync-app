"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy `/signup` → combined auth page at `/login#signup`. */
export default function SignupRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const qs = window.location.search;
    router.replace(`/login${qs}#signup`);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
