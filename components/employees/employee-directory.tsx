"use client";

import { useState, useEffect } from "react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || []);
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch employees", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Selected employee for operations
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const getDepartmentColor = (department: string) => {
    const dept = department?.toUpperCase();
    switch (dept) {
      case "FINANCE": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "HR": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "SALES": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "MANAGEMENT": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "OPERATIONS": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    if (status?.startsWith("Active")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (status?.startsWith("Inactive")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const getEmployeeName = (employee: any) => employee?.employeeName || "Employee";

  const filteredData = employees.filter((employee: any) => {
    const matchesSearch =
      employee.employeeName?.toLowerCase().includes(searchText.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchText.toLowerCase()) ||
      employee.employeeId?.toLowerCase().includes(searchText.toLowerCase());

    const matchesDepartment = filters.department === "all" || employee.department === filters.department;
    const matchesStatus = filters.status === "all" || employee.status === filters.status;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        toast({ title: "Employee Added", description: `${employee.employeeName} has been added.` });
        setAddDialogOpen(false);
        fetchEmployees();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add employee", variant: "destructive" });
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
        toast({ title: "Employee Updated", description: `${employee.employeeName}'s info updated.` });
        setEditDialogOpen(false);
        fetchEmployees();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update employee", variant: "destructive" });
    }
  };

  const handleDeleteEmployee = async () => {
    if (selectedEmployee) {
      try {
        const res = await fetch(`/api/employees/${selectedEmployee.id}`, { method: "DELETE" });
        if (res.ok) {
          toast({ title: "Employee Inactivated", description: `${getEmployeeName(selectedEmployee)} is now inactive.` });
          setDeleteDialogOpen(false);
          fetchEmployees();
        } else {
          const data = await res.json();
          toast({ title: "Error", description: data.message, variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete employee", variant: "destructive" });
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

  const exportToCSV = () => {
    const headers = ["ID", "Name", "Position", "Department", "Email", "Phone", "Join Date", "Status"];
    const csvContent = [
      headers.join(","),
      ...filteredData.map((employee: any) => {
        return [
          employee.employeeId,
          employee.employeeName,
          employee.position,
          employee.department,
          employee.email,
          employee.phone || "",
          employee.joinDate ? format(new Date(employee.joinDate), "yyyy-MM-dd") : "",
          employee.status,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "employees.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Successful", description: `${filteredData.length} records exported.` });
  };

  const totalEmployees = employees.length;
  const totalShown = filteredData.length;
  const activeCount = filteredData.filter((e: any) => e.status?.startsWith("Active")).length;
  const inactiveCount = filteredData.filter((e: any) => e.status?.startsWith("Inactive")).length;
  const departmentCount = new Set(filteredData.map((e: any) => e.department)).size;

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
                {mounted ? totalShown : ""} <span className="text-slate-400 text-lg font-normal">/ {mounted ? totalEmployees : ""}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Based on current search</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">Active</CardTitle>
              <Activity className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A192F] dark:text-white">{mounted ? activeCount : ""}</div>
              <p className="text-xs text-emerald-600 font-medium mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">Inactive</CardTitle>
              <Briefcase className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A192F] dark:text-white">{mounted ? inactiveCount : ""}</div>
              <p className="text-xs text-amber-600 font-medium mt-1">Terminated / Resigned</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-500">Departments</CardTitle>
              <Building2 className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A192F] dark:text-white">{mounted ? departmentCount : ""}</div>
              <p className="text-xs text-slate-500 mt-1">Distinct departments</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-full md:w-64"
            />
          </div>

          <div className="flex items-center gap-2">
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
                {DEPARTMENTS.map((dept) => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
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
                {EMPLOYMENT_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2 bg-transparent" onClick={exportToCSV}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setAddDialogOpen(true)}>
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
                    <p className="text-muted-foreground italic">Loading employees...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((employee: any) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2 border">
                        <AvatarImage src={getReliableAvatarUrl(employee)} alt={employee.employeeName} />
                        <AvatarFallback>{employee.employeeName?.charAt(0) || "A"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{employee.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{employee.employeeId}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getDepartmentColor(employee.department)}>{employee.department}</Badge>
                  </TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(employee.status)}>{employee.status}</Badge>
                  </TableCell>
                  <TableCell>{employee.joinDate ? format(new Date(employee.joinDate), "MMM dd, yyyy") : "---"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openViewDialog(employee)}>
                        <Eye className="h-4 w-4" /><span className="sr-only">View</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => openEditDialog(employee)}>
                        <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => openDeleteDialog(employee)}>
                        <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span>
                      </Button>
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
                    <p className="text-sm">Try adjusting your search or filters</p>
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
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  if (i === 0) pageNum = 1;
                  else if (i === 1) return <PaginationItem key="el-s"><PaginationEllipsis /></PaginationItem>;
                  else pageNum = Math.min(totalPages - (4 - i), currentPage + (i - 2));
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum}>{pageNum}</PaginationLink>
                  </PaginationItem>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && <PaginationItem><PaginationEllipsis /></PaginationItem>}
              {totalPages > 5 && currentPage < totalPages - 1 && <PaginationItem><PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink></PaginationItem>}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
          <div className="max-h-[85vh] overflow-y-auto pr-2">
            <AddEmployeeForm onSubmit={handleAddEmployee} onCancel={() => setAddDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Employee Details</DialogTitle></DialogHeader>
          {selectedEmployee && <ViewEmployeeDetails employee={selectedEmployee} />}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          <div className="max-h-[85vh] overflow-y-auto pr-2">
            {selectedEmployee && <EditEmployeeForm employee={selectedEmployee} onSubmit={handleEditEmployee} onCancel={() => setEditDialogOpen(false)} />}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inactivate Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {getEmployeeName(selectedEmployee)} as inactive. They will no longer appear in active lists but their records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-orange-600 hover:bg-orange-700 text-white">Inactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
