"use client";

import { Loader2, Plus, Download, MoreHorizontal, FileText, Check, X, HandCoins, Pencil, FileUp, Printer } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
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
import { DisburseVoucher } from "@/components/reports/disburse-voucher";

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

export default function LoansPage() {
  const { toast } = useToast();
  const [loans, setLoans] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [employeeId, setEmployeeId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState<string>("");
  const [installments, setInstallments] = useState<string>("");
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
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrincipal, setEditPrincipal] = useState<string>("");
  const [editInstallments, setEditInstallments] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [printingLoan, setPrintingLoan] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });
  const fetchRecords = async () => {
    try {
      const [loanData, employeeData, authData] = await Promise.all([
        fetch("/api/loans", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
        fetch("/api/employees", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
        fetch("/api/auth/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { user: null })),
      ]);
      setLoans(Array.isArray(loanData) ? loanData : []);
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

  useEffect(() => {
    console.log(employees)
  }, [employees]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        employeeId,
        principalAmount: parseFloat(principalAmount) || 0,
        balance: parseFloat(principalAmount) || 0,
        installments: parseInt(installments) || 0,
        issuedAt: new Date().toISOString(), // defaulting issuedAt to now
        notes,
      };
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      if (res.ok) {
        setLoans((prev) => [created, ...prev]);
        setPrincipalAmount("");
        setInstallments("");
        setNotes("");
        setEmployeeId("");
        setIsDialogOpen(false);
        toast({ title: "Loan Recorded", description: "The loan has been successfully recorded." });
        fetchRecords();
      } else {
        toast({ title: "Error", description: created?.error || "Failed to create loan", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to create loan", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/loans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({ title: "Status Updated", description: `Loan has been marked as ${newStatus}.`});
        fetchRecords();
      } else {
        const error = await res.json();
        toast({ title: "Update Failed", description: error.error || "Could not update status", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const openEdit = (loan: any) => {
    setSelectedLoan(loan);
    setEditId(loan.id);
    setEditPrincipal(loan.principalAmount?.toString() || "");
    setEditInstallments(loan.installments?.toString() || "");
    setEditNotes(loan.notes || "");
    setIsEditOpen(true);
  };

  const getEmployeeHistory = (empId: string, currentId: string) => {
    return loans.filter(l => l.employeeId === empId && l.id !== currentId);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        principalAmount: parseFloat(editPrincipal) || 0,
        installments: parseInt(editInstallments) || 0,
        notes: editNotes,
      };
      
      const res = await fetch(`/api/loans/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast({ title: "Updated", description: "Loan details have been updated successfully." });
        setIsEditOpen(false);
        fetchRecords();
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to update loan", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Unexpected error during update", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredLoans = loans.filter((l) => {
    // 1. Month Filter
    if (dateFilter) {
      if (!l.issuedAt || !l.issuedAt.startsWith(dateFilter)) return false;
    }

    // 2. Search Filter (Admin/BM only) - matches EMP ID, Name, or Position
    if ((isAdmin || isBusinessManager) && searchQuery) {
      const q = searchQuery.toLowerCase();
      const emp = l.employee;
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
    if (filteredLoans.length === 0) {
      toast({ title: "Export Error", description: "No records to export.", variant: "destructive" });
      return;
    }

    const headers = ["Employee ID", "Employee Name", "Principal Amount", "Balance", "Installments", "Issued Date", "Notes", "Status"];
    const rows = filteredLoans.map(loan => [
      loan.employee?.employeeId || "-",
      loan.employee?.employeeName || "Unknown Employee",
      loan.principalAmount || 0,
      loan.balance || 0,
      loan.installments || 0,
      formatDate(loan.issuedAt),
      loan.notes || "",
      loan.status || "Submitted"
    ]);

    const worksheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loans");

    XLSX.writeFile(wb, "Employee_Loans_Report.xlsx");
    toast({ title: "Export Successful", description: "Loans export is downloading." });
  };

  const handleDownloadTemplate = () => {
    const headers = ["Employee ID", "Principal Amount", "Installments", "Issued Date (YYYY-MM-DD)", "Balance", "Status", "Reason"];
    const exampleRow = ["EMP-001", "50000", "12", "2024-01-01", "50000", "Approved", "Emergency loan"];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loans Template");
    XLSX.writeFile(wb, "Loans_Import_Template.xlsx");
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
          installments: parseInt(row["Installments"]) || 0,
          issuedAt: row["Issued Date (YYYY-MM-DD)"] || null,
          balance: parseFloat(row["Balance"]) || undefined,
          status: row["Status"] || "Approved",
          notes: row["Notes"] || "",
        }));

        const res = await fetch("/api/loans/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loans: mappedData }),
        });

        const result = await res.json();
        if (res.ok && result.success) {
          toast({ 
            title: "Import Complete", 
            description: `Successfully imported ${result.count} loans. ${result.errors?.length ? `Failed: ${result.errors.length}.` : ''}` 
          });
          setImportDialogOpen(false);
          fetchRecords();
        } else {
          toast({ title: "Import Error", description: result.message || "Failed to import loans.", variant: "destructive" });
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Loans Management</h1>
          <p className="text-slate-500">Record and manage employee long-term loans.</p>
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
            <Button variant="outline" className="flex items-center gap-2 bg-transparent border-sky-600 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20" onClick={() => setImportDialogOpen(true)}>
              <FileUp className="h-4 w-4" /> Import
            </Button>
          )}
          <Button variant="outline" className="bg-transparent border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-500" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
         {isEmployee && <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-sky-600 hover:bg-sky-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Apply Loan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Record New Loan</DialogTitle>
                <DialogDescription>
                  Enter the loan details below. Max 2 base salaries, eligible after 1 year of employment.
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
                  <Label>Amount (PKR)</Label>
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
                  <Label>Monthly Installments</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 12"
                    value={installments}
                    onChange={(e) => setInstallments(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    placeholder="e.g. Housing purchase..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="w-full bg-sky-600 hover:bg-sky-700">
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Save Loan Record"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>}

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{(isAdmin || isBusinessManager) && selectedLoan?.status === "Submitted" ? "Review & Edit Loan" : "Edit Loan Record"}</DialogTitle>
                <DialogDescription>Review employee's previous history and modify details if needed.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md border text-sm font-medium">
                      {selectedLoan?.employee?.employeeName || "Unknown"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Principal Amount (PKR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={editPrincipal}
                      onChange={(e) => setEditPrincipal(e.target.value)}
                      required
                      disabled={selectedLoan?.status !== "Submitted"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Installments</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 12"
                      value={editInstallments}
                      onChange={(e) => setEditInstallments(e.target.value)}
                      required
                      disabled={selectedLoan?.status !== "Submitted"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      placeholder="e.g. Housing purchase..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      required
                      disabled={selectedLoan?.status !== "Submitted"}
                    />
                  </div>
                  <div className="flex gap-2">
                    {selectedLoan?.status === "Submitted" && (isAdmin || isBusinessManager) && (
                      <Button type="submit" disabled={savingEdit} className="flex-1 bg-amber-600 hover:bg-amber-700">
                        {savingEdit ? <Loader2 className="h-4 w-4 animate-spin"/> : "Update Record"}
                      </Button>
                    )}
                    {selectedLoan?.status === "Submitted" && isAdmin && (
                      <Button 
                        type="button" 
                        variant="default" 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={savingEdit}
                        onClick={
                          async () => {
                          setSavingEdit(true);
                          await handleStatusUpdate(selectedLoan.id, "Approved");
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
                    {getEmployeeHistory(selectedLoan?.employeeId, selectedLoan?.id).length > 0 ? (
                      getEmployeeHistory(selectedLoan?.employeeId, selectedLoan?.id).slice(0, 5).map((prevLoan: any) => (
                        <div key={prevLoan.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 text-xs">
                          <div className="flex justify-between font-medium mb-1">
                            <span>{formatDate(prevLoan.issuedAt)}</span>
                            <span className={
                              prevLoan.status === 'Approved' ? 'text-emerald-600' :
                              prevLoan.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'
                            }>{prevLoan.status || "Submitted"}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Principal: {new Intl.NumberFormat('en-PK').format(prevLoan.principalAmount)}</span>
                            <span>Bal: {new Intl.NumberFormat('en-PK').format(prevLoan.balance)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">No previous loan records found.</p>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle>Bulk Import Loans</DialogTitle></DialogHeader>
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
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white" 
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

      {isEmployee && loans.filter(l => l.status !== "Rejected").length > 0 && (() => {
        const latestLoan = loans.filter(l => l.status !== "Rejected")[0];
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-sky-600 dark:text-sky-400">Current Loan Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(latestLoan.principalAmount)}</div>
                <p className="text-xs text-sky-600/80 dark:text-sky-400/80 mt-1">Status: {latestLoan.status || "Submitted"}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Remaining Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(latestLoan.balance)}</div>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">To be recovered in installments</p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total Installments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{latestLoan.installments || 0} Months</div>
                <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1">Issued on {formatDate(latestLoan.issuedAt)}</p>
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
              <div className="text-2xl font-bold">{filteredLoans.filter(l => l.status === "Submitted" || !l.status).length}</div>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">Awaiting review</p>
            </CardContent>
          </Card>
          <Card className="bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-sky-600 dark:text-sky-400">Total Active Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(
                  filteredLoans.filter(l => l.status === "Approved" || l.status === "Disbursed").reduce((sum, l) => sum + (l.balance || 0), 0)
                )}
              </div>
              <p className="text-xs text-sky-600/80 dark:text-sky-400/80 mt-1">Total outstanding loans</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Loan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(
                  filteredLoans.filter(l => l.status !== "Rejected").reduce((sum, l) => sum + (l.principalAmount || 0), 0)
                )}
              </div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">Overall loan volume</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B]">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">Loans History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No loan records found for the selected criteria.
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
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Loan Requested</TableHead>
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Installments</TableHead>
                  {isAdmin && (
                    <>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Advance Balance</TableHead>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Loan Balance</TableHead>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Reason</TableHead>
                    </>
                  )}
                  {!isAdmin && (
                    <>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Balance</TableHead>
                      <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Reason</TableHead>
                    </>
                  )}
                  <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">Status</TableHead>
                  {(isAdmin || isCashier) && <TableHead className="uppercase text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((l) => (
                  <TableRow key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-800">
                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                      {formatDate(l.issuedAt)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                        {l.employee?.employeeId ?? "-"}
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                      {l.employee?.employeeName ?? l.employeeId}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                        {l.employee?.position ?? "-"}
                      </TableCell>
                    )}
                    <TableCell className="font-bold text-slate-700 dark:text-slate-200">
                      {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(l.principalAmount)}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-200 font-medium">
                      {l.installments || 0}
                    </TableCell>
                    {isAdmin && (
                      <>
                        <TableCell className="font-semibold text-amber-600 dark:text-amber-500">
                          {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(l.totalAdvanceBalance ?? 0)}
                        </TableCell>
                        <TableCell className="font-semibold text-rose-600 dark:text-rose-500">
                          {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(l.totalLoanBalance ?? 0)}
                        </TableCell>
                        <TableCell className="text-slate-500 dark:text-slate-400 text-sm truncate max-w-[150px]">
                          {l.notes || "-"}
                        </TableCell>
                      </>
                    )}
                    {!isAdmin && (
                      <>
                        <TableCell className="font-semibold text-amber-600 dark:text-amber-500">
                          {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(l.balance)}
                        </TableCell>
                        <TableCell className="text-slate-500 dark:text-slate-400 text-sm truncate max-w-[150px]">
                          {l.notes || "-"}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50' :
                        l.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                        l.status === 'Disbursed' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50'
                      }`}>
                        {l.status || "Submitted"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-1 flex-wrap">
                         {(l.status === "Submitted" || !l.status) && isAdmin && (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" onClick={() => openEdit(l)} title="Review & Approve">
                                <Check className="h-4 w-4" /><span className="sr-only">Approve</span>
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => handleStatusUpdate(l.id, "Rejected")} title="Reject">
                                <X className="h-4 w-4" /><span className="sr-only">Reject</span>
                              </Button>
                            </>
                         )}
                         {(l.status === "Submitted" || !l.status) && (isAdmin || isBusinessManager) && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30" onClick={() => openEdit(l)} title="Edit">
                                <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
                            </Button>
                         )}
                         {(l.status === "Approved" || l.status === "Disbursed") && isCashier && (
                            <div className="flex gap-1">
                              {l.status === "Approved" && <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30" onClick={() => handleStatusUpdate(l.id, "Disbursed")} title="Disburse">
                                  <HandCoins className="h-4 w-4" /><span className="sr-only">Disburse</span>
                              </Button>}
                             {l.status === "Disbursed" && <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30" 
                                onClick={() => {
                                  setPrintingLoan(l);
                                  setTimeout(() => handlePrint(), 50);
                                }} 
                                title="Print Disburse Report"
                              >
                                  <Printer className="h-4 w-4" /><span className="sr-only">Print</span>
                              </Button>}
                            </div>
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

      <div className="hidden">
        <DisburseVoucher 
          ref={printRef} 
          record={printingLoan ? {
            ...printingLoan,
            type: "Loan"
          } : null} 
        />
      </div>
    </div>
  );
}
