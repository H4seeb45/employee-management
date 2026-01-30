"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLayout } from "../layout/layout-provider";

export function LoginForm({ className }: { className?: string }) {
  const router = useRouter();
  const { refreshUser } = useLayout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
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

  // Validation
  const emailError = emailTouched && !email ? "Email is required" : 
                     emailTouched && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Invalid email format" : null;
  const passwordError = passwordTouched && !password ? "Password is required" : null;
  const hasValidationErrors = emailError || passwordError;

  if (!mounted) {
    return (
      <div className="relative">
        <div className="space-y-5 animate-pulse">
          <div className="h-14 rounded-lg bg-slate-100" />
          <div className="h-14 rounded-lg bg-slate-100" />
          <div className="h-12 rounded-lg bg-slate-100" />
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (hasValidationErrors) {
      setError("Please fix the errors above.");
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
      // Refresh user context after successful login
      await refreshUser();
      router.replace(getRedirectPath(data?.user?.roles ?? []));
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <Link href="/dashboard" prefetch className="sr-only">
        Prefetch dashboard
      </Link>

      <form
        onSubmit={onSubmit}
        className={cn("space-y-5", className)}
        aria-describedby={error ? "login-error" : undefined}
        aria-busy={loading}
        suppressHydrationWarning
      >
        {/* Email Field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email Address
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Mail className={cn(
                "w-5 h-5 transition-colors",
                emailFocused ? "text-blue-600" : "text-slate-400"
              )} />
            </div>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="you@sadiqtraders.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => {
                setEmailFocused(false);
                setEmailTouched(true);
              }}
              className={cn(
                "pl-11 h-12 text-base transition-all duration-200",
                "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20",
                emailError && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              )}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
            />
          </div>
          <AnimatePresence>
            {emailError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                id="email-error"
                className="text-xs text-red-600 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {emailError}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password Field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </Label>
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Lock className={cn(
                "w-5 h-5 transition-colors",
                passwordFocused ? "text-blue-600" : "text-slate-400"
              )} />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => {
                setPasswordFocused(false);
                setPasswordTouched(true);
              }}
              className={cn(
                "pl-11 pr-11 h-12 text-base transition-all duration-200",
                "border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20",
                passwordError && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              )}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <AnimatePresence>
            {passwordError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                id="password-error"
                className="text-xs text-red-600 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {passwordError}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              id="login-error"
              role="alert"
              className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button
            type="submit"
            className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-200"
            disabled={loading}
            suppressHydrationWarning
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign In to Dashboard"
            )}
          </Button>
        </motion.div>
      </form>
    </div>
  );
}
