"use client";

import { Loader2, Calculator, Save, Printer, Download, Search } from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { SalarySlip } from "@/components/payroll/salary-slip";
import { useReactToPrint } from "react-to-print";

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
}

interface PayrollManagerProps {
    month: string;
    year: string;
    locationId: string;
}

export function PayrollManager({ month, year, locationId }: PayrollManagerProps) {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [calculateProgress, setCalculateProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const [isCalculated, setIsCalculated] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [viewingSlip, setViewingSlip] = useState<any | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchId, setSearchId] = useState("");
  const [searchDesignation, setSearchDesignation] = useState("");

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter(p => {
      const nameMatch = (p.employeeName || p.employee?.employeeName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = (p.empId || p.employee?.employeeId || "").toLowerCase().includes(searchId.toLowerCase());
      const designationMatch = (p.designation || p.employee?.position || "").toLowerCase().includes(searchDesignation.toLowerCase());
      return nameMatch && idMatch && designationMatch;
    });
  }, [payrolls, searchTerm, searchId, searchDesignation]);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef,
  });

  const currentMonthName = useMemo(() => {
    const m = parseInt(month);
    if (isNaN(m) || m < 1 || m > 12) return "-";
    return new Date(0, m - 1).toLocaleString('default', { month: 'long' });
  }, [month]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const locationQuery = locationId !== "all" ? `&locationId=${locationId}` : "";
      const res = await fetch(`/api/payroll?month=${month}&year=${year}${locationQuery}`);
      if (res.ok) {
        const data = await res.json();
        setIsCalculated(data.length > 0);
        setIsSaved(data.length > 0);
        setPayrolls(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [month, year, locationId]);

  const handleCalculate = async () => {
    setCalculating(true);
    setCalculateProgress(0);
    try {
      const locationQuery = locationId !== "all" ? `&locationId=${locationId}` : "";
      const empRes = await fetch(`/api/employees?status=Active:Working${locationQuery}`);
      if (!empRes.ok) throw new Error("Failed to fetch employees");
      const { employees } = await empRes.json();
      
      if (!employees || employees.length === 0) {
        toast.error("No active employees found to calculate payroll");
        setCalculating(false);
        return;
      }

      const employeeIds = employees.map((e: any) => e.id);
      const chunkSize = 15;
      const totalChunks = Math.ceil(employeeIds.length / chunkSize);
      let allCalculations: any[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const chunk = employeeIds.slice(i * chunkSize, (i + 1) * chunkSize);
        const res = await fetch(`/api/payroll/calculate?month=${month}&year=${year}&employeeIds=${chunk.join(",")}${locationQuery}`);
        
        if (res.ok) {
          const data = await res.json();
          allCalculations = [...allCalculations, ...data.calculations];
        } else {
          console.error("Failed to calculate batch", i);
        }
        
        setCalculateProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      setPayrolls(allCalculations);
      setIsCalculated(true);
      setIsSaved(false);
      toast.success("Payroll calculation completed for " + employees.length + " employees");
    } catch (err) {
      console.error(err);
      toast.error("Error calculating payroll");
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (isSaved) return;
    setSaving(true);
    try {
      const payload = payrolls.map(p => ({
        ...p,
        month: parseInt(month),
        year: parseInt(year),
        amount: p.netSalary,
        status: "Processed"
      }));
      
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        toast.success("Payroll approved successfully");
        setIsSaved(true);
        fetchPayrolls();
      } else {
        toast.error("Failed to approve payroll");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error approving payroll");
    } finally {
      setSaving(false);
    }
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return parseInt(month) === (now.getMonth() + 1) && parseInt(year) === now.getFullYear();
  }, [month, year]);
  
  const handleExportExcel = () => {
    if (filteredPayrolls.length === 0) {
      toast.error("No payroll data to export");
      return;
    }

    const exportData = filteredPayrolls.map(p => ({
      "Employee ID": p.empId || p.employee?.employeeId,
      "Employee Name": p.employeeName || p.employee?.employeeName,
      "Designation": p.designation || p.employee?.position,
      "Days Worked": p.daysWorked,
      "Basic Salary": p.basicSalary,
      "Basic Payable": p.basicPayable,
      "Attendance Allowance": p.attendanceAllowance || 0,
      "Daily Allowance": p.dailyAllowance || 0,
      "Fuel Allowance": p.fuelAllowance || 0,
      "Conveyance Allowance": p.conveyanceAllowance || 0,
      "Maintenance": p.maintainence || 0,
      "KPI Incentives": p.eachKpiIncentives || 0,
      "Category Incentive": p.categoryIncentive || 0,
      "Gross Salary": p.grossSalary,
      "EOBI": p.eobi || 0,
      "Social Security": p.socialSecurity || 0,
      "Tax": p.incomeTax || 0,
      "Advance Deduction": p.advance || 0,
      "Loan Installment": p.loan || 0,
      "Shortages": p.shortages || 0,
      "Total Deductions": p.totalDeduction,
      "Net Salary": p.netSalary,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, `Payroll_${month}_${year}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="relative group min-w-[150px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Search ID..." 
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="pl-9 h-10 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="relative group min-w-[150px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Designation..." 
              value={searchDesignation}
              onChange={(e) => setSearchDesignation(e.target.value)}
              className="pl-9 h-10 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
            <Button 
                onClick={handleExportExcel}
                disabled={filteredPayrolls.length === 0}
                variant="outline"
                className="border-[#0A192F] text-[#0A192F] hover:bg-[#0A192F] hover:text-white dark:border-slate-700 dark:text-slate-200"
            >
                <Download className="h-4 w-4 mr-2" />
                Export
            </Button>
            <Button 
                onClick={handleCalculate} 
                disabled={loading || saving || calculating || !isCurrentMonth} 
                variant="outline" 
                className="border-[#0A192F] text-[#0A192F] hover:bg-[#0A192F] hover:text-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
                {calculating ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                Calculate
            </Button>
            <Button 
                onClick={handleSave} 
                disabled={loading || saving || !isCalculated || !isCurrentMonth || isSaved || calculating} 
                className="bg-[#0A192F] hover:bg-[#162a45] dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-lg"
            >
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Approve Payroll
            </Button>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                  <TableHead className="sticky left-0 bg-slate-50 dark:bg-[#1E293B] z-10 min-w-[100px] border-r dark:border-slate-700">Actions</TableHead>
                  <TableHead className="min-w-[150px]">Location</TableHead>
                  <TableHead className="min-w-[100px]">EMP ID</TableHead>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead className="min-w-[150px]">Designation</TableHead>
                  <TableHead className="min-w-[150px]">Department</TableHead>
                  <TableHead className="min-w-[120px]">Basic Salary</TableHead>
                  <TableHead className="min-w-[100px]">Days Worked</TableHead>
                  <TableHead className="min-w-[120px]">Basic Payable</TableHead>
                  <TableHead className="min-w-[120px]">Att. Allow.</TableHead>
                  <TableHead className="min-w-[120px]">Daily Allow.</TableHead>
                  <TableHead className="min-w-[120px]">Fuel Allow.</TableHead>
                  <TableHead className="min-w-[120px]">Conv. Allow.</TableHead>
                  <TableHead className="min-w-[120px]">Maintenance</TableHead>
                  <TableHead className="min-w-[120px]">Commission</TableHead>
                  <TableHead className="min-w-[120px]">KPI Inc.</TableHead>
                  <TableHead className="min-w-[150px]">Cat. Incentive</TableHead>
                  <TableHead className="min-w-[120px]">Olpers Milk</TableHead>
                  <TableHead className="min-w-[120px]">Olpers Careem</TableHead>
                  <TableHead className="min-w-[120px]">Eid Inc.</TableHead>
                  <TableHead className="min-w-[120px]">Olpers 500ML</TableHead>
                  <TableHead className="min-w-[120px]">Incentives</TableHead>
                  <TableHead className="min-w-[120px]">Loaders Allow.</TableHead>
                  <TableHead className="min-w-[120px]">Total Inc.</TableHead>
                  <TableHead className="min-w-[120px] font-bold">Gross Salary</TableHead>
                  <TableHead className="min-w-[100px]">EOBI</TableHead>
                  <TableHead className="min-w-[100px]">S. Security</TableHead>
                  <TableHead className="min-w-[120px]">I.Tax Ded</TableHead>
                  <TableHead className="min-w-[100px]">Advance</TableHead>
                  <TableHead className="min-w-[100px]">Loan</TableHead>
                  <TableHead className="min-w-[120px]">Shortages</TableHead>
                  <TableHead className="min-w-[120px]">M. Credit</TableHead>
                  <TableHead className="min-w-[120px]">Total Ded.</TableHead>
                  <TableHead className="min-w-[120px] font-bold text-[#0A192F] dark:text-white">Net Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={8} className="h-48 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-300" />
                        </TableCell>
                    </TableRow>
                ) : filteredPayrolls.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} className="h-48 text-center text-slate-500">
                            {payrolls.length > 0 ? "No records match your filters." : "No records found for this period. Click Calculate to generate."}
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredPayrolls.map((p) => (
                      <TableRow key={p.id || p.employeeId} className="transition-colors">
                        <TableCell className="sticky left-0 bg-white dark:bg-[#1E293B] z-10 border-r dark:border-slate-700">
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setViewingSlip(p)}>
                                    <Printer className="h-4 w-4 text-slate-400 dark:text-white" />
                                </Button>
                            </div>
                        </TableCell>
                        <TableCell className="dark:text-slate-400">{p.locationName || p.employee?.location?.name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs dark:text-slate-300">{p.empId || p.employee?.employeeId}</TableCell>
                        <TableCell className="font-medium dark:text-slate-200">{p.employeeName || p.employee?.employeeName}</TableCell>
                        <TableCell className="dark:text-slate-400">{p.designation || p.employee?.position}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-300">{p.department || p.employee?.department}</Badge>
                        </TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.basicSalary)}</TableCell>
                        <TableCell className="text-center dark:text-slate-300">{p.daysWorked}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.basicPayable)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.attendanceAllowance)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.dailyAllowance)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.fuelAllowance)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.conveyanceAllowance)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.maintainence)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.comission)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.eachKpiIncentives)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.categoryIncentive)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.olpersMilk)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.olpersCareem)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.eidIncentive)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.olpers500ml)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.incentives)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.loadersAllowance)}</TableCell>
                        <TableCell className="font-semibold dark:text-slate-200">{formatCurrency(p.totalIncentives)}</TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(p.grossSalary)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.eobi)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.socialSecurity)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.incomeTax)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.advance)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.loan)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.shortages)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.marketCredit)}</TableCell>
                        <TableCell className="font-semibold text-red-600 dark:text-red-500">{formatCurrency(p.totalDeduction)}</TableCell>
                        <TableCell className="font-bold text-[#0A192F] dark:text-blue-400 bg-slate-50/50 dark:bg-slate-800/50">{formatCurrency(p.netSalary)}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {viewingSlip && (
          <Dialog open={!!viewingSlip} onOpenChange={(o) => !o && setViewingSlip(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                      <DialogTitle>Salary Slip Preview</DialogTitle>
                      <DialogDescription>
                          Viewing salary slip for {viewingSlip.employeeName || viewingSlip.employee?.employeeName} - {currentMonthName} {year}
                      </DialogDescription>
                  </DialogHeader>
                  <div className="py-4" ref={contentRef}>
                      <SalarySlip payroll={viewingSlip} month={month} year={year} />
                  </div>
                  <DialogFooter className="sticky bottom-0 bg-white dark:bg-[#1E293B] pt-4 border-t dark:border-slate-700">
                      <Button onClick={() => handlePrint()} className="bg-[#0A192F] hover:bg-[#162a45]">
                          <Printer className="mr-2 h-4 w-4" />
                          Print Slip
                      </Button>
                      <Button variant="outline" onClick={() => setViewingSlip(null)} className="dark:border-slate-700 dark:text-slate-200">Close</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      )}

      {/* Calculation Progress Dialog */}
      <Dialog open={calculating} onOpenChange={() => {}}>
          <DialogContent className="max-w-md text-center py-12 bg-white dark:bg-[#1E293B] border-none shadow-2xl">
              <div className="space-y-6">
                  <div className="flex justify-center">
                      <div className="relative">
                          <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                          <div className="absolute inset-0 flex items-center justify-center font-bold text-xs dark:text-white">
                              {calculateProgress}%
                          </div>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <h3 className="text-xl font-bold text-[#0A192F] dark:text-white">Calculating Payroll...</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Processing salary, deductions, and incentives batches.</p>
                  </div>
                  <Progress value={calculateProgress} className="h-2 w-full bg-slate-100 dark:bg-slate-800" />
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Hold tight, almost there!</p>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
