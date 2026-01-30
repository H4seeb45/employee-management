"use client";

import { Loader2, Plus, Search, FileText, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
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

function formatDate(dt: string | null) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dt as string;
  }
}

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [amount, setAmount] = useState<string>("");
  const [employeeId, setEmployeeId] = useState("");
  const [paidAt, setPaidAt] = useState<string>("");
  const [status, setStatus] = useState("Paid");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [viewing, setViewing] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch("/api/payroll").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/employees").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([payrollData, employeeData]) => {
        if (!mounted) return;
        setPayrolls(Array.isArray(payrollData) ? payrollData : []);
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        employeeId,
        amount: parseFloat(amount) || 0,
        paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        status,
        notes,
      };
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      if (res.ok) {
        setPayrolls((prev) => [created, ...prev]);
        setAmount("");
        setNotes("");
        setStatus("Paid");
        setPaidAt("");
        setEmployeeId("");
        setIsDialogOpen(false);
      } else {
        console.error("Create payroll failed", created);
        alert(created?.error || "Failed to create payroll");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create payroll");
    } finally {
        setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
        case 'paid': return 'bg-green-100 text-green-700 hover:bg-green-100';
        case 'pending': return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
        case 'failed': return 'bg-red-100 text-red-700 hover:bg-red-100';
        default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0A192F]">Payroll Management</h1>
          <p className="text-slate-500">Manage disbursement and salary records.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0A192F] hover:bg-[#162a45] text-white">
              <Plus className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>
                Enter the payment details below.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.employeeName ?? emp.employeeId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (PKR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>
              <div className="space-y-2">
                <Label>Date Paid</Label>
                <Input
                  type="datetime-local"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="e.g. Monthly Salary, Bonus..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <DialogFooter>
                  <Button type="submit" disabled={submitting} className="w-full bg-[#0A192F] hover:bg-[#162a45]">
                      {submitting ? "Recording..." : "Save Record"}
                  </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B]">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
             <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : payrolls.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
               No payroll records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="w-[250px] uppercase text-xs font-semibold tracking-wider text-slate-500">Employee</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500">Amount</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500">Paid At</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="text-right uppercase text-xs font-semibold tracking-wider text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setViewing(p)}>
                    <TableCell className="font-medium text-slate-700">
                      {p.employee?.employeeName ?? p.employeeId}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">
                        {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(p.amount)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                        {formatDate(p.paidAt)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(p.status ?? 'pending')} variant="secondary">
                        {p.status ?? 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription className="font-mono text-xs">ID: {viewing.id}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-slate-500 block mb-1">Employee</span>
                        <span className="font-medium">{viewing.employee?.employeeName ?? viewing.employeeId}</span>
                    </div>
                    <div>
                         <span className="text-slate-500 block mb-1">Amount</span>
                         <span className="font-bold text-xl text-[#0A192F]">
                            {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(viewing.amount)}
                         </span>
                    </div>
                    <div>
                        <span className="text-slate-500 block mb-1">Date</span>
                        <span>{formatDate(viewing.paidAt)}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block mb-1">Status</span>
                        <Badge className={getStatusColor(viewing.status)}>{viewing.status}</Badge>
                    </div>
                    <div className="col-span-2">
                        <span className="text-slate-500 block mb-1">Notes</span>
                        <p className="bg-slate-50 p-2 rounded text-slate-700">{viewing.notes || "No notes provided."}</p>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <div className="flex w-full sm:justify-between gap-2">
                    <Button variant="outline" className="w-full sm:w-auto" disabled>
                        <FileText className="mr-2 h-4 w-4" /> Download Slip
                    </Button>
                    <Button onClick={() => setViewing(null)} className="w-full sm:w-auto bg-slate-200 text-slate-800 hover:bg-slate-300">
                        Close
                    </Button>
                </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      </AnimatePresence>
    </div>
  );
}
