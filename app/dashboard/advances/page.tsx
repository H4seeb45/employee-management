"use client";

import { Loader2, Plus, Download, MoreHorizontal, FileText, Check, X, HandCoins, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(dt: string | null) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleDateString("en-US", {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch {
    return dt as string;
  }
}

export default function AdvancesPage() {
  const { toast } = useToast();
  const [advances, setAdvances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [employeeId, setEmployeeId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isAdmin = currentUser?.roles?.includes("Admin") || currentUser?.roles?.includes("Super Admin");
  const isCashier = currentUser?.roles?.includes("Cashier") || currentUser?.roles?.includes("Accountant");
  const isEmployee = currentUser?.roles?.includes("Employee");
  const isBusinessManager = currentUser?.roles?.includes("Business Manager");
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrincipal, setEditPrincipal] = useState<string>("");
  const [editDueAt, setEditDueAt] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const fetchRecords = async () => {
    try {
      const [advanceData, employeeData, authData] = await Promise.all([
        fetch("/api/advances", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
        fetch("/api/employees", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
        fetch("/api/auth/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { user: null })),
      ]);
      setAdvances(Array.isArray(advanceData) ? advanceData : []);
      setEmployees(Array.isArray(employeeData?.employees) ? (employeeData as any).employees : []);
      setCurrentUser(authData?.user || null);
      if (authData?.user?.employeeId && !authData.user.roles.includes("Admin") && !authData.user.roles.includes("Super Admin")) {
        setEmployeeId(authData.user.employeeId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        employeeId,
        principalAmount: parseFloat(principalAmount) || 0,
        balance: parseFloat(principalAmount) || 0,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        issuedAt: new Date().toISOString(), // defaulting issuedAt to now
        notes,
      };
      const res = await fetch("/api/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      if (res.ok) {
        setAdvances((prev) => [created, ...prev]);
        setPrincipalAmount("");
        setDueAt("");
        setNotes("");
        setEmployeeId("");
        setIsDialogOpen(false);
        toast({ title: "Advance Recorded", description: "The advance has been successfully recorded." });
        fetchRecords();
      } else {
        toast({ title: "Error", description: created?.error || "Failed to create advance", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to create advance", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/advances/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({ title: "Status Updated", description: `Advance has been marked as ${newStatus}.`});
        fetchRecords();
      } else {
        const error = await res.json();
        toast({ title: "Update Failed", description: error.error || "Could not update status", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const openEdit = (adv: any) => {
    setEditId(adv.id);
    setEditPrincipal(adv.principalAmount?.toString() || "");
    setEditDueAt(adv.dueAt ? new Date(adv.dueAt).toISOString().split('T')[0] : "");
    setEditNotes(adv.notes || "");
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        principalAmount: parseFloat(editPrincipal) || 0,
        notes: editNotes,
      };
      if (editDueAt) payload.dueAt = new Date(editDueAt).toISOString();
      
      const res = await fetch(`/api/advances/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Advance details have been updated successfully." });
        setIsEditOpen(false);
        fetchRecords();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to update advance", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unexpected error during update", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredAdvances = advances.filter((adv) => {
    if (!dateFilter) return true;
    if (!adv.issuedAt) return false;
    return adv.issuedAt.startsWith(dateFilter);
  });

  const exportToExcel = () => {
    if (filteredAdvances.length === 0) {
      toast({ title: "Export Error", description: "No records to export.", variant: "destructive" });
      return;
    }

    const headers = ["Employee ID", "Employee Name", "Principal Amount", "Balance", "Issued Date", "Due Date", "Notes", "Status"];
    const rows = filteredAdvances.map(adv => [
      adv.employee?.employeeId || "-",
      adv.employee?.employeeName || "Unknown Employee",
      adv.principalAmount || 0,
      adv.balance || 0,
      formatDate(adv.issuedAt),
      formatDate(adv.dueAt),
      adv.notes || "",
      adv.status || "Submitted"
    ]);

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Advances");

    XLSX.writeFile(wb, "Employee_Advances_Report.xlsx");
    toast({ title: "Export Successful", description: "Advances export is downloading." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advances Management</h1>
          <p className="text-slate-500">Record and manage short-term employee advances.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-transparent border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-500" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          {isEmployee && <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Apply Advance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Record New Advance</DialogTitle>
                <DialogDescription>
                  Enter the advance details below. Max 25% of basic salary, eligible after 3 months.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId} required disabled={!isAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(employees) && employees.filter((emp) => isAdmin || emp.id === currentUser?.employeeId).map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.employeeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Advances Amount (PKR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input
                    placeholder="e.g. Medical emergency..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="w-full bg-purple-600 hover:bg-purple-700">
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Save Advance Record"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>}

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Advance Record</DialogTitle>
                <DialogDescription>Modify the submitted advance details.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Advance Amount (PKR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editPrincipal}
                    onChange={(e) => setEditPrincipal(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={editDueAt}
                    onChange={(e) => setEditDueAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input
                    placeholder="e.g. Medical emergency..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={savingEdit} className="w-full bg-amber-600 hover:bg-amber-700">
                    {savingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Updating...</> : "Update Record"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B]">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">Advances History</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">Filter by Month:</Label>
            <Input 
              type="month" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto dark:bg-slate-800"
            />
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter("")} className="text-slate-500 dark:text-slate-400">
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No advance records found for the selected criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <TableHead className="w-[250px] uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Employee</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Principal</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Balance</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Issued</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Due At</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Notes</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Status</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdvances.map((adv) => (
                  <TableRow key={adv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-800">
                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                      {adv.employee?.employeeName ?? adv.employeeId}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700 dark:text-slate-200">
                      {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(adv.principalAmount)}
                    </TableCell>
                    <TableCell className="font-semibold text-amber-600 dark:text-amber-500">
                      {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(adv.balance)}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                      {formatDate(adv.issuedAt)}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                      {formatDate(adv.dueAt)}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm truncate max-w-[150px]">
                      {adv.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        adv.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                        adv.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                        adv.status === 'Disbursed' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
                      }`}>
                        {adv.status || "Submitted"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1 flex-wrap">
                         {(adv.status === "Submitted" || !adv.status) && isAdmin && (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" onClick={() => handleStatusUpdate(adv.id, "Approved")} title="Approve">
                                <Check className="h-4 w-4" /><span className="sr-only">Approve</span>
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => handleStatusUpdate(adv.id, "Rejected")} title="Reject">
                                <X className="h-4 w-4" /><span className="sr-only">Reject</span>
                              </Button>
                            </>
                         )}
                         {(adv.status === "Submitted" || !adv.status) && (isAdmin || isBusinessManager) && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30" onClick={() => openEdit(adv)} title="Edit">
                                <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
                            </Button>
                         )}
                         {adv.status === "Approved" && isCashier && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30" onClick={() => handleStatusUpdate(adv.id, "Disbursed")} title="Disburse">
                                <HandCoins className="h-4 w-4" /><span className="sr-only">Disburse</span>
                            </Button>
                         )}
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
