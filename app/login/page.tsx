"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand";
import { LiquidGradient } from "@/components/liquid-gradient";
import { GoogleIcon, SolanaIcon } from "@/components/auth-provider-icons";
import {
  mapAuthError,
  signInWithGoogle,
  signInWithSolana,
} from "@/lib/auth/social";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LAUNCHING_SOON_BODY,
  LAUNCHING_SOON_TITLE,
  SIGNUPS_ENABLED,
} from "@/lib/product";
import { MARKETING_ORIGIN, normalizeNextPath } from "@/lib/site";

function homeHref() {
  if (typeof window === "undefined") return "/"
  return window.location.hostname === "app.yieldsync.io" ? MARKETING_ORIGIN : "/"
}

function safeNextPath(raw: string | null | undefined) {
  const host =
    typeof window === "undefined" ? "" : window.location.hostname
  return normalizeNextPath(raw, host)
}

function readAuthErrorFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const search = new URLSearchParams(window.location.search);
  const fromQuery =
    search.get("error_description") ||
    search.get("error_code") ||
    search.get("error");

  const hashRaw = window.location.hash.replace(/^#/, "");
  const hash = new URLSearchParams(
    hashRaw.includes("=") ? hashRaw : hashRaw.replace(/^error/, "error"),
  );
  // Support "#error=access_denied&error_code=signup_disabled&..."
  const fromHash =
    hash.get("error_description") ||
    hash.get("error_code") ||
    (hash.get("error") !== "auth" ? hash.get("error") : null);

  const combined = [fromQuery, fromHash].filter(Boolean).join(" ");
  if (!combined) return null;

  const lower = combined.toLowerCase().replace(/\+/g, " ");
  if (
    lower.includes("signup_disabled") ||
    lower.includes("signups not allowed") ||
    lower.includes("access_denied")
  ) {
    return mapAuthError("signup_disabled");
  }
  if (search.get("error") === "auth" || fromHash) {
    return mapAuthError(decodeURIComponent(combined.replace(/\+/g, " ")));
  }
  return null;
}

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [nextPath, setNextPath] = useState("/");
  const [done, setDone] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "solana" | null>(
    null,
  );

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("next");
    setNextPath(safeNextPath(q));

    const authErr = readAuthErrorFromLocation();
    if (authErr) {
      setError(authErr);
      setMode("signin");
      // Clean ugly OAuth error fragments from the URL
      const next = safeNextPath(q);
      const clean =
        next && next !== "/" && next !== "/dashboard"
          ? `/login?next=${encodeURIComponent(next)}`
          : "/login";
      window.history.replaceState(null, "", clean);
    }

    const syncMode = () => {
      const hash = window.location.hash.replace("#", "");
      const wantsSignup = hash === "signup" || hash.startsWith("signup");
      setMode(wantsSignup ? "signup" : "signin");
      if (!authErr) {
        setError(null);
        setInfo(null);
      }
      setDone(false);
    };
    syncMode();
    window.addEventListener("hashchange", syncMode);
    return () => window.removeEventListener("hashchange", syncMode);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function redirectIfSignedIn() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) setCheckingSession(false);
        return;
      }
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (data.user) {
          const q = new URLSearchParams(window.location.search).get("next");
          router.replace(safeNextPath(q));
          return;
        }
      } catch {
        // ignore — show form
      }
      if (!cancelled) setCheckingSession(false);
    }
    void redirectIfSignedIn();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setDone(false);
    const hash = next === "signup" ? "#signup" : "";
    window.history.replaceState(null, "", `/login${hash}`);
  }

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!SIGNUPS_ENABLED && mode === "signup") {
      setError(mapAuthError("signup_disabled"));
      return;
    }

    if (!isSupabaseConfigured()) {
      setError(
        mode === "signup"
          ? "Sign-up is temporarily unavailable. Please try again later."
          : "Sign-in is temporarily unavailable. Please try again later.",
      );
      return;
    }

    if (mode === "signup" && (!email.trim() || password.length < 6)) {
      setError("Enter a valid email and a password with at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      if (mode === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) {
          setError(mapAuthError(authError.message));
          return;
        }
        router.push(nextPath);
        router.refresh();
        return;
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(mapAuthError(authError.message));
        return;
      }

      if (data.session) {
        router.push(nextPath);
        router.refresh();
        return;
      }

      setDone(true);
      setPassword("");
      setInfo(
        "Account created. Check your inbox to confirm, then sign in — or use Google / Solana instead (no email confirm).",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "signup"
            ? "Sign up failed"
            : "Sign in failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    if (!SIGNUPS_ENABLED && mode === "signup") {
      setError(mapAuthError("signup_disabled"));
      return;
    }
    setSocialLoading("google");
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setSocialLoading(null);
    }
  }

  async function onSolana() {
    setError(null);
    if (!SIGNUPS_ENABLED && mode === "signup") {
      setError(mapAuthError("signup_disabled"));
      return;
    }
    setSocialLoading("solana");
    try {
      await signInWithSolana();
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Solana sign-in failed");
    } finally {
      setSocialLoading(null);
    }
  }

  const isSignup = mode === "signup";
  const signupLocked = !SIGNUPS_ENABLED && isSignup;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — fluid (landing style) */}
      <div className="relative min-h-[200px] overflow-hidden border-b border-border sm:min-h-[240px] lg:min-h-screen lg:border-b-0 lg:border-r">
        <LiquidGradient
          seed={820}
          speed={0.38}
          scale={0.91}
          amplitude={0.23}
          frequency={0.1}
          definition={7}
          bands={3.8}
          amount={0.2}
          grain={0.032}
        />
        <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_40%_40%,rgba(5,5,5,0.05)_0%,rgba(5,5,5,0.45)_100%)] light:bg-[radial-gradient(80%_70%_at_40%_40%,rgba(255,255,255,0.45)_0%,rgba(243,247,244,0.7)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 hidden p-8 lg:block">
          <Link href={homeHref()} className="inline-flex opacity-90 transition-opacity hover:opacity-100">
            <Wordmark />
          </Link>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-foreground/75">
            Track Meteora DLMM wallets, copy smart LP moves, and stay on-chain
            without the noise.
          </p>
        </div>
      </div>

      {/* Right — gray card panel */}
      <div className="flex flex-1 flex-col bg-background-subtle lg:min-h-screen">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-8 lg:hidden">
          <Link href={homeHref()}>
            <Wordmark />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px] border border-border bg-background-elevated">
            {/* Mode tabs — how-it-works style */}
            <div className="grid grid-cols-2 border-b border-border">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={cn(
                  "border-l-2 px-5 py-4 text-left text-[14px] font-semibold transition-colors",
                  !isSignup
                    ? "border-l-primary bg-white/2 text-foreground"
                    : "border-l-transparent text-muted-foreground hover:bg-white/1 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "mb-2 flex size-7 items-center justify-center rounded-md text-[12px] font-semibold",
                    !isSignup
                      ? "bg-primary text-primary-foreground"
                      : "border border-primary/30 bg-primary/12 text-primary",
                  )}
                >
                  01
                </span>
                Sign in
              </button>
              <button
                type="button"
                id="signup"
                onClick={() => switchMode("signup")}
                className={cn(
                  "border-l-2 px-5 py-4 text-left text-[14px] font-semibold transition-colors",
                  isSignup
                    ? "border-l-primary bg-white/2 text-foreground"
                    : "border-l-transparent text-muted-foreground hover:bg-white/1 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "mb-2 flex size-7 items-center justify-center rounded-md text-[12px] font-semibold",
                    isSignup
                      ? "bg-primary text-primary-foreground"
                      : "border border-primary/30 bg-primary/12 text-primary",
                  )}
                >
                  02
                </span>
                {SIGNUPS_ENABLED ? "Get Started" : "Launching soon"}
              </button>
            </div>

            <div className="space-y-6 px-5 py-8 sm:px-8">
              <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground sm:text-[24px]">
                  {signupLocked
                    ? LAUNCHING_SOON_TITLE
                    : isSignup
                      ? "Create your account"
                      : "Welcome back"}
                </h1>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {checkingSession
                    ? "Checking session…"
                    : signupLocked
                      ? LAUNCHING_SOON_BODY
                      : isSignup
                        ? "YieldSync free — 3 wallets forever"
                        : "Sign in to YieldSync"}
                </p>
              </div>

              {checkingSession ? (
                <p className="text-sm text-muted-foreground">
                  Redirecting to dashboard if you are already signed in…
                </p>
              ) : signupLocked ? (
                <div className="space-y-4">
                  <div
                    role="status"
                    className="rounded-none border border-primary/35 bg-primary/10 px-4 py-3 text-sm leading-relaxed text-foreground"
                  >
                    <p className="font-medium text-primary">
                      {LAUNCHING_SOON_TITLE}
                    </p>
                    <p className="mt-1.5 text-muted-foreground">
                      {LAUNCHING_SOON_BODY}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="flex w-full items-center justify-center bg-primary px-4 py-3 text-[14px] font-semibold text-primary-foreground shadow-[var(--glow-button)] transition-transform hover:scale-[1.01]"
                  >
                    Sign in with existing account
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <p
                      role="alert"
                      className={
                        /launching soon|registrations are closed/i.test(error)
                          ? "rounded-none border border-primary/35 bg-primary/10 px-3 py-2 text-sm text-foreground"
                          : "rounded-none border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
                      }
                    >
                      {/launching soon|registrations are closed/i.test(error) ? (
                        <>
                          <span className="font-medium text-primary">
                            {LAUNCHING_SOON_TITLE}.{" "}
                          </span>
                          {error}
                        </>
                      ) : (
                        error
                      )}
                    </p>
                  )}
                  {info && (
                    <p
                      role="status"
                      className="rounded-none border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
                    >
                      {info}
                    </p>
                  )}

                  {!done && (
                    <>
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={onGoogle}
                          disabled={socialLoading !== null}
                          className="flex w-full items-center justify-center gap-3 border border-border bg-white/3 px-4 py-3 text-[14px] text-foreground transition-colors hover:bg-white/6 disabled:opacity-60"
                        >
                          <GoogleIcon className="h-5 w-5" />
                          {socialLoading === "google"
                            ? "Redirecting…"
                            : "Continue with Google"}
                        </button>

                        <button
                          type="button"
                          onClick={onSolana}
                          disabled={socialLoading !== null}
                          className="flex w-full items-center justify-center gap-3 border border-border bg-white/3 px-4 py-3 text-[14px] text-foreground transition-colors hover:bg-white/6 disabled:opacity-60"
                        >
                          <SolanaIcon className="h-5 w-5" />
                          {socialLoading === "solana"
                            ? "Waiting for wallet…"
                            : "Continue with Solana"}
                        </button>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="bg-background-elevated px-2 text-muted-foreground">
                            or continue with email
                          </span>
                        </div>
                      </div>

                      <form
                        className="space-y-4"
                        method="post"
                        onSubmit={onEmailSubmit}
                      >
                        <div>
                          <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                            Email
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            autoComplete="email"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                            Password
                          </label>
                          <input
                            type="password"
                            required
                            minLength={isSignup ? 6 : undefined}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            autoComplete={
                              isSignup ? "new-password" : "current-password"
                            }
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading || socialLoading !== null}
                          className="flex w-full items-center justify-center bg-primary px-4 py-3 text-[14px] font-semibold text-primary-foreground shadow-[var(--glow-button)] transition-transform hover:scale-[1.01] disabled:opacity-60"
                        >
                          {loading
                            ? isSignup
                              ? "Creating…"
                              : "Signing in…"
                            : isSignup
                              ? "Create account"
                              : "Sign in"}
                        </button>
                      </form>
                    </>
                  )}

                  {done && (
                    <button
                      type="button"
                      onClick={() => switchMode("signin")}
                      className="flex w-full items-center justify-center bg-primary px-4 py-3 text-[14px] font-semibold text-primary-foreground"
                    >
                      Go to sign in
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
