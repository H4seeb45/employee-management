"use client";

import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Download,
  Users,
  Activity,
  Briefcase,
  Building2,
  Loader2,
  FileUp,
  Key,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddEmployeeForm } from "@/components/employees/add-employee-form";
import { EditEmployeeForm } from "@/components/employees/edit-employee-form";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ViewEmployeeDetails } from "@/components/employees/view-employee-details";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { DEPARTMENTS, EMPLOYMENT_STATUSES } from "@/lib/constants";

export default function EmployeeDirectory() {
  const { toast } = useToast();

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({
    department: "all",
    status: "all",
  });
  const [locationId, setLocationId] = useState<string>("all");
  const [locations, setLocations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [eligibilityImportDialogOpen, setEligibilityImportDialogOpen] =
    useState(false);
  const [credentialsDialog, setCredentialsDialog] = useState<{
    open: boolean;
    email?: string;
    password?: string;
    message?: string;
  }>({ open: false });
  const [importing, setImporting] = useState(false);
  const [eligibilityImporting, setEligibilityImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eligibilityFileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const init = async () => {
      try {
        const [userRes, locRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/locations"),
        ]);
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);
        }
        if (locRes.ok) {
          const locData = await locRes.json();
          setLocations(locData.locations || []);
        }
      } catch (e) {}
    };
    init();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [locationId]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const url = `/api/employees?locationId=${locationId}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Selected employee for operations
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const getDepartmentColor = (department: string) => {
    const dept = department?.toUpperCase();
    switch (dept) {
      case "FINANCE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "HR":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "SALES":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "MANAGEMENT":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "OPERATIONS":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    if (status?.startsWith("Active"))
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (status?.startsWith("Inactive"))
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const getEmployeeName = (employee: any) =>
    employee?.employeeName || "Employee";

  const filteredData = employees.filter((employee: any) => {
    const matchesSearch =
      employee.employeeName?.toLowerCase().includes(searchText.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchText.toLowerCase()) ||
      employee.employeeId?.toLowerCase().includes(searchText.toLowerCase());

    const matchesDepartment =
      filters.department === "all" ||
      employee.department === filters.department;
    const matchesStatus =
      filters.status === "all" || employee.status === filters.status;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const getReliableAvatarUrl = (employee: any) => {
    if (employee.avatar) return employee.avatar;
    const idNumber = parseInt(employee.employeeId?.replace(/\D/g, "") || "1");
    const gender = idNumber % 2 === 0 ? "women" : "men";
    return `https://randomuser.me/api/portraits/${gender}/${(idNumber % 30) + 1}.jpg`;
  };

  const handleAddEmployee = async (employee: any) => {
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Employee Added",
          description: `${employee.employeeName} has been added.`,
        });
        setAddDialogOpen(false);
        fetchEmployees();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
    }
  };

  const handleEditEmployee = async (employee: any) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employee),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Employee Updated",
          description: `${employee.employeeName}'s info updated.`,
        });
        setEditDialogOpen(false);
        fetchEmployees();
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmployee = async () => {
    if (selectedEmployee) {
      try {
        const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast({
            title: "Employee Inactivated",
            description: `${getEmployeeName(selectedEmployee)} is now inactive.`,
          });
          setDeleteDialogOpen(false);
          fetchEmployees();
        } else {
          const data = await res.json();
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete employee",
          variant: "destructive",
        });
      }
    }
  };

  const openViewDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setViewDialogOpen(true);
  };

  const openEditDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const handleGenerateCredentials = async (employee: any) => {
    try {
      const res = await fetch(`/api/employees/${employee.id}/credentials`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCredentialsDialog({
          open: true,
          email: data.email,
          password: data.password,
          message: "Credentials successfully generated.",
        });
        fetchEmployees();
      } else {
        toast({
          title: "Generation Error",
          description: data.message || "Failed to generate credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Employee Name",
      "CNIC Number",
      "CNIC Issue Date (YYYY-MM-DD)",
      "CNIC Expiry Date (YYYY-MM-DD)",
      "Mobile Number",
      "Father's Name",
      "Emergency Contact Name",
      "Emergency Contact Number",
      "Date of Birth (YYYY-MM-DD)",
      "Blood Group",
      "Marital Status",
      "Gender",
      "Email Address",
      "Professional Reference Name",
      "Reference Email Address",
      "Reference Contact",
      "Address",
      "Location ID",
      "Employee ID",
      "Department",
      "Designation",
      "Employment Status",
      "Date of Joining (YYYY-MM-DD)",
      "Date of Leaving (YYYY-MM-DD)",
      "Probation & Confirmation Date",
      "Basic Salary",
      "Attendance Allowance",
      "Daily Allowance",
      "Fuel Allowance",
      "Conveyance Allowance",
      "Maintainence",
      "Comission",
      "Each KPI Incentives",
      "Incentives",
      "Category Incentive",
      "Bank Name",
      "Account #",
      "Tax Deduction (Yes/No)",
      "EOBI Deduction (Yes/No)",
      "Social Security Deduction (Yes/No)",
      "Route Name",
    ];

    const formatDate = (date: any) => {
      if (!date) return "";
      try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return "";
        return format(d, "yyyy-MM-dd");
      } catch (e) {
        return "";
      }
    };

    const data = filteredData.map((employee: any) => [
      employee.employeeName || "",
      employee.cnicNumber || "",
      formatDate(employee.cnicIssueDate),
      formatDate(employee.cnicExpiryDate),
      employee.phone || "",
      employee.fatherName || "",
      employee.emergencyContactName || "",
      employee.emergencyContactNumber || "",
      formatDate(employee.birthDate),
      employee.bloodGroup || "",
      employee.maritalStatus || "",
      employee.gender || "",
      employee.email || "",
      employee.referenceName || "",
      employee.referenceEmail || "",
      employee.referenceNumber || "",
      employee.address || "",
      employee.locationId || "",
      employee.employeeId || "",
      employee.department || "",
      employee.position || "",
      employee.status || "",
      formatDate(employee.joinDate),
      formatDate(employee.leaveDate),
      formatDate(employee.probationConfirmationDate),
      employee.basicSalary || 0,
      employee.attendanceAllowance || 0,
      employee.dailyAllowance || 0,
      employee.fuelAllowance || 0,
      employee.conveyanceAllowance || 0,
      employee.maintainence || 0,
      employee.comission || 0,
      employee.eachKpiIncentives || 0,
      employee.incentives || 0,
      employee.categoryIncentive || 0,
      employee.bankName || "",
      employee.accountNumber || "",
      employee.taxDeduction || "No",
      employee.eobiDeduction || "No",
      employee.socialSecurityDeduction || "No",
      employee.routeName || "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employees.csv");

    toast({
      title: "Export Successful",
      description: `${filteredData.length} records exported.`,
    });
  };

  const handleDownloadTemplate = async () => {
    const headers = [
      "Employee Name",
      "CNIC Number",
      "CNIC Issue Date (YYYY-MM-DD)",
      "CNIC Expiry Date (YYYY-MM-DD)",
      "Mobile Number",
      "Father's Name",
      "Emergency Contact Name",
      "Emergency Contact Number",
      "Date of Birth (YYYY-MM-DD)",
      "Blood Group",
      "Marital Status",
      "Gender",
      "Email Address",
      "Professional Reference Name",
      "Reference Email Address",
      "Reference Contact",
      "Address",
      "Location ID",
      "Employee ID",
      "Department",
      "Designation",
      "Employment Status",
      "Date of Joining (YYYY-MM-DD)",
      "Date of Leaving (YYYY-MM-DD)",
      "Probation & Confirmation Date",
      "Basic Salary",
      "Attendance Allowance",
      "Daily Allowance",
      "Fuel Allowance",
      "Conveyance Allowance",
      "Maintainence",
      "Comission",
      "Each KPI Incentives",
      "Incentives",
      "Category Incentive",
      "Bank Name",
      "Account #",
      "Tax Deduction (Yes/No)",
      "EOBI Deduction (Yes/No)",
      "Social Security Deduction (Yes/No)",
      "Route Name",
    ];

    const exampleRow = [
      "John Doe",
      "1234567890123",
      "2020-01-01",
      "2030-01-01",
      "03001234567",
      "Richard Doe",
      "Jane Doe",
      "03007654321",
      "1990-05-15",
      "O+",
      "Married",
      "Male",
      "john@example.com",
      "Manager Name",
      "manager@example.com",
      "03111234567",
      "123 Main St, City",
      "(Fill with Location ID from reference)",
      "EMP-001",
      "HR",
      "HR Manager",
      "Active:Working",
      "2024-01-01",
      "",
      "",
      "50000",
      "5000",
      "2000",
      "3000",
      "4000",
      "1000",
      "0",
      "0",
      "0",
      "0",
      "Meezan Bank",
      "123456789",
      "Yes",
      "No",
      "No",
      "Route 01",
    ];

    const wsData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees Template");

    try {
      const res = await fetch("/api/locations");
      const locData = await res.json();
      if (locData.locations) {
        const locHeaders = ["Location ID", "Location Name", "City"];
        const locRows = locData.locations.map((l: any) => [
          l.id,
          l.name,
          l.city,
        ]);
        const wsLoc = XLSX.utils.aoa_to_sheet([locHeaders, ...locRows]);
        XLSX.utils.book_append_sheet(wb, wsLoc, "Locations Reference");
      }
    } catch (e) {}

    XLSX.writeFile(wb, "Employee_Import_Template.xlsx");
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
        }) as any[];

        if (jsonData.length === 0) {
          toast({
            title: "Error",
            description: "The template is empty.",
            variant: "destructive",
          });
          setImporting(false);
          return;
        }

        const parseDate = (val: any) => {
          if (!val) return null;

          if (
            typeof val === "number" ||
            (!isNaN(Number(val)) && String(val).trim() !== "")
          ) {
            const num = Number(val);
            if (num > 10000 && num < 100000) {
              const excelDate = new Date(
                Math.round((num - 25569) * 86400 * 1000),
              );
              return isNaN(excelDate.getTime())
                ? null
                : excelDate.toISOString();
            }
          }

          const strVal = String(val).trim();
          let d = new Date(strVal);
          if (!isNaN(d.getTime())) return d.toISOString();

          // Try parsing DD-MM-YYYY or DD/MM/YYYY
          const parts = strVal.split(/[-/.]/);
          if (parts.length === 3) {
            d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            if (!isNaN(d.getTime())) return d.toISOString();
          }

          return null;
        };

        const findKey = (row: any, searchStr: string) => {
          const key = Object.keys(row).find((k) =>
            k.toLowerCase().includes(searchStr.toLowerCase().trim()),
          );
          return key ? row[key] : null;
        };

        console.log(jsonData[0]["CNIC Issue Date (YYYY-MM-DD)"]);
        const mappedData = jsonData.map((row) => ({
          employeeName: String(row["Employee Name"] || ""),
          cnicNumber: String(row["CNIC Number"] || "").replace(/\D/g, ""),
          cnicIssueDate: parseDate(
            findKey(row, "cnic issue") || row["CNIC Issue Date (YYYY-MM-DD)"],
          ),
          cnicExpiryDate: parseDate(
            findKey(row, "cnic expiry") || row["CNIC Expiry Date (YYYY-MM-DD)"],
          ),
          phone: String(row["Mobile Number"] || "").replace(/\D/g, ""),
          fatherName: String(row["Father's Name"] || ""),
          emergencyContactName: String(row["Emergency Contact Name"] || ""),
          emergencyContactNumber: String(
            row["Emergency Contact Number"] || "",
          ).replace(/\D/g, ""),
          birthDate: parseDate(
            findKey(row, "birth") || row["Date of Birth (YYYY-MM-DD)"],
          ),
          bloodGroup: String(row["Blood Group"] || ""),
          maritalStatus: String(row["Marital Status"] || ""),
          gender: String(row["Gender"] || ""),
          email: String(row["Email Address"] || ""),
          referenceName: String(row["Professional Reference Name"] || ""),
          referenceEmail: String(row["Reference Email Address"] || ""),
          referenceNumber: String(row["Reference Contact"] || "").replace(
            /\D/g,
            "",
          ),
          address: String(row["Address"] || ""),

          locationId: String(row["Location ID"] || ""),
          employeeId: String(row["Employee ID"] || ""),
          department: String(row["Department"] || ""),
          position: String(row["Designation"] || ""),
          status: String(row["Employment Status"] || "Active:Working"),
          joinDate: parseDate(
            findKey(row, "joining") || row["Date of Joining (YYYY-MM-DD)"],
          ),
          leaveDate: parseDate(
            findKey(row, "leaving") || row["Date of Leaving (YYYY-MM-DD)"],
          ),
          probationConfirmationDate: parseDate(
            findKey(row, "probation") || row["Probation & Confirmation Date"],
          ),

          basicSalary: parseFloat(String(row["Basic Salary"])) || 0,
          attendanceAllowance:
            parseFloat(String(row["Attendance Allowance"])) || 0,
          dailyAllowance: parseFloat(String(row["Daily Allowance"])) || 0,
          fuelAllowance: parseFloat(String(row["Fuel Allowance"])) || 0,
          conveyanceAllowance:
            parseFloat(String(row["Conveyance Allowance"])) || 0,
          maintainence: parseFloat(String(row["Maintainence"])) || 0,
          comission: parseFloat(String(row["Comission"])) || 0,
          eachKpiIncentives:
            parseFloat(String(row["Each KPI Incentives"])) || 0,
          incentives: parseFloat(String(row["Incentives"])) || 0,
          categoryIncentive: parseFloat(String(row["Category Incentive"])) || 0,
          bankName: String(row["Bank Name"] || ""),
          accountNumber: String(row["Account #"] || ""),
          routeName: String(row["Route Name"] || ""),
          taxDeduction: String(row["Tax Deduction (Yes/No)"] || "No"),
          eobiDeduction: String(row["EOBI Deduction (Yes/No)"] || "No"),
          socialSecurityDeduction: String(
            row["Social Security Deduction (Yes/No)"] || "No",
          ),
        }));

        const res = await fetch("/api/employees/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employees: mappedData,
            defaultLocationId: locationId,
          }),
        });

        const result = await res.json();
        if (res.ok && result.success) {
          toast({
            title: "Import Complete",
            description: `Successfully imported ${result.count} employees. ${result.errors?.length ? `Failed: ${result.errors.length}.` : ""}`,
          });
          setImportDialogOpen(false);
          fetchEmployees();
          if (result.errors?.length > 0) {
            console.error("Import Errors:", result.errors);
            toast({
              title: "Some Imports Failed",
              description: "Check browser console for error details.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Import Error",
            description: result.message || "Failed to import employees.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse the Excel file.",
          variant: "destructive",
        });
      } finally {
        setImporting(false);
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadEligibilityTemplate = () => {
    const headers = [
      "Employee ID",
      "Advance Eligibility Amount",
      "Loan Eligibility Amount",
    ];
    const exampleRow = ["EMP-001", "50000", "500000"];

    const wsData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Eligibility Template");
    XLSX.writeFile(wb, "Employee_Eligibility_Template.xlsx");
  };

  const handleEligibilityFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEligibilityImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
        }) as any[];

        if (jsonData.length === 0) {
          toast({
            title: "Error",
            description: "The template is empty.",
            variant: "destructive",
          });
          setEligibilityImporting(false);
          return;
        }

        const mappedData = jsonData.map((row) => ({
          employeeId: String(row["Employee ID"] || "").trim(),
          advanceAmount:
            parseFloat(String(row["Advance Eligibility Amount"] || "0")) || 0,
          loanAmount:
            parseFloat(String(row["Loan Eligibility Amount"] || "0")) || 0,
        }));

        const res = await fetch("/api/employees/bulk-eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: mappedData }),
        });

        const result = await res.json();
        if (res.ok && result.success) {
          toast({
            title: "Import Complete",
            description: `Successfully updated ${result.count} eligibility records. ${result.errors?.length ? `Failed: ${result.errors.length}.` : ""}`,
          });
          setEligibilityImportDialogOpen(false);
          fetchEmployees();
          if (result.errors?.length > 0) {
            console.error("Eligibility Import Errors:", result.errors);
            toast({
              title: "Some Imports Failed",
              description: "Check browser console for error details.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Import Error",
            description: result.message || "Failed to update eligibility.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse the Excel file.",
          variant: "destructive",
        });
      } finally {
        setEligibilityImporting(false);
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const totalEmployees = employees.length;
  const totalShown = filteredData.length;
  const activeCount = filteredData.filter((e: any) =>
    e.status?.startsWith("Active"),
  ).length;
  const inactiveCount = filteredData.filter((e: any) =>
    e.status?.startsWith("Inactive"),
  ).length;
  const departmentCount = new Set(filteredData.map((e: any) => e.department))
    .size;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-600 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">
                Employees (Shown / Total)
              </CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A192F] dark:text-white">
                {mounted ? totalShown : ""}{" "}
                <span className="text-slate-400 text-lg font-normal">
                  / {mounted ? totalEmployees : ""}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Based on current search
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">
                Active
              </CardTitle>
              <Activity className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A192F] dark:text-white">
                {mounted ? activeCount : ""}
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">
                Inactive
              </CardTitle>
              <Briefcase className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A192F] dark:text-white">
                {mounted ? inactiveCount : ""}
              </div>
              <p className="text-xs text-amber-600 font-medium mt-1">
                Terminated / Resigned
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">
                Departments
              </CardTitle>
              <Building2 className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A192F] dark:text-white">
                {mounted ? departmentCount : ""}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Distinct departments
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-full lg:w-[500px]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentUser?.roles?.some((r: any) =>
              ["Admin", "Super Admin", "Data Manager"].includes(r),
            ) && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <Select
                  value={locationId}
                  onValueChange={(value) => {
                    setLocationId(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Filter className="h-4 w-4 text-gray-400" />
            <Select
              value={filters.department}
              onValueChange={(value) => {
                setFilters({ ...filters, department: value });
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => {
                setFilters({ ...filters, status: value });
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {EMPLOYMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-transparent border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            onClick={() => setImportDialogOpen(true)}
          >
            <FileUp className="h-4 w-4" />
            <span className="hidden lg:inline">Import</span>
          </Button>
          {/* <Button variant="outline" className="flex items-center gap-2 bg-transparent border-sky-600 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20" onClick={() => setEligibilityImportDialogOpen(true)}>
            <Download className="h-4 w-4" />
            <span className="hidden lg:inline">Eligibility Import</span>
          </Button> */}
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            className="bg-sky-600 hover:bg-sky-700"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Employee
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-600 mb-2" />
                    <p className="text-muted-foreground italic">
                      Loading employees...
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((employee: any) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2 border">
                        <AvatarImage
                          src={getReliableAvatarUrl(employee)}
                          alt={employee.employeeName}
                        />
                        <AvatarFallback>
                          {employee.employeeName?.charAt(0) || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {employee.employeeName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{employee.employeeId}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getDepartmentColor(employee.department)}
                    >
                      {employee.department}
                    </Badge>
                  </TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(employee.status)}
                    >
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.joinDate
                      ? format(new Date(employee.joinDate), "MMM dd, yyyy")
                      : "---"}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        onClick={() => openViewDialog(employee)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600"
                        onClick={() => openEditDialog(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-600"
                        onClick={() => handleGenerateCredentials(employee)}
                        title="Generate Login Credentials"
                      >
                        <Key className="h-4 w-4" />
                        <span className="sr-only">Generate Credentials</span>
                      </Button>
                      {/* <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => openDeleteDialog(employee)}>
                        <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span>
                      </Button> */}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Search className="h-10 w-10 mb-2" />
                    <p>No employees found</p>
                    <p className="text-sm">
                      Try adjusting your search or filters
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  if (i === 0) pageNum = 1;
                  else if (i === 1)
                    return (
                      <PaginationItem key="el-s">
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  else
                    pageNum = Math.min(
                      totalPages - (4 - i),
                      currentPage + (i - 2),
                    );
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              {totalPages > 5 && currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="max-h-[85vh] overflow-y-auto pr-2">
            <AddEmployeeForm
              onSubmit={handleAddEmployee}
              onCancel={() => setAddDialogOpen(false)}
              initialLocationId={locationId}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <ViewEmployeeDetails employee={selectedEmployee} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <div className="max-h-[85vh] overflow-y-auto pr-2">
            {selectedEmployee && (
              <EditEmployeeForm
                employee={selectedEmployee}
                onSubmit={handleEditEmployee}
                onCancel={() => setEditDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inactivate Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {getEmployeeName(selectedEmployee)} as inactive.
              They will no longer appear in active lists but their records will
              be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Inactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Employees</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
              <p className="mb-2">
                <strong>Step 1:</strong> Download the empty template and fill it
                out. Review the "Locations Reference" sheet to match the correct
                Location ID if you are a Super Admin.
              </p>
              <p>
                <strong>Step 2:</strong> Upload the completed file here to bulk
                import records. Dates should be in YYYY-MM-DD format.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" /> Download Excel Template
            </Button>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing
                  Data...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4 mr-2" /> Upload Completed File
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={eligibilityImportDialogOpen}
        onOpenChange={setEligibilityImportDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk Import Eligibility amounts</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
              <p className="mb-2">
                <strong>Step 1:</strong> Download the eligibility template and
                fill in Employee IDs with their respective advance and loan
                eligibility amounts.
              </p>
              <p>
                <strong>Step 2:</strong> Upload the completed file to bulk
                update eligibility amounts for existing employees.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleDownloadEligibilityTemplate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" /> Download Eligibility
              Template
            </Button>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              ref={eligibilityFileInputRef}
              onChange={handleEligibilityFileUpload}
            />
            <Button
              className="w-full bg-sky-600 hover:bg-sky-700 text-white"
              onClick={() => eligibilityFileInputRef.current?.click()}
              disabled={eligibilityImporting}
            >
              {eligibilityImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating
                  Eligibility...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4 mr-2" /> Upload Eligibility File
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={credentialsDialog.open}
        onOpenChange={(open) =>
          setCredentialsDialog({ ...credentialsDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Employee Login Credentials</AlertDialogTitle>
            <AlertDialogDescription>
              {credentialsDialog.message}
              <div className="mt-4 space-y-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                <p className="text-slate-800 dark:text-slate-200">
                  <strong>Email:</strong> {credentialsDialog.email}
                </p>
                <p className="text-slate-800 dark:text-slate-200">
                  <strong>Password:</strong> {credentialsDialog.password}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
