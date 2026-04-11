"use client";

import { Loader2, Plus, Download, MoreHorizontal, FileText, Check, X, HandCoins, Pencil, FileUp } from "lucide-react";
import { useEffect, useState, useRef } from "react";
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
  const [notes, setNotes] = useState("");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isAdmin = currentUser?.roles?.includes("Admin") || currentUser?.roles?.includes("Super Admin");
  const isCashier = currentUser?.roles?.includes("Cashier");
  const isEmployee = currentUser?.roles?.includes("Employee");
  const isBusinessManager = currentUser?.roles?.includes("Business Manager");
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<any>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrincipal, setEditPrincipal] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
    setSelectedAdvance(adv);
    setEditId(adv.id);
    setEditPrincipal(adv.principalAmount?.toString() || "");
    setEditNotes(adv.notes || "");
    setIsEditOpen(true);
  };

  const getEmployeeHistory = (empId: string, currentId: string) => {
    return advances.filter(a => a.employeeId === empId && a.id !== currentId);
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
    // 1. Month Filter
    if (dateFilter) {
      if (!adv.issuedAt || !adv.issuedAt.startsWith(dateFilter)) return false;
    }

    // 2. Search Filter (Admin/BM only) - matches EMP ID, Name, or Position
    if ((isAdmin || isBusinessManager) && searchQuery) {
      const q = searchQuery.toLowerCase();
      const emp = adv.employee;
      const idStr = String(emp?.employeeId || "").toLowerCase();
      const nameStr = String(emp?.employeeName || "").toLowerCase();
      const posStr = String(emp?.position || "").toLowerCase();

      if (!idStr.includes(q) && !nameStr.includes(q) && !posStr.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const exportToExcel = () => {
    if (filteredAdvances.length === 0) {
      toast({ title: "Export Error", description: "No records to export.", variant: "destructive" });
      return;
    }

    const headers = ["Employee ID", "Employee Name", "Principal Amount", "Balance", "Issued Date", "Notes", "Status"];
    const rows = filteredAdvances.map(adv => [
      adv.employee?.employeeId || "-",
      adv.employee?.employeeName || "Unknown Employee",
      adv.principalAmount || 0,
      adv.balance || 0,
      formatDate(adv.issuedAt),
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

  const handleDownloadTemplate = () => {
    const headers = ["Employee ID", "Principal Amount", "Issued Date (YYYY-MM-DD)", "Status", "Notes"];
    const exampleRow = ["EMP-001", "10000", "2024-01-01", "Approved", "Family event"];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Advances Template");
    XLSX.writeFile(wb, "Advances_Import_Template.xlsx");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];

        if (jsonData.length === 0) {
          toast({ title: "Error", description: "The template is empty.", variant: "destructive" });
          setImporting(false);
          return;
        }

        const mappedData = jsonData.map((row) => ({
          employeeIdReadable: String(row["Employee ID"] || ""),
          principalAmount: parseFloat(row["Principal Amount"]) || 0,
          issuedAt: row["Issued Date (YYYY-MM-DD)"] || null,
          status: row["Status"] || "Approved",
          notes: row["Notes"] || "",
        }));

        const res = await fetch("/api/advances/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ advances: mappedData }),
        });

        const result = await res.json();
        if (res.ok && result.success) {
          toast({ 
            title: "Import Complete", 
            description: `Successfully imported ${result.count} advances. ${result.errors?.length ? `Failed: ${result.errors.length}.` : ''}` 
          });
          setImportDialogOpen(false);
          fetchRecords();
        } else {
          toast({ title: "Import Error", description: result.message || "Failed to import advances.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to parse the Excel file.", variant: "destructive" });
      } finally {
        setImporting(false);
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Advances Management</h1>
          <p className="text-slate-500">Record and manage short-term employee advances.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mr-2">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Month:</Label>
            <Input 
              type="month" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-8 w-[150px] border-0 focus-visible:ring-0 bg-transparent p-0"
            />
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter("")} className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {(isAdmin || isBusinessManager) && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm grow sm:max-w-xs">
              <Input 
                placeholder="Search EMP ID, Name, Designation..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 border-0 focus-visible:ring-0 bg-transparent p-2 placeholder:text-slate-400 text-sm"
              />
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" className="flex items-center gap-2 bg-transparent border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20" onClick={() => setImportDialogOpen(true)}>
              <FileUp className="h-4 w-4" /> Import
            </Button>
          )}
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

                {employeeId && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">EMP ID</Label>
                      <Input 
                        value={employees.find(e => e.id === employeeId)?.employeeId || "-"} 
                        readOnly
                        disabled 
                        className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-500">Designation</Label>
                      <Input 
                        value={employees.find(e => e.id === employeeId)?.position || "N/A"} 
                        readOnly
                        disabled 
                        className="h-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-sm"
                      />
                    </div>
                  </div>
                )}
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
                  <Label>Notes</Label>
                  <Input
                    placeholder="e.g. Medical emergency..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    required
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
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{(isAdmin || isBusinessManager) && selectedAdvance?.status === "Submitted" ? "Review & Edit Advance" : "Edit Advance Record"}</DialogTitle>
                <DialogDescription>Review employee's previous history and modify details if needed.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md border text-sm font-medium">
                      {selectedAdvance?.employee?.employeeName || "Unknown"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Advance Amount (PKR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editPrincipal}
                      onChange={(e) => setEditPrincipal(e.target.value)}
                      required
                      disabled={selectedAdvance?.status !== "Submitted"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      placeholder="e.g. Medical emergency..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      required
                      disabled={selectedAdvance?.status !== "Submitted"}
                    />
                  </div>
                  <div className="flex gap-2">
                    {selectedAdvance?.status === "Submitted" && (isAdmin || isBusinessManager) && (
                      <Button type="submit" disabled={savingEdit} className="flex-1 bg-amber-600 hover:bg-amber-700">
                        {savingEdit ? <Loader2 className="h-4 w-4 animate-spin"/> : "Update Record"}
                      </Button>
                    )}
                    {selectedAdvance?.status === "Submitted" && isAdmin && (
                      <Button 
                        type="button" 
                        variant="default" 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={savingEdit}
                        onClick={async () => {
                          setSavingEdit(true);
                          await handleStatusUpdate(selectedAdvance.id, "Approved");
                          setIsEditOpen(false);
                          setSavingEdit(false);
                        }}
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                </form>

                <div className="space-y-4 border-l pl-6">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Employee History
                  </h3>
                  <div className="space-y-3">
                    {getEmployeeHistory(selectedAdvance?.employeeId, selectedAdvance?.id).length > 0 ? (
                      getEmployeeHistory(selectedAdvance?.employeeId, selectedAdvance?.id).slice(0, 5).map((prevAdv: any) => (
                        <div key={prevAdv.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 text-xs">
                          <div className="flex justify-between font-medium mb-1">
                            <span>{formatDate(prevAdv.issuedAt)}</span>
                            <span className={
                              prevAdv.status === 'Approved' ? 'text-emerald-600' :
                              prevAdv.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'
                            }>{prevAdv.status || "Submitted"}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Principal: {new Intl.NumberFormat('en-PK').format(prevAdv.principalAmount)}</span>
                            <span>Bal: {new Intl.NumberFormat('en-PK').format(prevAdv.balance)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No previous records found.</p>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle>Bulk Import Advances</DialogTitle></DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
                  <p className="mb-2"><strong>Step 1:</strong> Download the template and fill it out.</p>
                  <p><strong>Step 2:</strong> Upload the completed file to bulk import records. Statuses: Submitted, Approved, Rejected, Disbursed.</p>
                </div>
                <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                  <Download className="h-4 w-4 mr-2" /> Download Template
                </Button>
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</> : <><FileUp className="h-4 w-4 mr-2" /> Upload Excel File</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isEmployee && advances.filter(a => a.status !== "Rejected" && a.issuedAt?.startsWith(new Date().toISOString().slice(0, 7))).length > 0 && (() => {
        const latestAdv = advances.filter(a => a.status !== "Rejected" && a.issuedAt?.startsWith(new Date().toISOString().slice(0, 7)))[0];
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Advance Amount (This Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(latestAdv.principalAmount)}</div>
                <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">Status: {latestAdv.status || "Submitted"}</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {(isAdmin || isBusinessManager) && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredAdvances.filter(a => a.status === "Submitted" || !a.status).length}</div>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">Awaiting review</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600 dark:text-purple-400">Loan Issued</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(
                  filteredAdvances.filter(a => a.status === "Approved" || a.status === "Disbursed")
                    .reduce((sum, a) => sum + (a.principalAmount || 0), 0)
                )}
              </div>
              <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">Direct salary deductions</p>
            </CardContent>
          </Card>
          <Card className="bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-sky-600 dark:text-sky-400">Total Active Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(
                  filteredAdvances.filter(a => a.status !== "Rejected").reduce((sum, a) => sum + (a.balance || 0), 0)
                )}
              </div>
              <p className="text-xs text-sky-600/80 dark:text-sky-400/80 mt-1">Total outstanding advances</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B]">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">Advances History</CardTitle>
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
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Date</TableHead>
                  {isAdmin && (
                    <>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">EMP ID</TableHead>
                    </>
                  )}
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">EMP Name</TableHead>
                  {isAdmin && (
                    <>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Designation</TableHead>
                    </>
                  )}
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Advance Requested</TableHead>
                  {isAdmin && (
                    <>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Advance Balance</TableHead>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Loan Balance</TableHead>
                    </>
                  )}
                  {!isAdmin && (
                    <>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Balance</TableHead>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Notes</TableHead>
                    </>
                  )}
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Status</TableHead>
                  
                  {(isAdmin || isCashier) && (<TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdvances.map((adv) => (
                  <TableRow key={adv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-800">
                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                      {formatDate(adv.issuedAt)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                        {adv.employee?.employeeId ?? "-"}
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                      {adv.employee?.employeeName ?? adv.employeeId}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                        {adv.employee?.position ?? "-"}
                      </TableCell>
                    )}
                    <TableCell className="font-bold text-slate-700 dark:text-slate-200">
                      {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(adv.principalAmount)}
                    </TableCell>
                    {isAdmin && (
                      <>
                        <TableCell className="font-semibold text-amber-600 dark:text-amber-500">
                           {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(adv.totalAdvanceBalance ?? 0)}
                        </TableCell>
                        <TableCell className="font-semibold text-rose-600 dark:text-rose-500">
                           {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(adv.loanBalance ?? 0)}
                        </TableCell>
                      </>
                    )}
                    {!isAdmin && (
                      <>
                        <TableCell className="font-semibold text-amber-600 dark:text-amber-500">
                          {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(adv.balance)}
                        </TableCell>
                        <TableCell className="text-slate-500 dark:text-slate-400 text-sm truncate max-w-[150px]">
                          {adv.notes || "-"}
                        </TableCell>
                      </>
                    )}
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
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" onClick={() => openEdit(adv)} title="Review & Approve">
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
