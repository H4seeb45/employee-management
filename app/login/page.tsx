"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  TrendingUp,
  Users,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { LoginForm } from "@/components/login-form/loginform";
import { useLayout } from "@/components/layout/layout-provider";

function LoginPage() {
  const router = useRouter();
  const { user, userLoading } = useLayout();

  useEffect(() => {
    // Auto-redirect if already logged in
    if (!userLoading && user) {
      const roles = user.roles ?? [];
      const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");
      const isBusinessManager = roles.includes("Business Manager");
      const isCashierOnly =
        roles.includes("Cashier") && !isAdmin && !isBusinessManager;
      router.push(isCashierOnly ? "/dashboard/expenses" : "/dashboard");
    }
  }, [user, userLoading]);

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-slate-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl" />
      </div>

      <div className="relative grid lg:grid-cols-[60%_40%] min-h-screen">
        {/* Left Side: Branding & Value Proposition (60%) */}
        <aside className="hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white relative overflow-hidden">
          {/* Decorative Grid Pattern */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          
          {/* Animated Background Shapes */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
            className="absolute top-20 right-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="absolute bottom-20 left-20 w-96 h-96 bg-slate-500 rounded-full blur-3xl"
          />

          <div className="relative z-10">
            {/* Logo & Brand */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-16">
                <div className="p-2 bg-red-600 rounded-lg">
                  <Shield className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">SADIQ TRADERS</h1>
                  <p className="text-sm text-blue-200">Trading & Distribution</p>
                </div>
              </div>
            </motion.div>

            {/* Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6 max-w-xl"
            >
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
                Streamlining Retail
                <span className="block text-blue-400">Operations</span>
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                Enterprise-grade HRMS platform designed for efficiency, security, and growth in retail distribution.
              </p>

              {/* Feature Pills */}
              <div className="grid grid-cols-1 gap-4 pt-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
                >
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Multi-Role Access</h3>
                    <p className="text-sm text-slate-400">Managers, Cashiers, Admins & Employees</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10"
                >
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Location-Based Control</h3>
                    <p className="text-sm text-slate-400">8 Locations across Lahore, Faisalabad & Sialkot</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Footer Trust Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="relative z-10 flex items-center gap-2 text-sm text-slate-400"
          >
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span>Secure Enterprise Encryption · SOC 2 Compliant</span>
          </motion.div>
        </aside>

        {/* Right Side: Login Form (40%) */}
        <section className="flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <div className="p-2 bg-red-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-slate-900">SADIQ TRADERS</h1>
                <p className="text-xs text-slate-600">Trading & Distribution</p>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 relative overflow-hidden">
              {/* Decorative Background Pattern */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-50 to-transparent rounded-full blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-slate-50 to-transparent rounded-full blur-2xl opacity-50" />
              
              {/* Login Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="relative z-10 flex justify-center mb-6"
              >
                <div className="relative">
                  {/* Outer Ring */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 p-0.5 shadow-lg">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      {/* Inner Icon Container */}
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-inner">
                        <Lock className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </div>
                  {/* Decorative Dots */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-blue-400 rounded-full border-2 border-white shadow-sm" />
                </div>
              </motion.div>

              {/* Header */}
              <div className="mb-8 relative z-10 text-center">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Employee Portal</h2>
                <p className="text-white mt-2 text-sm font-semibold">
                  Enter your credentials to access the HRMS dashboard
                </p>
              </div>

              {/* Form */}
              <LoginForm />

              {/* Trust Signal */}
              <div className="mt-6 pt-6 border-t border-slate-200 relative z-10">
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Authorized Personnel Only · Enterprise Secure</span>
                </div>
              </div>
            </div>

            {/* System Status Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full w-fit mx-auto"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-700">All Systems Operational</span>
            </motion.div>
          </motion.div>

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center text-xs text-slate-500"
          >
            <p>© 2026 Sadiq Traders. All rights reserved.</p>
            <p className="mt-1">Version 2.0.1 · Last updated: Jan 2026</p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
