"use client";
import { useLayout } from "@/components/layout/layout-provider";
import { getRedirectPath } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { redirect, useRouter } from "next/navigation"
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
    const { user, userLoading } = useLayout();
  
    useEffect(() => {
      // Auto-redirect if already logged in
      if (!userLoading && user) {
        const roles = user.roles ?? [];
        
        router.push(getRedirectPath(roles));
      }
    }, [user, userLoading]);

    if(userLoading)  return <div className="w-full h-full flex items-center justify-center p-12">
                              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
  // redirect("/dashboard")
}
