"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// Define types for our data
export type Employee = {
  id: string;
  employeeName: string;
  employeeId: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  status: string;
  avatar: string;
  [key: string]: any; // Allow additional properties
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
};

export type Attendance = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  checkInStatus: string;
  checkOutStatus: string;
  workingHours: string;
  status: string;
};

export type UserSession = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  locationId: string | null;
  location?: {
    id: string;
    name: string;
    city: string;
  } | null;
};

// Define the context type
type LayoutContextType = {
  // User session
  user: UserSession | null;
  userLoading: boolean;
  refreshUser: () => Promise<void>;
  clearUser: () => void;

  employees: Employee[];
  addEmployee: (employee: Employee) => Promise<void>;
  updateEmployee: (employee: Employee) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  leaveRequests: LeaveRequest[];
  addLeaveRequest: (request: LeaveRequest) => Promise<void>;
  updateLeaveRequest: (request: LeaveRequest) => Promise<void>;
  deleteLeaveRequest: (id: string) => Promise<void>;

  attendance: Attendance[];
  addAttendance: (record: Attendance) => Promise<void>;
  updateAttendance: (record: Attendance) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;

  setAttendance: (records: Attendance[]) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
};

// Create the context
const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// Create a provider component
export function LayoutProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // User session state
  const [user, setUser] = useState<UserSession | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Initialize state as empty — we'll fetch from the API on mount
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  // Initialize sidebar state based on screen size
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Initialize dark mode from localStorage or system preference
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("darkMode");
      if (savedMode !== null) {
        return savedMode === "true";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Fetch user session
  const fetchUser = async () => {
    try {
      setUserLoading(true);
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const {user} = await response.json();
        setUser({
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles || [],
          locationId: user.locationId || null,
          location: user.location || null,
        });
      } else {
        setUser(null);
        router.replace("/login");
      }
    } catch (err) {
      console.error("Failed to load user session", err);
      setUser(null);
    } finally {
      setUserLoading(false);
    }
  };

  // Clear user session (for logout)
  const clearUser = () => {
    setUser(null);
    setUserLoading(false);
  };

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, []);

  // Fetch initial data from the API on mount
  useEffect(() => {
    async function load() {
      try {
        const [empRes, projRes, attRes, leaveRes] = await Promise.all([
          fetch("/api/employees").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/projects").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/attendance").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/leave-requests").then((r) => (r.ok ? r.json() : [])),
        ]);

        setEmployees(Array.isArray(empRes) ? empRes : []);
        setAttendance(Array.isArray(attRes) ? attRes : []);
        setLeaveRequests(Array.isArray(leaveRes) ? leaveRes : []);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    }

    // load();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("darkMode", darkMode.toString());
    }
  }, [darkMode]);

  // CRUD operations for employees
  const addEmployee = async (employee: Employee) => {
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee),
      });
      const created = await res.json();
      setEmployees((prev) => [...prev, created]);
    } catch (err) {
      console.error("Failed to add employee", err);
    }
  };

  const updateEmployee = async (employee: Employee) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee),
      });
      const updated = await res.json();
      setEmployees((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
    } catch (err) {
      console.error("Failed to update employee", err);
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await fetch(`/api/employees/${id}`, { method: "DELETE" });
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete employee", err);
    }
  };

  // CRUD operations for leave requests
  const addLeaveRequest = async (request: LeaveRequest) => {
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const created = await res.json();
      setLeaveRequests((prev) => [...prev, created]);
    } catch (err) {
      console.error("Failed to add leave request", err);
    }
  };

  const updateLeaveRequest = async (request: LeaveRequest) => {
    try {
      const res = await fetch(`/api/leave-requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const updated = await res.json();
      setLeaveRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (err) {
      console.error("Failed to update leave request", err);
    }
  };

  const deleteLeaveRequest = async (id: string) => {
    try {
      await fetch(`/api/leave-requests/${id}`, { method: "DELETE" });
      setLeaveRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete leave request", err);
    }
  };

  // CRUD operations for attendance
  const addAttendance = async (record: Attendance) => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      const created = await res.json();
      setAttendance((prev) => [...prev, created]);
    } catch (err) {
      console.error("Failed to add attendance record", err);
    }
  };

  const updateAttendance = async (record: Attendance) => {
    try {
      const res = await fetch(`/api/attendance/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      const updated = await res.json();
      setAttendance((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
    } catch (err) {
      console.error("Failed to update attendance record", err);
    }
  };

  const deleteAttendance = async (id: string) => {
    try {
      await fetch(`/api/attendance/${id}`, { method: "DELETE" });
      setAttendance((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete attendance record", err);
    }
  };

  return (
    <LayoutContext.Provider
      value={{
        user:user,
        userLoading,
        refreshUser: fetchUser,
        clearUser,

        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,

        leaveRequests,
        addLeaveRequest,
        updateLeaveRequest,
        deleteLeaveRequest,

        attendance,
        addAttendance,
        updateAttendance,
        deleteAttendance,
        setAttendance,

        sidebarOpen,
        setSidebarOpen,

        darkMode,
        setDarkMode,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

// Create a custom hook to use the context
export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
