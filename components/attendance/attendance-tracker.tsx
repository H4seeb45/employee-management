"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Clock3,
} from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, ChartTooltip, Legend);
// No local mockAttendance fallback — use real data from LayoutProvider
import { useLayout } from "@/components/layout/layout-provider";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { MarkAttendanceForm } from "@/components/attendance/mark-attendance-form";
import { EditAttendanceForm } from "@/components/attendance/edit-attendance-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BulkAttendanceForm } from "@/components/attendance/bulk-attendance-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parse } from "path";

export function AttendanceTracker() {
  const {
    attendance,
    addAttendance,
    updateAttendance,
    deleteAttendance,
    employees,
    setAttendance,
  } = useLayout();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<
    [Date | undefined, Date | undefined]
  >([undefined, undefined]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Dialog states
  const [markAttendanceOpen, setMarkAttendanceOpen] = useState(false);
  const [bulkAttendanceOpen, setBulkAttendanceOpen] = useState(false);
  const [editAttendanceOpen, setEditAttendanceOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
  // Always use attendance from context (real data)
  const attendanceData = attendance;

  const filteredData = attendanceData?.filter((record) => {
    const matchesEmployee =
      selectedEmployee === "all" || record?.employeeId === selectedEmployee;
    const matchesStatus =
      selectedStatus === "all" || record?.status === selectedStatus;

    if (dateRange[0] && dateRange[1]) {
      const recordDate = new Date(record.date);
      const isInRange =
        recordDate >= dateRange[0] && recordDate <= dateRange[1];
      return matchesEmployee && matchesStatus && isInRange;
    }
    return matchesEmployee && matchesStatus;
  });

  const summaryStats = useMemo(() => {
    const totalRecords = filteredData.length;
    const presentCount = filteredData.filter(
      (record) => record?.status === "Present"
    ).length;
    const absentCount = filteredData.filter(
      (record) => record?.status === "Absent"
    ).length;
    const halfDayCount = filteredData.filter(
      (record) => record?.status === "Half Day"
    ).length;
    const lateCount = filteredData.filter(
      (record) => record?.checkInStatus === "late"
    ).length;

    const attendanceRate =
      totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    const avgWorkingHours =
      totalRecords > 0
        ? Math.round(
            (filteredData.reduce(
              (sum, record) =>
                sum + Number.parseFloat(record.workingHours || "0"),
              0
            ) /
              totalRecords) *
              100
          ) / 100
        : 0;

    return {
      totalRecords,
      presentCount,
      absentCount,
      halfDayCount,
      lateCount,
      attendanceRate,
      avgWorkingHours,
    };
  }, [filteredData]);

  const handleMarkAttendance = (data: any) => {
    const payload = {
      ...data,
      // send ISO-8601 DateTime for the attendance.date field
      date: selectedDate
        ? selectedDate.toISOString()
        : new Date().toISOString(),
    };

    // Use LayoutProvider addAttendance which posts to the API and updates context
    addAttendance(payload);
    setMarkAttendanceOpen(false);

    toast({
      title: "Attendance Marked",
      description: `Attendance for ${data.employeeId} has been recorded.`,
    });
  };

  // ... existing code ...
  const handleBulkAttendance = (data: any) => {
    const { selectedEmployees, date, checkIn, checkOut, status } = data;

    // Build a reliable employee map from context or fallback
    const employeeList = (
      employees && employees.length > 0
        ? employees
        : [
            { id: "EMP001", employeeName: "Sarah Johnson" },
            { id: "EMP002", employeeName: "Michael Brown" },
            { id: "EMP003", employeeName: "Emily Davis" },
            { id: "EMP004", employeeName: "David Wilson" },
            { id: "EMP005", employeeName: "Jessica Taylor" },
          ]
    ) as Array<{ id?: string; employeeId?: string; employeeName: string }>;

    const employeeById = new Map(
      employeeList.map((e) => {
        const key = e.id ?? e.employeeId;
        return [
          key,
          {
            id: e.id ?? e.employeeId,
            employeeId: e.employeeId ?? e.id,
            // employeeName: e.employeeName!,
          },
        ];
      })
    );


    const newRecords = selectedEmployees.map((empId: string, index: number) => {
      // Resolve employee from the proper list (NOT from moksData)
      const employee = employeeById.get(empId) ?? { id: empId, employeeId: empId };

      // Calculate working hours and statuses
      let workingHours = 0;
      let checkInStatus: "on-time" | "late" = "on-time";
      let checkOutStatus: "on-time" | "early" = "on-time";

      if (checkIn && checkOut) {
        try {
          // Safer time parsing to avoid Date parsing quirks
          const [ciH, ciM] = checkIn.split(":").map(Number);
          const [coH, coM] = checkOut.split(":").map(Number);
          const diffMs =
            (coH * 60 + coM - (ciH * 60 + ciM)) * 60 * 1000 +
            (coH < ciH ? 24 * 60 * 60 * 1000 : 0);
          const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
          workingHours = hours;

          if (ciH > 9 || (ciH === 9 && ciM > 15)) checkInStatus = "late";
          if (coH < 17 || (coH === 16 && coM > 59)) checkOutStatus = "early"; // before 17:00 counts as early
        } catch (err) {
          console.error("Error calculating working hours:", err);
        }
      }

      return {
        // do not assign local ids; let server generate ids
        employeeId: employee.employeeId,
        // employeeName: employee.employeeName,
        // send ISO date so Prisma receives a proper DateTime
        date: date ? date.toISOString() : new Date().toISOString(),
        checkIn: checkIn || "",
        checkOut: checkOut || "",
        checkInStatus,
        checkOutStatus,
        workingHours: workingHours,
        status,
      };
    });

    // Persist each record via the LayoutProvider API helper
    (async () => {
      try {
        await Promise.all(newRecords.map((r: any) => addAttendance(r)));
        setBulkAttendanceOpen(false);
        toast({
          title: "Bulk Attendance Marked",
          description: `Attendance for ${newRecords.length} employees has been recorded successfully.`,
        });
      } catch (err) {
        console.error("Bulk attendance API error", err);
        toast({
          title: "Bulk Attendance Failed",
          description: "Failed to mark attendance for some employees.",
          variant: "destructive",
        });
      }
    })();
  };
  // ... existing code ...

  const handleEditAttendance = (data: any) => {
    updateAttendance(data);
    setEditAttendanceOpen(false);

    toast({
      title: "Attendance Updated",
      description: `Attendance record has been updated successfully.`,
    });
  };

  const handleDeleteAttendance = () => {
    if (selectedAttendance) {
      deleteAttendance(selectedAttendance.id);
      setDeleteDialogOpen(false);

      toast({
        title: "Attendance Deleted",
        description: `Attendance record has been deleted.`,
        variant: "destructive",
      });
    }
  };

  const handleBulkDeleteConfirm = () => {
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    // Delete selected records via the LayoutProvider API helper
    (async () => {
      try {
        await Promise.all(selectedRecords.map((id) => deleteAttendance(id)));
        setSelectedRecords([]);
        setSelectAll(false);
        setBulkDeleteDialogOpen(false);
        toast({
          title: "Deleted",
          description: `${selectedRecords.length} attendance record(s) deleted.`,
        });
      } catch (err) {
        console.error("Bulk delete error", err);
        toast({
          title: "Delete Failed",
          description: "Failed to delete some attendance records.",
          variant: "destructive",
        });
      }
    })();
  };

  const openEditDialog = (record: any) => {
    setSelectedAttendance(record);
    setEditAttendanceOpen(true);
  };

  const openDeleteDialog = (record: any) => {
    setSelectedAttendance(record);
    setDeleteDialogOpen(true);
  };

  const exportToCSV = () => {
    // Create CSV content
    const headers = [
      "Employee ID",
      "Employee Name",
      "Date",
      "Check In",
      "Check Out",
      "Working Hours",
      "Status",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredData.map((record) => {
        return [
          record.employeeId,
          record.employeeName,
          record.date,
          record.checkIn,
          record.checkOut,
          record.workingHours,
          record.status,
        ].join(",");
      }),
    ].join("\n");

    // Create a blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "attendance.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `${filteredData.length} attendance records exported to CSV.`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Present":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            {status}
          </Badge>
        );
      case "Absent":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            {status}
          </Badge>
        );
      case "Half Day":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            {status}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleSelectRecord = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRecords((prev) => [...prev, id]);
    } else {
      setSelectedRecords((prev) => prev.filter((recordId) => recordId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedRecords(filteredData.map((record) => record.id));
    } else {
      setSelectedRecords([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <Card className="p-6 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl flex flex-col items-center justify-center bg-white dark:bg-[#1E293B]">
            <h3 className="text-lg font-semibold mb-4 text-[#0A192F] dark:text-white self-start">Overview</h3>
            <div className="w-[180px] h-[180px]">
                <Doughnut
                    data={{
                        labels: ['Present', 'Absent', 'Half Day', 'Late'],
                        datasets: [
                            {
                                data: [
                                    summaryStats.presentCount,
                                    summaryStats.absentCount,
                                    summaryStats.halfDayCount,
                                    summaryStats.lateCount
                                ],
                                backgroundColor: [
                                    '#10b981', // Present (Emerald)
                                    '#f43f5e', // Absent (Rose)
                                    '#f59e0b', // Half Day (Amber)
                                    '#6366f1', // Late (Indigo)
                                ],
                                borderWidth: 0,
                            },
                        ],
                    }}
                    options={{
                        cutout: '70%',
                        plugins: {
                            legend: { display: false },
                            tooltip: { enabled: true } // Use default tooltip for now
                        }
                    }}
                />
            </div>
            <div className="mt-4 flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Present</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Absent</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Half Day</div>
            </div>
        </Card>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-6 border-l-4 border-l-blue-600 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Records
                  </p>
                  <p className="text-3xl font-bold text-[#0A192F] dark:text-white">
                    {summaryStats.totalRecords}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Present
                  </p>
                  <p className="text-3xl font-bold text-[#0A192F] dark:text-white">
                    {summaryStats.presentCount}
                  </p>
                  <p className="text-xs text-emerald-600 font-medium">
                    {summaryStats.attendanceRate}% Rate
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <UserCheck className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </Card>

             <Card className="p-6 border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Absent / Late
                  </p>
                  <p className="text-3xl font-bold text-[#0A192F] dark:text-white">
                    {summaryStats.absentCount}
                  </p>
                  <p className="text-xs text-rose-600 font-medium">
                    {summaryStats.lateCount} Late Arrivals
                  </p>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl">
                  <UserX className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </Card>

             <Card className="p-6 border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Avg. Hours
                  </p>
                  <p className="text-3xl font-bold text-[#0A192F] dark:text-white">
                    {summaryStats.avgWorkingHours}
                  </p>
                  <p className="text-xs text-amber-600 font-medium">
                    {summaryStats.halfDayCount} Half Days
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <Clock3 className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </Card>
        </div>
      </div>

      <Card className="shadow-sm p-6 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
        <Tabs defaultValue="view" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <TabsList className="bg-white dark:bg-slate-800 shadow-sm">
              <TabsTrigger
                value="view"
                className="data-[state=active]:bg-sky-600 data-[state=active]:text-white"
              >
                View Attendance
              </TabsTrigger>
              <TabsTrigger
                value="mark"
                className="data-[state=active]:bg-sky-600 data-[state=active]:text-white"
              >
                Mark Attendance
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {selectedRecords.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDeleteConfirm}
                        className="shadow-sm hover:shadow-md transition-shadow"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedRecords.length})
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete selected attendance records</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-800"
                      onClick={exportToCSV}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Export attendance records to CSV</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <TabsContent value="view" className="mt-0">
            <div className="flex flex-col md:flex-row gap-4 md:items-center mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sky-600" />
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[240px] justify-start text-left font-normal shadow-sm bg-transparent"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange[0] && dateRange[1]
                        ? `${format(dateRange[0], "MMM d, yyyy")} - ${format(
                            dateRange[1],
                            "MMM d, yyyy"
                          )}`
                        : "Select date range"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={{
                        from: dateRange[0],
                        to: dateRange[1],
                      }}
                      onSelect={(range) => {
                        setDateRange([range?.from, range?.to]);
                        if (range?.from && range?.to) {
                          setCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-sky-600" />
                <Select
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                >
                  <SelectTrigger className="w-[180px] shadow-sm">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="EMP001">Sarah Johnson</SelectItem>
                    <SelectItem value="EMP002">Michael Brown</SelectItem>
                    <SelectItem value="EMP003">Emily Davis</SelectItem>
                    <SelectItem value="EMP004">David Wilson</SelectItem>
                    <SelectItem value="EMP005">Jessica Taylor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-[140px] shadow-sm">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mark" className="mt-0">
            <div className="flex flex-col md:flex-row gap-4 md:items-center mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="bg-sky-600 hover:bg-sky-700 shadow-sm hover:shadow-md transition-all"
                      onClick={() => setMarkAttendanceOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Mark Individual
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mark attendance for a single employee</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="bg-green-600 hover:bg-green-700 shadow-sm hover:shadow-md transition-all"
                      onClick={() => setBulkAttendanceOpen(true)}
                    >
                      <Users className="h-4 w-4 mr-2" /> Mark Bulk Attendance
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mark attendance for multiple employees at once</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="shadow-sm bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800">
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Check In</TableHead>
                <TableHead className="font-semibold">Check Out</TableHead>
                <TableHead className="font-semibold">Working Hours</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((record, index) => (
                  <TableRow
                    key={record.id}
                    className={
                      index % 2 === 0 ? "bg-slate-25 dark:bg-slate-900/50" : ""
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRecords.includes(record.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRecord(record.id, checked === true)
                        }
                        aria-label={`Select ${record.employeeName}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.employeeName || `Employee ${record.employeeId}`}
                    </TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-sky-600" />
                        {record.checkIn}
                        {record.checkInStatus === "late" && (
                          <Badge className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            Late
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-sky-600" />
                        {record.checkOut}
                        {record.checkOutStatus === "early" && (
                          <Badge className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            Early
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.workingHours} hrs
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                onClick={() => openEditDialog(record)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit attendance record</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => openDeleteDialog(record)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete attendance record</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mb-4 text-slate-400" />
                      <p className="text-lg font-medium">
                        No attendance records found
                      </p>
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
      </Card>

      <Dialog open={markAttendanceOpen} onOpenChange={setMarkAttendanceOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
          </DialogHeader>
          <MarkAttendanceForm
            onSubmit={handleMarkAttendance}
            onCancel={() => setMarkAttendanceOpen(false)}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={bulkAttendanceOpen} onOpenChange={setBulkAttendanceOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Bulk Attendance Marking</DialogTitle>
          </DialogHeader>
          <BulkAttendanceForm
            onSubmit={handleBulkAttendance}
            onCancel={() => setBulkAttendanceOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editAttendanceOpen} onOpenChange={setEditAttendanceOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
          </DialogHeader>
          {selectedAttendance && (
            <EditAttendanceForm
              attendance={selectedAttendance}
              onSubmit={handleEditAttendance}
              onCancel={() => setEditAttendanceOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              attendance record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAttendance}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRecords.length}{" "}
              attendance record
              {selectedRecords.length > 1 ? "s" : ""}? This action cannot be
              undone and will permanently remove the selected records from the
              system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete {selectedRecords.length} Record
              {selectedRecords.length > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
