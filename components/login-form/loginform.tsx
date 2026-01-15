"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function LoginForm({ className }: { className?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const getRedirectPath = (roles: string[] = []) => {
    const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");
    const isBusinessManager = roles.includes("Business Manager");
    const isCashierOnly =
      roles.includes("Cashier") && !isAdmin && !isBusinessManager;
    return isCashierOnly ? "/dashboard/expenses" : "/dashboard";
  };

  if (!mounted) {
    return (
      <div className="relative">
        <div className="space-y-4 animate-pulse">
          <div className="h-6 w-20 rounded bg-muted" />
          <div className="h-9 rounded bg-muted" />
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="h-9 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.message || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }
      router.replace(getRedirectPath(data?.user?.roles ?? []));
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false); // stop loading on error
    }
  }

  return (
    <div className="relative">
      <Link href="/dashboard" prefetch className="sr-only">
        Prefetch dashboard
      </Link>

      <form
        onSubmit={onSubmit}
        className={cn("space-y-4", className)}
        aria-describedby={error ? "login-error" : undefined}
        aria-busy={loading}
        suppressHydrationWarning
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="flex items-center gap-2">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 bg-transparent"
              onClick={() => setShowPassword((s) => !s)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              suppressHydrationWarning
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        {error ? (
          <div
            id="login-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
          suppressHydrationWarning
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Signing in…
            </span>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </div>
  );
}
