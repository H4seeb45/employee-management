"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Loader2, 
  Search, 
  Download, 
  Upload, 
  Edit, 
  Plus, 
  Calendar as CalendarIcon,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  UserCheck,
  UserX,
  Clock3,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { isAdminUser } from "@/lib/auth";
import { useLayout } from "../layout/layout-provider";

ChartJS.register(ArcElement, ChartTooltip, Legend);

type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  checkInStatus: string | null;
  checkOutStatus: string | null;
  workingHours: number | null;
  employee: {
    employeeId: string;
    employeeName: string;
    position: string | null;
    department: string | null;
  };
};

export function AttendanceModule() {
  const { user } = useLayout();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const isAdmin = user?.roles?.some((role: any) => ["Admin"].includes(role));
  const isSuperAdmin = user?.roles?.some((role: any) => ["Super Admin"].includes(role));
  const isBusinessManager = user?.roles?.some((role: any) => ["Business Manager"].includes(role));
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterDay, setFilterDay] = useState(new Date().getDate().toString());
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterStatus, setFilterStatus] = useState("all");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [updating, setUpdating] = useState(false);

  // Summary Stats
  const summaryStats = useMemo(() => {
    const totalRecords = records.length;
    const presentCount = records.filter(r => r.status === "Present").length;
    const absentCount = records.filter(r => r.status === "Absent").length;
    const halfDayCount = records.filter(r => r.status === "Half Day").length;
    const lateCount = records.filter(r => r.checkInStatus === "late").length;
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    const avgWorkingHours = totalRecords > 0 ? (records.reduce((sum, r) => sum + (r.workingHours || 0), 0) / totalRecords).toFixed(1) : "0";

    return { totalRecords, presentCount, absentCount, halfDayCount, lateCount, attendanceRate, avgWorkingHours };
  }, [records]);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data.locations || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLocations();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterLocation !== "all") params.append("locationId", filterLocation);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterDay !== "all") params.append("day", filterDay);
      params.append("month", filterMonth);
      params.append("year", filterYear);

      const res = await fetch(`/api/attendance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        toast.error("Failed to fetch attendance records");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [filterLocation, filterDay, filterMonth, filterYear, filterStatus]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportProgress(0);
    try {
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (data.length === 0) {
              toast.error("Excel file is empty");
              resolve();
              return;
            }

            const formattedRecords = data.map((row: any) => {
                 // Case-insensitive key lookup helper
                 const getVal = (keys: string[]) => {
                   const foundKey = Object.keys(row).find(k => 
                     keys.some(key => k.toLowerCase().trim() === key.toLowerCase().trim())
                   );
                   return foundKey ? row[foundKey] : null;
                 };

                 const formatExcelTime = (val: any) => {
                    if (typeof val === 'number') {
                        const totalMinutes = Math.round(val * 24 * 60);
                        const hours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                    }
                    return val?.toString() || "";
                 };

                 let dateVal = getVal(["Date", "Attendance Date", "AttendanceDate", "DAT"]);
                 let dateStr = "";

                 if (dateVal instanceof Date) {
                    // If cellDates: true is on, use local components to avoid timezone shift
                    const y = dateVal.getFullYear();
                    const m = dateVal.getMonth() + 1;
                    const d = dateVal.getDate();
                    dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                 } else if (typeof dateVal === 'number') {
                    // For numeric serials, use Math.floor to ignore time parts
                    const serial = Math.floor(dateVal);
                    const date = new Date((serial - 25569) * 86400 * 1000);
                    dateStr = date.toISOString().split('T')[0];
                 } else if (typeof dateVal === 'string') {
                    // Try to parse string date
                    const parts = dateVal.split(/[-/]/);
                    if (parts.length === 3) {
                       if (parts[0].length === 4) {
                          dateStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                       } else {
                          dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                       }
                    } else {
                       const d = new Date(dateVal);
                       if (!isNaN(d.getTime())) {
                          dateStr = d.toISOString().split('T')[0];
                       }
                    }
                 }

                 const checkIn = formatExcelTime(getVal(["Check In", "CheckIn", "In Time", "In", "Arrival"]));
                 const checkOut = formatExcelTime(getVal(["Check Out", "CheckOut", "Out Time", "Out", "Departure"]));
                 const empId = getVal(["Employee ID", "EmployeeID", "EMP ID", "ID", "User ID"])?.toString() || "";
                 const status = getVal(["Status", "Attendance", "REMARK"])?.toString() || "Present";
                 
                 let workingHours = 0;
                 let checkInStatus = "on-time";
                 let checkOutStatus = "on-time";

                 if (checkIn && checkOut) {
                    try {
                      const [ciH, ciM] = checkIn.split(":").map(Number);
                      const [coH, coM] = checkOut.split(":").map(Number);
                      if (!isNaN(ciH) && !isNaN(coH)) {
                        const diffMs = (coH * 60 + coM - (ciH * 60 + ciM)) * 60 * 1000 + (coH < ciH ? 24 * 60 * 60 * 1000 : 0);
                        workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

                        if (ciH > 9 || (ciH === 9 && ciM > 15)) checkInStatus = "late";
                        if (coH < 17) checkOutStatus = "early";
                      }
                    } catch (err) {}
                 }

                 return {
                    employeeCustomId: empId,
                    date: dateStr,
                    checkIn,
                    checkOut,
                    status: status,
                    checkInStatus,
                    checkOutStatus,
                    workingHours
                 }
            }).filter(r => r.employeeCustomId && r.date);

            // Batch processing
            const chunkSize = 50;
            const totalChunks = Math.ceil(formattedRecords.length / chunkSize);
            let successCount = 0;
            let failedCount = 0;

            for (let i = 0; i < totalChunks; i++) {
              const chunk = formattedRecords.slice(i * chunkSize, (i + 1) * chunkSize);
              try {
                const res = await fetch("/api/attendance/bulk", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ records: chunk }),
                });

                if (res.ok) {
                  const result = await res.json();
                  successCount += result.success;
                  failedCount += result.failed;
                } else {
                  failedCount += chunk.length;
                }
              } catch (err) {
                failedCount += chunk.length;
              }
              setImportProgress(Math.round(((i + 1) / totalChunks) * 100));
            }

            toast.success(`Import completed: ${successCount} successful, ${failedCount} failed.`);
            fetchAttendance();
            setImportDialogOpen(false);
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });
    } catch (err) {
      console.error(err);
      toast.error("Error reading Excel file");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;

    setUpdating(true);
    try {
      let workingHours = 0;
      let checkInStatus = "on-time";
      let checkOutStatus = "on-time";

      if (editRecord.checkIn && editRecord.checkOut) {
        try {
          const [ciH, ciM] = editRecord.checkIn.split(":").map(Number);
          const [coH, coM] = editRecord.checkOut.split(":").map(Number);
          const diffMs = (coH * 60 + coM - (ciH * 60 + ciM)) * 60 * 1000 + (coH < ciH ? 24 * 60 * 60 * 1000 : 0);
          workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
          
          if (ciH > 9 || (ciH === 9 && ciM > 15)) checkInStatus = "late";
          if (coH < 17) checkOutStatus = "early";
        } catch (err) {}
      }

      const res = await fetch(`/api/attendance/${editRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            status: editRecord.status,
            checkIn: editRecord.checkIn,
            checkOut: editRecord.checkOut,
            workingHours,
            checkInStatus,
            checkOutStatus
        }),
      });

      if (res.ok) {
        toast.success("Attendance updated successfully");
        setEditRecord(null);
        fetchAttendance();
      } else {
        toast.error("Failed to update attendance");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating attendance");
    } finally {
      setUpdating(false);
    }
  };

  const downloadSampleTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Employee ID": "EMP001", "Date": "2026-04-01", "Check In": "09:00", "Check Out": "17:00", "Status": "Present" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AttendanceTemplate");
    XLSX.writeFile(wb, "attendance_template.xlsx");
  };

  const exportToCSV = () => {
    const headers = ["Date", "Employee ID", "Employee Name", "Check In", "Check Out", "Status", "Working Hours"];
    const csvContent = [
      headers.join(","),
      ...records.map(r => [
        new Date(r.date).toLocaleDateString(),
        r.employee.employeeId,
        r.employee.employeeName,
        r.checkIn || "",
        r.checkOut || "",
        r.status,
        r.workingHours || 0
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_report_${filterDay !== "all" ? filterDay + "_" : ""}${filterMonth}_${filterYear}.csv`;
    link.click();
    toast.success("Records exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0A192F] dark:text-white">Attendance Management</h1>
          <p className="text-slate-500 dark:text-slate-400">View, update, and import employee attendance records.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} className="shadow-sm">
             <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="shadow-sm">
            <Upload className="h-4 w-4 mr-2" /> Import Excel
          </Button>
          <Button variant="outline" onClick={downloadSampleTemplate} className="shadow-sm">
            <Download className="h-4 w-4 mr-2" /> Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <Card className="p-6 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl flex flex-col items-center justify-center bg-white dark:bg-[#1E293B]">
            <h3 className="text-lg font-semibold mb-4 text-[#0A192F] dark:text-white self-start">Monthly Overview</h3>
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
                        cutout: '75%',
                        plugins: {
                            legend: { display: false },
                            tooltip: { enabled: true }
                        }
                    }}
                />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>Present</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>Absent</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>Half Day</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>Late</div>
            </div>
        </Card>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-6 border-l-4 border-l-blue-600 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Records</p>
                  <p className="text-3xl font-bold text-[#0A192F] dark:text-white">{summaryStats.totalRecords}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Attendance Rate</p>
                  <p className="text-3xl font-bold text-[#0A192F] dark:text-white">{summaryStats.attendanceRate}%</p>
                  <p className="text-xs text-emerald-600 font-medium">{summaryStats.presentCount} Present</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <UserCheck className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </Card>

             <Card className="p-6 border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Late / Absent</p>
                  <p className="text-3xl font-bold text-[#0A192F] dark:text-white">{summaryStats.absentCount + summaryStats.lateCount}</p>
                  <p className="text-xs text-rose-600 font-medium">{summaryStats.lateCount} Late Arrivals</p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                  <UserX className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </Card>

             <Card className="p-6 border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl bg-white dark:bg-[#1E293B]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Average Hours</p>
                  <p className="text-3xl font-bold text-[#0A192F] dark:text-white">{summaryStats.avgWorkingHours}</p>
                  <p className="text-xs text-amber-600 font-medium">{summaryStats.halfDayCount} Half Days</p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <Clock3 className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </Card>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-[#1E293B]">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
           { (isSuperAdmin || isAdmin) && <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</Label>
              <SearchableSelect
                value={filterLocation}
                onValueChange={setFilterLocation}
                options={[
                  { value: "all", label: "All Locations" },
                  ...(locations ? locations.map(l => ({ value: l.id, label: `${l.name} (${l.city})` })) : [])
                ]}
                placeholder="Select Location"
              />
            </div>}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Day</Label>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {Array.from({ length: new Date(parseInt(filterYear), parseInt(filterMonth), 0).getDate() }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Month</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Year</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                    <SelectItem value="Late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchAttendance} disabled={loading} className="bg-[#0A192F] hover:bg-[#162a45] shadow-sm transform transition-all active:scale-95">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Fetch
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider">EMP ID</TableHead>
                  <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider">Name</TableHead>
                  <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider">Check In</TableHead>
                  <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider">Check Out</TableHead>
                  <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-right">Hours</TableHead>
                  <TableHead className="py-4 px-6 text-[11px] font-bold uppercase tracking-wider text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500 italic">
                      No records found for the selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r, i) => (
                    <TableRow key={r.id} className={i % 2 === 0 ? 'bg-white dark:bg-[#1E293B]' : 'bg-slate-50/30 dark:bg-slate-800/20'}>
                      <TableCell className="py-3 px-6 font-medium text-xs">{new Date(r.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' })}</TableCell>
                      <TableCell className="py-3 px-6 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">{r.employee.employeeId}</TableCell>
                      <TableCell className="py-3 px-6">
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-[#0A192F] dark:text-slate-100">{r.employee.employeeName}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-tighter">{r.employee.position}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-semibold">{r.checkIn || '--:--'}</span>
                            {r.checkInStatus === 'late' && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200">LATE</Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-semibold">{r.checkOut || '--:--'}</span>
                            {r.checkOutStatus === 'early' && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 bg-rose-50 text-rose-700 border-rose-200">EARLY</Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-6 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                          r.status === 'Absent' ? 'bg-rose-100 text-rose-700' :
                          r.status === 'Half Day' ? 'bg-amber-100 text-amber-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-6 text-right font-bold text-xs">{r.workingHours || '-'}</TableCell>
                      <TableCell className="py-3 px-6 text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditRecord(r)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 group">
                          <Edit className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#1E293B]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Bulk Import</DialogTitle>
            <DialogDescription>
              Upload attendance sheet. Records are automatically matched by Employee ID and Date.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
             {importing ? (
                <div className="space-y-4 py-8 text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
                    <div className="space-y-2">
                        <p className="text-sm font-bold text-[#0A192F] dark:text-white">Importing Records... {importProgress}%</p>
                        <Progress value={importProgress} className="h-2 w-full bg-slate-100 dark:bg-slate-800" />
                        <p className="text-xs text-slate-500 font-medium">Please do not close this window</p>
                    </div>
                </div>
             ) : (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="excel-upload" className="text-xs font-bold uppercase tracking-wider text-slate-500">Excel File (.xlsx, .xls)</Label>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="excel-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:border-slate-700 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-3 text-slate-400" />
                                    <p className="mb-2 text-sm text-slate-500 font-medium">Click to upload or drag and drop</p>
                                </div>
                                <Input 
                                    id="excel-upload" 
                                    type="file" 
                                    accept=".xlsx, .xls" 
                                    className="hidden" 
                                    onChange={handleImportExcel}
                                    disabled={importing}
                                />
                            </label>
                        </div>
                    </div>
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4" /> Import Rules:</h4>
                        <ul className="text-[11px] text-blue-700 dark:text-blue-300 space-y-1.5 list-disc pl-4 font-medium">
                            <li>Required Columns: <strong>Employee ID, Date, Check In, Check Out, Status</strong>.</li>
                            <li>Date Format: <strong>YYYY-MM-DD</strong>.</li>
                            <li>Supports <strong>Upsert</strong>: Existing records on same date are updated.</li>
                        </ul>
                    </div>
                </div>
             )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editRecord} onOpenChange={(o) => { if(!o) setEditRecord(null); }}>
        <DialogContent className="max-w-md bg-white dark:bg-[#1E293B]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2"><Edit className="w-5 h-5 text-amber-600" /> Edit Record</DialogTitle>
            <DialogDescription className="font-medium">
              Updating attendance for <span className="text-[#0A192F] dark:text-white font-bold">{editRecord?.employee.employeeName}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateRecord} className="space-y-6 pt-4">
             <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</Label>
                    <Select 
                        value={editRecord?.status} 
                        onValueChange={(v) => setEditRecord(prev => prev ? {...prev, status: v} : null)}
                    >
                        <SelectTrigger className="h-11 font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Present">Present</SelectItem>
                            <SelectItem value="Absent">Absent</SelectItem>
                            <SelectItem value="Half Day">Half Day</SelectItem>
                            <SelectItem value="Late">Late</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Check In Time</Label>
                        <Input 
                            type="time" 
                            value={editRecord?.checkIn || ""} 
                            onChange={(e) => setEditRecord(prev => prev ? {...prev, checkIn: e.target.value} : null)}
                            className="h-11 font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Check Out Time</Label>
                        <Input 
                            type="time" 
                            value={editRecord?.checkOut || ""} 
                            onChange={(e) => setEditRecord(prev => prev ? {...prev, checkOut: e.target.value} : null)}
                            className="h-11 font-bold"
                        />
                    </div>
                </div>
             </div>
             <DialogFooter className="pt-4 gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditRecord(null)} className="h-11">Cancel</Button>
                <Button type="submit" disabled={updating} className="bg-blue-600 hover:bg-blue-700 h-11 px-8 font-bold shadow-md shadow-blue-500/20">
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
