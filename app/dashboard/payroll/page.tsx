"use client";

import { Loader2, Plus, Search, FileText, MoreHorizontal, Download, Printer, Calculator, Save } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { toast } from "sonner";
import { SalarySlip } from "@/components/payroll/salary-slip";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
}

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [month, setMonth] = useState<string>(new Date().getMonth() + 1 + "");
  const [year, setYear] = useState<string>(new Date().getFullYear() + "");
  
  const [isCalculated, setIsCalculated] = useState(false);
  const [viewingSlip, setViewingSlip] = useState<any | null>(null);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentMonthName = useMemo(() => {
    const m = parseInt(month);
    if (isNaN(m) || m < 1 || m > 12) return "-";
    return new Date(0, m - 1).toLocaleString('default', { month: 'long' });
  }, [month]);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setPayrolls(data);
        setIsCalculated(data.length > 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [month, year]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const res = await fetch(`/api/payroll/calculate?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setPayrolls(data.calculations);
        setIsCalculated(true);
        toast.success("Payroll calculated for " + month + "/" + year);
      } else {
        toast.error("Failed to calculate payroll");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error calculating payroll");
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
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
        toast.success("Payroll saved successfully");
        fetchPayrolls();
      } else {
        toast.error("Failed to save payroll");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving payroll");
    } finally {
      setSaving(false);
    }
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return parseInt(month) === now.getMonth() + 1 && parseInt(year) === now.getFullYear();
  }, [month, year]);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0A192F] dark:text-white">Payroll Management</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isCurrentMonth 
              ? "Calculate and manage monthly employee payroll." 
              : `Viewing archived payroll for ${currentMonthName} ${year}. Calculations are disabled.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[120px]">
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
            <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    {[2024, 2025, 2026].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button 
                onClick={handleCalculate} 
                disabled={calculating || !isCurrentMonth} 
                variant="outline" 
                className="border-[#0A192F] text-[#0A192F] hover:bg-[#0A192F] hover:text-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
                {calculating ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                Calculate
            </Button>
            <Button 
                onClick={handleSave} 
                disabled={saving || !isCalculated || !isCurrentMonth} 
                className="bg-[#0A192F] hover:bg-[#162a45] dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
            >
                {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Payroll
            </Button>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B]">
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
                  <TableHead className="min-w-[120px]">Incentives</TableHead>
                  <TableHead className="min-w-[120px]">Loaders Allow.</TableHead>
                  <TableHead className="min-w-[120px]">Total Inc.</TableHead>
                  <TableHead className="min-w-[120px] font-bold">Gross Salary</TableHead>
                  <TableHead className="min-w-[100px]">EOBI</TableHead>
                  <TableHead className="min-w-[100px]">S. Security</TableHead>
                  <TableHead className="min-w-[120px]">I.Tax Ded</TableHead>
                  <TableHead className="min-w-[100px]">Advance</TableHead>
                  <TableHead className="min-w-[100px]">Loan</TableHead>
                  <TableHead className="min-w-[120px]">Total Ded.</TableHead>
                  <TableHead className="min-w-[120px] font-bold text-[#0A192F] dark:text-white">Net Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={27} className="h-48 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-300" />
                        </TableCell>
                    </TableRow>
                ) : payrolls.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={27} className="h-48 text-center text-slate-500">
                            No records found for this period. Click Calculate to generate.
                        </TableCell>
                    </TableRow>
                ) : (
                    payrolls.map((p) => (
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
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.incentives)}</TableCell>
                        <TableCell className="dark:text-slate-300">{formatCurrency(p.loadersAllowance)}</TableCell>
                        <TableCell className="font-semibold dark:text-slate-200">{formatCurrency(p.totalIncentives)}</TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(p.grossSalary)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.eobi)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.socialSecurity)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.incomeTax)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.advance)}</TableCell>
                        <TableCell className="text-red-500 dark:text-red-400">{formatCurrency(p.loan)}</TableCell>
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
    </div>
  );
}
