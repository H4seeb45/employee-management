import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isLocalHost() {
  return typeof window !== 'undefined' 
  ? window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  : process.env.NODE_ENV === 'development';
};

export const getRedirectPath = (roles: string[] = []) => {
    const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");
    const isBusinessManager = roles.includes("Business Manager");
    const isDataManager = roles.includes("Data Manager");
    const isCashierOnly =
      roles.includes("Cashier") && !isAdmin && !isBusinessManager;
    const employeeOnly = roles.includes("Employee") && !isAdmin && !isBusinessManager;
    let path;

    if(isCashierOnly) path = "/dashboard/expenses";
    if(employeeOnly) path = "/dashboard/advances";
    if(isDataManager) path = "/dashboard/employees";
    return path || "/dashboard";
};