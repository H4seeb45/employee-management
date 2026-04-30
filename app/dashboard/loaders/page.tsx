"use client";

import { useLayout } from "@/components/layout/layout-provider";
import { LoaderModule } from "@/components/loaders/loader-module";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ShieldAlert } from "lucide-react";

export default function LoadersPage() {
  const { user, userLoading } = useLayout();

  if (userLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-slate-400 font-medium text-sm animate-pulse">Initializing module...</p>
      </div>
    );
  }

  const roles = user?.roles ?? [];
  const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");
  const isStorekeeper = roles.includes("Storekeeper");
  const hasAccess = isAdmin || isStorekeeper;

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-[60vh] p-4">
        <Alert variant="destructive" className="max-w-md border-2 rounded-2xl shadow-red-100 bg-red-50">
          <ShieldAlert className="h-6 w-6" />
          <AlertTitle className="text-lg font-bold ml-2">Access Restricted</AlertTitle>
          <AlertDescription className="mt-2 text-red font-medium">
            You do not have the required permissions to access Loaders Management. 
            This module is reserved for <span className="underline decoration-red-300">Administrators</span> and <span className="underline decoration-red-300">Storekeepers</span>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <UsersIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black dark:text-white">Loaders Management</h1>
          </div>
        </div>
      </header>

      <LoaderModule user={user} isAdmin={isAdmin} />
    </div>
  );
}

function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
