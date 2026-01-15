"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/login-form/loginform";

function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect if already logged in
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          const roles: string[] = data?.user?.roles ?? [];
          const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");
          const isBusinessManager = roles.includes("Business Manager");
          const isCashierOnly =
            roles.includes("Cashier") && !isAdmin && !isBusinessManager;
          router.push(isCashierOnly ? "/dashboard/expenses" : "/dashboard");
        }
      } catch {
        // ignore errors and stay on login
      }
    };
    checkSession();
  }, [router]);

  return (
    <main className="relative isolate min-h-dvh grid grid-cols-1 md:grid-cols-2">
      {/* Left: Form Section */}
      <section className="flex items-center justify-center p-6 md:p-8">
        <Card className="w-full max-w-md shadow-sm bg-white/80 backdrop-blur-sm border-white/40 dark:bg-black/40 dark:border-white/20">
          <CardHeader className="space-y-2">
            <CardTitle className="text-pretty">Saadiq Traders HMS</CardTitle>
            <CardDescription className="text-pretty">
              Admin Dashboard — Sign in to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <p className="mt-4 text-xs text-muted-foreground">
              Use the credentials provided by your administrator.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Right: Full Image Section */}
      <aside className="relative hidden md:block">
        <Image
          src="https://img.freepik.com/premium-vector/business-meeting-with-presentation-analysis_123891-123280.jpg?w=1480"
          alt="Event management system hero"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark overlay for contrast */}
        <div
          className="absolute inset-0 z-10 bg-black/40 dark:bg-black/50"
          aria-hidden="true"
        />
        {/* Overlay content */}
        <div className="absolute inset-0 z-20 p-8 md:p-10 flex items-center justify-center">
          <div className="max-w-md text-white/95 drop-shadow-sm text-center">
            <h2 className="text-balance text-3xl md:text-4xl font-semibold tracking-tight">
              Saadiq Traders
            </h2>
            <p className="text-pretty mt-2 text-base md:text-lg font-medium">
              HR & Employee Management System
            </p>
            <span
              className="inline-block mt-4 rounded-full bg-white/10 px-3 py-1 text-sm font-medium ring-1 ring-white/25"
              aria-label="Admin Dashboard Login"
            >
              Admin Dashboard Login
            </span>
          </div>
        </div>
      </aside>
    </main>
  );
}

export default LoginPage;
