"use client";

import { useEffect, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Banknote,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  FileText,
  TrendingUp,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Printer,
  Trash2,
  PlusCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadButton } from "@/lib/uploadthing";
import { ExpenseVoucherPrint } from "./expense-voucher-print";
import { expenseTypes } from "./expense-types";

type ExpenseAttachment = {
  url: string;
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type ExpenseSheet = {
  id: string;
  expenseType: string;
  details: string | null;
  amount: number;
  status: string;
  disburseType: string;
  createdAt: string;
  updatedAt: string;
  location?: { name: string; city: string };
  routeId?: string | null;
  route?: { routeNo: string; name: string };
  vehicleId?: string | null;
  vehicle?: { vehicleNo: string; type: string | null; model: string | null };
  attachments: ExpenseAttachment[];
  accountTitle?: string;
  accountNo?: string;
  bankName?: string;
  chequeDate?: string;
  disbursedAmount?: number;
  category: string;
  items?: { name: string; amount: number }[] | null;
};

export function ExpenseModule({
  roles,
  locationId,
}: {
  roles: string[];
  locationId?: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseSheet[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [expenseType, setExpenseType] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [disburseType, setDisburseType] = useState("Cash");
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [vehicleTransactions, setVehicleTransactions] = useState<ExpenseSheet[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [typeHistory, setTypeHistory] = useState<ExpenseSheet[]>([]);
  const [loadingTypeHistory, setLoadingTypeHistory] = useState(false);
  const [category, setCategory] = useState("Expense");
  const [fixedAssets, setFixedAssets] = useState<{ name: string; amount: string; vehicleNo?: string; routeNo?: string }[]>([
    { name: "", amount: "", vehicleNo: "", routeNo: "" }
  ]);
  const [tollsTaxesItems, setTollsTaxesItems] = useState<{ vehicleNo: string, routeNo: string, amount: string }[]>([
    { vehicleNo: "", routeNo: "", amount: "" }
  ]);
  const [entryMode, setEntryMode] = useState<"single" | "bulk">("single");
  const [bulkItems, setBulkItems] = useState<{ 
    vehicleNo?: string; 
    routeNo?: string; 
    description?: string; 
    amount: string 
  }[]>([{ amount: "", vehicleNo: "", routeNo: "" }]);

  // Dialog states
  const [selectedExpense, setSelectedExpense] = useState<ExpenseSheet | null>(null);
  const [expenseToPrint, setExpenseToPrint] = useState<ExpenseSheet | null>(null); // Separate state for printing
  const [showFilters, setShowFilters] = useState(false);

  // Routes and vehicles
  const [routes, setRoutes] = useState<Array<{ id: string; routeNo: string; name: string }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; vehicleNo: string }>>([]);

  // Applied filter states (actual filters used for API call)
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterRoute, setFilterRoute] = useState("all");
  const [filterVehicle, setFilterVehicle] = useState("all");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");

  // Temporary filter states (for user input before applying)
  const [tempFilterStatus, setTempFilterStatus] = useState("all");
  const [tempFilterType, setTempFilterType] = useState("all");
  const [tempSearchQuery, setTempSearchQuery] = useState("");
  const [tempFilterFromDate, setTempFilterFromDate] = useState("");
  const [tempFilterToDate, setTempFilterToDate] = useState("");
  const [tempFilterRoute, setTempFilterRoute] = useState("all");
  const [tempFilterVehicle, setTempFilterVehicle] = useState("all");
  const [tempFilterMinAmount, setTempFilterMinAmount] = useState("");
  const [tempFilterMaxAmount, setTempFilterMaxAmount] = useState("");

  // Action states
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Disbursement Form States
  const [disburseAccountTitle, setDisburseAccountTitle] = useState("");
  const [disburseAccountNo, setDisburseAccountNo] = useState("");
  const [disburseBankName, setDisburseBankName] = useState("");
  const [disburseChequeDate, setDisburseChequeDate] = useState("");
  const [disburseAmount, setDisburseAmount] = useState("");

  // Budget and Stats States
  const [budgetInfo, setBudgetInfo] = useState<{
    totalBudget: number;
    spentThisMonth: number;
    remainingBudget: number;
    hasApprovedBudget: boolean;
    categories?: Record<string, number>;
  } | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [stats, setStats] = useState<{
    statusCounts: Record<string, number>;
    typeTotals: Record<string, number>;
    monthlyTypeTotals: Record<string, number>;
  }>({ statusCounts: {}, typeTotals: {}, monthlyTypeTotals: {} });
  const [loadingStats, setLoadingStats] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Permission checks
  const isBusinessManager = roles.includes("Business Manager");
  const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");
  const isAccountant = roles.includes("Accountant");
  const isCashier = roles.includes("Cashier");
  const canCreate = isBusinessManager; // Only Business Managers can create expenses
  const canDisburse = (selectedExpense: ExpenseSheet) => {
    if(selectedExpense.disburseType === "Cash") {
      return isCashier;
    }

    if(selectedExpense.disburseType === "Cheque / Online Transfer") {
      return isAccountant;
    }
    return false;
  }

  // Required route/vehicle check
  const requiresRouteAndVehicle = (type: string) => {
    const vehicleTypes = [
      "LOADING_CHARGES",
      "REPAIR_MAINT_VEHICLE",
      "RIKSHAW_RENTAL",
      "VEHICLE_CHALLAN",
      "VEHICLE_FUEL",
      "VEHICLE_RENTAL",
      "VEHICLES_RENT",
      "VEHICLE_PARKING",
      "VEHICLE_PASSING",
    ];
    return vehicleTypes.includes(type);
  };

  // Fetch expenses - only when applied filters or page changes
  useEffect(() => {
    fetchExpenses();
  }, [page, searchQuery, filterStatus, filterType, filterFromDate, filterToDate, filterRoute, filterVehicle, filterMinAmount, filterMaxAmount, locationId]);

  // Apply filters handler
  const handleApplyFilters = () => {
    setFilterStatus(tempFilterStatus);
    setFilterType(tempFilterType);
    setSearchQuery(tempSearchQuery);
    setFilterFromDate(tempFilterFromDate);
    setFilterToDate(tempFilterToDate);
    setFilterRoute(tempFilterRoute);
    setFilterVehicle(tempFilterVehicle);
    setFilterMinAmount(tempFilterMinAmount);
    setFilterMaxAmount(tempFilterMaxAmount);
    setPage(1); // Reset to first page when applying filters
  };

  // Fetch routes and vehicles
  const fetchRoutesAndVehicles = async () => {
    try {
      const [routesRes, vehiclesRes] = await Promise.all([
        fetch("/api/routes-vehicles/routes"),
        fetch("/api/routes-vehicles/vehicles"),
      ]);

      if (routesRes.ok) {
        const routesData = await routesRes.json();
        setRoutes(routesData.routes || []);
      }

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData.vehicles || []);
      }
    } catch (err) {
      console.error("Failed to fetch routes and vehicles:", err);
    }
  };

  const loadVehicleTransactions = async (vehicleId: string, type?: string) => {
    if (!vehicleId) {
      setVehicleTransactions([]);
      return;
    }

    setLoadingTransactions(true);
    try {
      let url = `/api/expenses?vehicleId=${vehicleId}&limit=3`;
      if (type && type !== "all" && type !== "") {
        url += `&expenseType=${type}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setVehicleTransactions(data.expenses || []);
      }
    } catch (err) {
      console.error("Failed to load vehicle transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (selectedVehicle) {
      loadVehicleTransactions(selectedVehicle, expenseType);
    } else {
      setVehicleTransactions([]);
    }
  }, [selectedVehicle, expenseType]);

  const loadTypeHistory = async (type: string) => {
    if (!type) {
      setTypeHistory([]);
      return;
    }

    setLoadingTypeHistory(true);
    try {
      const params = new URLSearchParams({
        expenseType: type,
        limit: "3",
      });
      if (locationId) params.append("locationId", locationId);

      const response = await fetch(`/api/expenses?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTypeHistory(data.expenses || []);
      }
    } catch (err) {
      console.error("Failed to load type history:", err);
    } finally {
      setLoadingTypeHistory(false);
    }
  };

  useEffect(() => {
    if (expenseType) {
      loadTypeHistory(expenseType);
    } else {
      setTypeHistory([]);
    }
  }, [expenseType, locationId]);

  useEffect(() => {
    if (selectedExpense) {
      loadTypeHistory(selectedExpense.expenseType);
      if (selectedExpense.vehicleId) {
        loadVehicleTransactions(selectedExpense.vehicleId);
      }
    }
  }, [selectedExpense]);

  useEffect(() => {
    // Fetch routes and vehicles for both form and filters
    if(routes.length === 0 || vehicles.length === 0){
    fetchRoutesAndVehicles();}
  }, [routes.length,vehicles.length]);

  const fetchBudgetAndStats = async () => {
    setLoadingBudget(true);
    setLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (locationId) params.append("locationId", locationId);
      
      // Add all active filters to stats request
      if (searchQuery) params.append("searchId", searchQuery);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterType !== "all") params.append("expenseType", filterType);
      if (filterFromDate) params.append("fromDate", filterFromDate);
      if (filterToDate) params.append("toDate", filterToDate);
      if (filterRoute !== "all") params.append("routeId", filterRoute);
      if (filterVehicle !== "all") params.append("vehicleId", filterVehicle);
      if (filterMinAmount) params.append("minAmount", filterMinAmount);
      if (filterMaxAmount) params.append("maxAmount", filterMaxAmount);
      
      const res = await fetch(`/api/expenses/stats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBudgetInfo(data.budgetInfo);
        setStats({
          statusCounts: data.statusCounts || {},
          typeTotals: data.typeTotals || {},
          monthlyTypeTotals: data.monthlyTypeTotals || {},
        });
      }
    } catch (err) {
      console.error("Failed to fetch budget info and stats:", err);
    } finally {
      setLoadingBudget(false);
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchBudgetAndStats();
  }, [locationId, searchQuery, filterStatus, filterType, filterFromDate, filterToDate, filterRoute, filterVehicle, filterMinAmount, filterMaxAmount]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (searchQuery) params.append("searchId", searchQuery);
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterType !== "all") params.append("expenseType", filterType);
      if (locationId) params.append("locationId", locationId);
      if (filterFromDate) params.append("fromDate", filterFromDate);
      if (filterToDate) params.append("toDate", filterToDate);
      if (filterRoute !== "all") params.append("routeId", filterRoute);
      if (filterVehicle !== "all") params.append("vehicleId", filterVehicle);
      if (filterMinAmount) params.append("minAmount", filterMinAmount);
      if (filterMaxAmount) params.append("maxAmount", filterMaxAmount);

      const res = await fetch(`/api/expenses?${params}`);
      const data = await res.json();

      if (res.ok) {
        setExpenses(data.expenses || []);
        setTotalPages(data?.pagination?.totalPages || 1);
        setError(null);
      } else {
        setError(data.message || "Failed to fetch expenses");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };


  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    const needsRouteAndVehicle = requiresRouteAndVehicle(expenseType);
    if (!expenseType || (entryMode === "single" && category === "Expense" && expenseType !== "TOLLS_TAXES" && !details)) {
      setError("All fields are required.");
      setSaving(false);
      return;
    }

    if (!budgetInfo?.hasApprovedBudget) {
      setError("No approved budget found for this location. Please set a budget first.");
      setSaving(false);
      return;
    }

    if (parseFloat(amount) > budgetInfo.remainingBudget) {
      setError(`Insufficient budget. Remaining: ${new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(budgetInfo.remainingBudget)}`);
      setSaving(false);
      return;
    }
    
    if (attachments.length === 0) {
      setError("Please upload at least one attachment.");
      setSaving(false);
      return;
    }
    
    if (needsRouteAndVehicle && entryMode === "single" && (!selectedRoute || !selectedVehicle)) {
      setError("Route and Vehicle are required for this expense type.");
      setSaving(false);
      return;
    }

    // New validation for item lists of fixed asset
    if (category === "Fixed Asset") {
      if (fixedAssets.some(a => !a.name || !a.amount)) {
        setError("Please specify Asset Name and Amount for all asset items.");
        setSaving(false);
        return;
      }
    }

    const isBulk = entryMode === "bulk" && category === "Expense" && expenseType !== "TOLLS_TAXES";

    if (isBulk) {
      if (bulkItems.some(i => (needsRouteAndVehicle && (!i.vehicleNo || !i.routeNo)) || !i.amount)) {
        setError(`Please specify ${needsRouteAndVehicle ? "Vehicle, Route, and Amount" : "Amount"} for all bulk entries.`);
        setSaving(false);
        return;
      }
    }

    if (expenseType === "TOLLS_TAXES") {
      if (tollsTaxesItems.some(i => !i.vehicleNo || !i.routeNo || !i.amount)) {
        setError("Please specify Vehicle, Route, and Amount for all Tolls & Taxes items.");
        setSaving(false);
        return;
      }
    }

    
    const finalAmount = category === "Fixed Asset" 
      ? fixedAssets.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
      : expenseType === "TOLLS_TAXES"
      ? tollsTaxesItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
      : isBulk
      ? bulkItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
      : parseFloat(amount);

    if (finalAmount <= 0) {
      setError("Total amount must be greater than zero.");
      setSaving(false);
      return;
    }

    setSaving(true);
    setError(null);

    const items = category === "Fixed Asset" 
      ? fixedAssets.map(a => ({ 
          name: a.name, 
          amount: parseFloat(a.amount) || 0,
          vehicleNo: a.vehicleNo,
          routeNo: a.routeNo
        }))
      : expenseType === "TOLLS_TAXES"
      ? tollsTaxesItems.map(i => ({ 
          name: `${i.vehicleNo} | ${i.routeNo}`, 
          amount: parseFloat(i.amount) || 0,
          vehicleNo: i.vehicleNo,
          routeNo: i.routeNo 
        }))
      : isBulk
      ? bulkItems.map(i => ({
          name: `${i.vehicleNo} | ${i.routeNo}` + (i.description ? ` - ${i.description}` : ""),
          amount: parseFloat(i.amount) || 0,
          vehicleNo: i.vehicleNo,
          routeNo: i.routeNo,
          details: i.description
        }))
      : undefined;

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          expenseType: category === "Fixed Asset" ? "FIXED_ASSET" : expenseType,
          items,
          amount: finalAmount,
          details,
          disburseType,
          attachments,
          routeId: selectedRoute || undefined,
          vehicleId: selectedVehicle || undefined,
        }),
      });

      if (res.ok) {
        // Reset form
        setExpenseType("");
        setAmount("");
        setDetails("");
        setDisburseType("Cash");
        setAttachments([]);
        setSelectedRoute("");
        setSelectedVehicle("");
        setCategory("Expense");
        setFixedAssets([{ name: "", amount: "" }]);
        setTollsTaxesItems([{ vehicleNo: "", routeNo: "", amount: "" }]);
        setSuccess("Expense created successfully!");
        setError(null);
        fetchExpenses();
        fetchBudgetAndStats(); // Refresh budget info and stats after creation
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to create expense");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  // Handle expense actions
  const handleExpenseAction = async (expenseId: string, action: "approve" | "disburse" | "reject") => {
    setProcessingAction(true);
    setActionError(null);

    try {
      const body: any = { action };
      
      if (action === "disburse" && selectedExpense?.disburseType === "Cheque / Online Transfer") {
        body.accountTitle = disburseAccountTitle;
        body.accountNo = disburseAccountNo;
        body.bankName = disburseBankName;
        body.chequeDate = disburseChequeDate;
        body.disbursedAmount = disburseAmount;
      }

      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Reset disburse states
        setDisburseAccountTitle("");
        setDisburseAccountNo("");
        setDisburseBankName("");
        setDisburseChequeDate("");
        setDisburseAmount("");

        // Refresh the expenses list
        fetchExpenses();
        // Close the dialog
        setSelectedExpense(null);
      } else {
        const data = await res.json();
        setActionError(data.message || `Failed to ${action} expense`);
      }
    } catch (err) {
      setActionError("Network error");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle update disburse type
  const handleUpdateDisburseType = async (expenseId: string, newType: string) => {
    setProcessingAction(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "updateDisburseType",
          disburseType: newType 
        }),
      });

      if (res.ok) {
        fetchExpenses();
        setSelectedExpense(null);
      } else {
        const data = await res.json();
        setActionError(data.message || "Failed to update disburse type");
      }
    } catch (err) {
      setActionError("Network error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  // Summary stats - calculated from API stats, not paginated expenses
  const summaryStats = {
    total: Object.values(stats.statusCounts).reduce((sum, count) => sum + count, 0),
    pending: stats.statusCounts["PENDING"] || 0,
    approved: stats.statusCounts["APPROVED"] || 0,
    disbursed: stats.statusCounts["DISBURSED"] || 0,
    totalAmount: Object.values(stats.typeTotals).reduce((sum, amount) => sum + amount, 0),
  };

  const categoryRemaining = (() => {
    if (!budgetInfo || !budgetInfo.categories || !expenseType) return null;
    const categoryBudget = budgetInfo.categories[expenseType] || 0;
    if (categoryBudget === 0) return null;
    const spentThisMonth = stats.monthlyTypeTotals[expenseType] || 0;
    return categoryBudget - spentThisMonth;
  })();

  return (
    <div className="space-y-6 h-full">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Expense Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Track, manage, and approve expense claims across your organization
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Total Claims
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{loadingStats ? "..." : summaryStats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Pending
                </p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {loadingStats ? "..." : summaryStats.pending}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Approved
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {loadingStats ? "..." : summaryStats.approved}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Disbursed
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {loadingStats ? "..." : summaryStats.disbursed}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white/80 mb-1">Total Amount</p>
                <p className="text-xl font-bold">
                  {loadingStats ? "..." : new Intl.NumberFormat("en-PK", {
                    style: "currency",
                    currency: "PKR",
                    minimumFractionDigits: 0,
                  }).format(summaryStats.totalAmount)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/20">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Tabbed Interface */}
      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList className={`grid w-full ${canCreate ? "grid-cols-2": "grid-cols-1"} lg:w-auto lg:inline-grid bg-slate-100 dark:bg-slate-800`}>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
            <FileText className="h-4 w-4 mr-2" />
            All Expenses
          </TabsTrigger>
          {canCreate && (
            <TabsTrigger value="new" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
              <Plus className="h-4 w-4 mr-2" />
              New Claim
            </TabsTrigger>
          )}
        </TabsList>

        {/* All Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {/* Active Filter Badges at Top Right */}
          <div className="flex justify-end">
            <AnimatePresence>
              {(searchQuery || filterStatus !== "all" || filterType !== "all" || filterFromDate || filterToDate || filterRoute !== "all" || filterVehicle !== "all" || filterMinAmount || filterMaxAmount) && (
                <motion.div 
                  key="active-filters-top"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-wrap items-center justify-end gap-2 mb-2"
                >
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-1">Active Filters:</span>
                  
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-6 bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 text-[10px]">
                      "{searchQuery}"
                      <X className="h-3 w-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100" onClick={() => {setSearchQuery(""); setTempSearchQuery("");}} />
                    </Badge>
                  )}

                  {filterStatus !== "all" && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-6 bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 text-[10px]">
                      {filterStatus}
                      <X className="h-3 w-3 cursor-pointer hover:text-blue-900 dark:hover:text-blue-100" onClick={() => {setFilterStatus("all"); setTempFilterStatus("all");}} />
                    </Badge>
                  )}
                  
                  {filterType !== "all" && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-6 bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800 text-[10px]">
                      {expenseTypes.find(t => t.value === filterType)?.label || filterType}
                      <X className="h-3 w-3 cursor-pointer hover:text-purple-900 dark:hover:text-purple-100" onClick={() => {setFilterType("all"); setTempFilterType("all");}} />
                    </Badge>
                  )}

                  {(filterFromDate || filterToDate) && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-6 bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px]">
                      {filterFromDate || '...'} - {filterToDate || '...'}
                      <X className="h-3 w-3 cursor-pointer hover:text-emerald-900 dark:hover:text-emerald-100" onClick={() => {setFilterFromDate(""); setFilterToDate(""); setTempFilterFromDate(""); setTempFilterToDate("");}} />
                    </Badge>
                  )}

                  {filterRoute !== "all" && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-6 bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 text-[10px]">
                      Route: {routes.find(r => r.id === filterRoute)?.routeNo || filterRoute}
                      <X className="h-3 w-3 cursor-pointer hover:text-amber-900 dark:hover:text-amber-100" onClick={() => {setFilterRoute("all"); setTempFilterRoute("all");}} />
                    </Badge>
                  )}

                  {filterVehicle !== "all" && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-6 bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 text-[10px]">
                      {vehicles.find(v => v.id === filterVehicle)?.vehicleNo || filterVehicle}
                      <X className="h-3 w-3 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100" onClick={() => {setFilterVehicle("all"); setTempFilterVehicle("all");}} />
                    </Badge>
                  )}

                  {(filterMinAmount || filterMaxAmount) && (
                    <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-6 bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800 text-[10px]">
                      Rs. {filterMinAmount || '0'}-{filterMaxAmount || 'Any'}
                      <X className="h-3 w-3 cursor-pointer hover:text-rose-900 dark:hover:text-rose-100" onClick={() => {setFilterMinAmount(""); setFilterMaxAmount(""); setTempFilterMinAmount(""); setTempFilterMaxAmount("");}} />
                    </Badge>
                  )}

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[9px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                    onClick={() => {
                      setSearchQuery(""); setTempSearchQuery("");
                      setFilterStatus("all"); setTempFilterStatus("all");
                      setFilterType("all"); setTempFilterType("all");
                      setFilterFromDate(""); setTempFilterFromDate("");
                      setFilterToDate(""); setTempFilterToDate("");
                      setFilterRoute("all"); setTempFilterRoute("all");
                      setFilterVehicle("all"); setTempFilterVehicle("all");
                      setFilterMinAmount(""); setTempFilterMinAmount("");
                      setFilterMaxAmount(""); setTempFilterMaxAmount("");
                    }}
                  >
                    CLEAR ALL
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filters */}
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
            <CardHeader className={showFilters ? "border-b border-slate-100 dark:border-slate-700" : ""}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-slate-900 dark:text-white">
                    Filter & Search
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Find specific expense claims
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-slate-300 dark:border-slate-600"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? "Hide" : "Show"} Filters
                  {showFilters ? (
                    <ChevronDown className="h-4 w-4 ml-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 ml-2" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  key="filter-form"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="pt-6 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {/* Status Filter */}
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">Status</Label>
                        <Select value={tempFilterStatus} onValueChange={setTempFilterStatus}>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="DISBURSED">Disbursed</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Expense Type Filter */}
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">Expense Type</Label>
                        <Select value={tempFilterType} onValueChange={setTempFilterType}>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {expenseTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Route Filter */}
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">Route</Label>
                        <Select value={tempFilterRoute} onValueChange={setTempFilterRoute}>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                            <SelectValue placeholder="All Routes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Routes</SelectItem>
                            {routes.map((route) => (
                              <SelectItem key={route.id} value={route.id}>
                                {route.routeNo} - {route.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Vehicle Filter */}
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">Vehicle</Label>
                        <Select value={tempFilterVehicle} onValueChange={setTempFilterVehicle}>
                          <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                            <SelectValue placeholder="All Vehicles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Vehicles</SelectItem>
                            {vehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.vehicleNo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* From Date */}
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">From Date</Label>
                        <Input
                          type="date"
                          value={tempFilterFromDate}
                          onChange={(e) => setTempFilterFromDate(e.target.value)}
                          className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                        />
                      </div>

                      {/* To Date */}
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">To Date</Label>
                        <Input
                          type="date"
                          value={tempFilterToDate}
                          onChange={(e) => setTempFilterToDate(e.target.value)}
                          className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                        />
                      </div>

                      {/* Min Amount */}
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">Min Amount</Label>
                        <div className="relative">
                          <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          <Input
                            type="number"
                            placeholder="0"
                            value={tempFilterMinAmount}
                            onChange={(e) => setTempFilterMinAmount(e.target.value)}
                            className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                          />
                        </div>
                      </div>

                      {/* Max Amount */}
                      <div>
                        <Label className="text-slate-700 dark:text-slate-300">Max Amount</Label>
                        <div className="relative">
                          <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          <Input
                            type="number"
                            placeholder="999999"
                            value={tempFilterMaxAmount}
                            onChange={(e) => setTempFilterMaxAmount(e.target.value)}
                            className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex justify-end gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTempFilterStatus("all");
                          setTempFilterType("all");
                          setTempFilterRoute("all");
                          setTempFilterVehicle("all");
                          setTempFilterFromDate("");
                          setTempFilterToDate("");
                          setTempFilterMinAmount("");
                          setTempFilterMaxAmount("");
                        }}
                        className="border-slate-300 dark:border-slate-600"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApplyFilters}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Apply Filters
                      </Button>
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Expenses Table */}
          <Card className="mb-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                  <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    No expenses found
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Try adjusting your filters or create a new expense claim
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 rounded-lg">
                            Type
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Amount
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Status
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Disburse Type
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            Date
                          </TableHead>
                          <TableHead className="font-semibold text-slate-700 dark:text-slate-300 rounded-lg">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow
                            key={expense.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedExpense(expense)}
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {expenseTypes.find((t) => t.value === expense.expenseType)
                                    ?.label || expense.expenseType}
                                </span>
                                {expense.details && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                    {expense.details}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {new Intl.NumberFormat("en-PK", {
                                  style: "currency",
                                  currency: "PKR",
                                }).format(expense.amount)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  expense.status === "PENDING"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : expense.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : expense.status === "DISBURSED"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                }
                              >
                                {expense.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {expense.disburseType || "Cash"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {new Date(expense.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedExpense(expense);
                                  }}
                                  className="hover:bg-slate-100 dark:hover:bg-slate-700"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                
                                {expense.status === "DISBURSED" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Use separate state for printing to avoid opening view dialog
                                      setExpenseToPrint(expense);
                                      setTimeout(() => {
                                        handlePrint();
                                      }, 50);
                                    }}
                                    className="hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    title="Print Voucher"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Page <span className="font-medium text-slate-900 dark:text-white">{page}</span> of{" "}
                      <span className="font-medium text-slate-900 dark:text-white">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPage(Math.max(1, page - 1));
                        }}
                        disabled={page === 1 || loading}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPage(Math.min(totalPages, page + 1));
                        }}
                        disabled={page === totalPages || loading}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Claim Tab */}
        {canCreate && (
          <TabsContent value="new">
            <Card className="border-blue-100 dark:border-blue-900/30 overflow-hidden">
              <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Create New Expense Claim</CardTitle>
                  <CardDescription>Submit a new expense for approval</CardDescription>
                </div>
                {budgetInfo && (
                  <div className="flex gap-6 items-center">
                    {categoryRemaining !== null && (
                      <div className="text-right border-r border-blue-200 dark:border-blue-800 pr-6">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Category Budget</p>
                        <p className={`text-base font-bold ${categoryRemaining > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
                          {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(categoryRemaining)}
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Remaining</p>
                      <p className={`text-lg font-black ${budgetInfo.remainingBudget > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
                        {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(budgetInfo.remainingBudget)}
                      </p>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                
                <form onSubmit={handleCreate} className="space-y-6">
                  {error && (
                    <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                      <p className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
                    </div>
                  )}
                  
                  {success && (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {success}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Category <span className="text-rose-500">*</span></Label>
                      <Select value={category} onValueChange={(val) => {
                        setCategory(val);
                        if (val === "Fixed Asset") setExpenseType("FIXED_ASSET");
                        else setExpenseType("");
                      }}>
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Expense">Expense</SelectItem>
                          <SelectItem value="Fixed Asset">Fixed Asset</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Disburse Type <span className="text-rose-500">*</span></Label>
                      <Select value={disburseType} onValueChange={setDisburseType} required>
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                          <SelectValue placeholder="Select disburse type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Cheque / Online Transfer">Cheque / Online Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {category === "Expense" ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-300">
                            Expense Type <span className="text-rose-500">*</span>
                          </Label>
                          <Select value={expenseType} onValueChange={setExpenseType} required>
                            <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                              <SelectValue placeholder="Select expense type" />
                            </SelectTrigger>
                            <SelectContent>
                              {expenseTypes.filter((type) => type.value !== "FIXED_ASSET").map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                             <Label className="text-slate-700 dark:text-slate-300">
                               Amount (PKR) <span className="text-rose-500">*</span>
                             </Label>
                             {expenseType && expenseType !== "TOLLS_TAXES" && (
                               <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                 <button
                                   type="button"
                                   onClick={() => setEntryMode("single")}
                                   className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${entryMode === "single" ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                                 >
                                   Single
                                 </button>
                                 <button
                                   type="button"
                                   onClick={() => setEntryMode("bulk")}
                                   className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${entryMode === "bulk" ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                                 >
                                   Bulk
                                 </button>
                               </div>
                             )}
                           </div>
                           <div className="relative">
                             <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                             <Input
                               type="number"
                               step="1"
                               value={expenseType === "TOLLS_TAXES" 
                                 ? tollsTaxesItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0).toString() 
                                 : entryMode === "bulk"
                                 ? bulkItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0).toString()
                                 : amount
                               }
                               onChange={(e) => setAmount(e.target.value)}
                               placeholder="0.00"
                               className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                               disabled={expenseType === "TOLLS_TAXES" || entryMode === "bulk"}
                               required
                             />
                           </div>
                        </div>

                        {entryMode === "bulk" && expenseType && expenseType !== "TOLLS_TAXES" && (
                          <div className="md:col-span-2 space-y-4 p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800">
                             <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold flex items-center gap-2">
                                <PlusCircle className="h-4 w-4 text-blue-600" />
                                Bulk Entries Breakdown
                              </Label>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => setBulkItems([...bulkItems, { amount: "" }])}
                                className="h-8"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Row
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {bulkItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                                  <div className="md:col-span-3 space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider text-slate-500">Vehicle</Label>
                                    <Select
                                      value={item.vehicleNo}
                                      onValueChange={(val) => {
                                        const newItems = [...bulkItems];
                                        newItems[index].vehicleNo = val;
                                        setBulkItems(newItems);
                                      }}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {vehicles.map((v) => (
                                          <SelectItem key={v.id} value={v.vehicleNo}>{v.vehicleNo}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="md:col-span-3 space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider text-slate-500">Route</Label>
                                    <Select
                                      value={item.routeNo}
                                      onValueChange={(val) => {
                                        const newItems = [...bulkItems];
                                        newItems[index].routeNo = val;
                                        setBulkItems(newItems);
                                      }}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {routes.map((r) => (
                                          <SelectItem key={r.id} value={r.routeNo}>{r.routeNo}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="md:col-span-3 space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider text-slate-500">Detail / Description</Label>
                                    <Input 
                                      value={item.description}
                                      onChange={(e) => {
                                        const newItems = [...bulkItems];
                                        newItems[index].description = e.target.value;
                                        setBulkItems(newItems);
                                      }}
                                      placeholder="Enter detail"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="md:col-span-2 space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider text-slate-500">Amount</Label>
                                    <Input 
                                      type="number"
                                      value={item.amount}
                                      onChange={(e) => {
                                        const newItems = [...bulkItems];
                                        newItems[index].amount = e.target.value;
                                        setBulkItems(newItems);
                                      }}
                                      placeholder="0.00"
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="md:col-span-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (bulkItems.length > 1) {
                                          setBulkItems(bulkItems.filter((_, i) => i !== index));
                                        }
                                      }}
                                      className="h-9 w-9 p-0 text-rose-500"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tolls & Taxes Section (this can be removed and only bulk items for that is above should be there) */}
                        {expenseType === "TOLLS_TAXES" && (
                          <div className="md:col-span-2 space-y-4 p-4 border rounded-xl bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300">
                                <PlusCircle className="h-4 w-4" />
                                Tolls & Taxes Breakdown
                              </Label>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => setTollsTaxesItems([...tollsTaxesItems, { vehicleNo: "", routeNo: "", amount: "" }])}
                                className="h-8 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Row
                              </Button>
                            </div>
                            
                            <div className="space-y-4">
                              {tollsTaxesItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-3 rounded-lg bg-white dark:bg-slate-800 border border-blue-50 dark:border-blue-900/20 shadow-sm">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider text-slate-500">Vehicle No. <span className="text-rose-500">*</span></Label>
                                    <Select
                                      value={item.vehicleNo}
                                      onValueChange={(val) => {
                                        const newItems = [...tollsTaxesItems];
                                        newItems[index].vehicleNo = val;
                                        setTollsTaxesItems(newItems);
                                      }}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select Vehicle" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {vehicles.map((v) => (
                                          <SelectItem key={v.id} value={v.vehicleNo}>
                                            {v.vehicleNo}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider text-slate-500">Route No. <span className="text-rose-500">*</span></Label>
                                    <Select
                                      value={item.routeNo}
                                      onValueChange={(val) => {
                                        const newItems = [...tollsTaxesItems];
                                        newItems[index].routeNo = val;
                                        setTollsTaxesItems(newItems);
                                      }}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select Route" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {routes.map((r) => (
                                          <SelectItem key={r.id} value={r.routeNo}>
                                            {r.routeNo} - {r.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                      <Label className="text-[10px] uppercase tracking-wider text-slate-500">Amount</Label>
                                      <Input 
                                        type="number"
                                        value={item.amount}
                                        onChange={(e) => {
                                          const newItems = [...tollsTaxesItems];
                                          newItems[index].amount = e.target.value;
                                          setTollsTaxesItems(newItems);
                                        }}
                                        placeholder="0.00"
                                        className="h-9"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (tollsTaxesItems.length > 1) {
                                          setTollsTaxesItems(tollsTaxesItems.filter((_, i) => i !== index));
                                        }
                                      }}
                                      className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="md:col-span-2 space-y-4 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <PlusCircle className="h-4 w-4 text-blue-600" />
                            Fixed Assets List
                          </Label>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setFixedAssets([...fixedAssets, { name: "", amount: "", vehicleNo: "", routeNo: "" }])}
                            className="h-8"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Asset
                          </Button>
                        </div>
                        
                        
                        <div className="space-y-3">
                          {fixedAssets.map((asset, index) => (
                            <div key={index} className="flex gap-3 items-end p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                              <div className="flex-1 min-w-[150px] space-y-1">
                                <Label className="text-xs text-slate-500">Asset Name <span className="text-rose-500">*</span></Label>
                                <Select
                                  value={asset.name}
                                  onValueChange={(val) => {
                                    const newAssets = [...fixedAssets];
                                    newAssets[index].name = val;
                                    setFixedAssets(newAssets);
                                  }}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select Asset Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[
                                      "Office Chairs", "Laptops", "Computer", "Office Tables", "Mobile Phones", 
                                      "Printer", "Car", "Vehicles", "Bike", "Warehouse", "Fans", "Lights"
                                    ].map((option) => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-32 space-y-1">
                                <Label className="text-xs text-slate-500">Amount <span className="text-rose-500">*</span></Label>
                                <Input 
                                  type="number"
                                  value={asset.amount}
                                  onChange={(e) => {
                                    const newAssets = [...fixedAssets];
                                    newAssets[index].amount = e.target.value;
                                    setFixedAssets(newAssets);
                                  }}
                                  placeholder="0.00"
                                  className="h-9"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (fixedAssets.length > 1) {
                                    setFixedAssets(fixedAssets.filter((_, i) => i !== index));
                                  }
                                }}
                                className="h-9 w-9 p-0 text-rose-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t flex justify-between items-center text-sm font-bold">
                          <span>Total Fixed Asset Amount:</span>
                          <span className="text-blue-600">
                            Rs. {fixedAssets.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expense Type History */}
                  {expenseType && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Recent History for {expenseTypes.find(t => t.value === expenseType)?.label}</Label>
                      {loadingTypeHistory ? (
                        <div className="text-sm text-muted-foreground p-3 border rounded-md">
                          Loading history...
                        </div>
                      ) : typeHistory.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-3 border rounded-md">
                          No previous history found for this expense type.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {typeHistory.map((history) => (
                            <div
                              key={history.id}
                              className="p-3 border rounded-md bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                  Rs. {history.amount.toLocaleString()}
                                </p>
                                <Badge variant="outline" className="text-[10px] h-4">
                                  {history.status}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-1">
                                {new Date(history.createdAt).toLocaleDateString()}
                              </p>
                              {history.details && (
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 italic">
                                  "{history.details}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {requiresRouteAndVehicle(expenseType) && entryMode !== "bulk" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">Route <span className="text-rose-500">*</span></Label>
                        <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                          <SelectTrigger className="bg-white dark:bg-slate-800">
                            <SelectValue placeholder="Select route" />
                          </SelectTrigger>
                          <SelectContent>
                            {routes.map((route) => (
                              <SelectItem key={route.id} value={route.id}>
                                {route.routeNo} - {route.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">Vehicle <span className="text-rose-500">*</span></Label>
                        <Select value={selectedVehicle} onValueChange={(value) => {setSelectedVehicle(value); setSelectedVehicle(value);}}>
                          <SelectTrigger className="bg-white dark:bg-slate-800">
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.map((vehicle) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.vehicleNo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Vehicle Transaction History */}
                  {requiresRouteAndVehicle(expenseType) && selectedVehicle && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Last 3 {expenseTypes.find(t => t.value === expenseType)?.label || "Related"} Transactions for Selected Vehicle
                      </Label>
                      {loadingTransactions ? (
                        <div className="text-sm text-muted-foreground p-3 border rounded-md">
                          Loading transactions...
                        </div>
                      ) : vehicleTransactions.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-3 border rounded-md">
                          No previous transactions found for this vehicle.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {vehicleTransactions.map((transaction) => (
                            <div
                              key={transaction.id}
                              className="p-3 border rounded-md bg-slate-50 dark:bg-slate-900"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {expenseTypes.find((t) => t.value === transaction.expenseType)?.label ?? transaction.expenseType}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(transaction.createdAt).toLocaleDateString()} - {transaction?.route?.name} - {transaction.status}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold">
                                  Rs. {transaction.amount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Details & Notes {entryMode === "single" && category === "Expense" && expenseType !== "TOLLS_TAXES" && <span className="text-rose-500">*</span>}
                    </Label>
                    <Textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      required={entryMode === "single" && category === "Expense" && expenseType !== "TOLLS_TAXES"}
                      placeholder={entryMode === "bulk" ? "Add any additional internal notes (optional)..." : "Add description, purpose, or any other notes... *"}
                      className="min-h-[100px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Attachments <span className="text-rose-500">*</span>
                    </Label>
                    <div className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Upload supporting documents
                          </p>
                          {/* <p className="text-xs text-slate-500 dark:text-slate-400">
                            PDFs, images, or receipts (Max 10MB)
                          </p> */}
                        </div>
                        <UploadButton
                          endpoint="expenseAttachment"
                          appearance={{
                            button: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600 font-medium px-4 py-2 rounded-md transition-colors",
                            container: "w-full flex justify-start",
                            allowedContent: "text-slate-600 dark:text-slate-400 text-sm"
                          }}
                          content={{
                            button({ ready, isUploading }) {
                              if (isUploading) return <Loader2 className="h-4 w-4 animate-spin" />;
                              if (ready) return "Choose Files";
                              return "Getting ready...";
                            },
                            allowedContent: "PDF, DOC, DOCX, PNG, JPG (Max 5MB)"
                          }}
                          onClientUploadComplete={(files) => {
                            const uploaded = (files ?? []).map((file) => ({
                              url: file.url,
                              fileKey: file.key,
                              fileName: file.name,
                              fileType: file.type,
                              fileSize: file.size,
                            }));
                            setAttachments((prev) => [...prev, ...uploaded]);
                          }}
                          onUploadError={(error: { message: string }) => {
                            let friendlyMessage = error.message;
                            
                            if (error.message.includes("FileSizeMismatch")) {
                              friendlyMessage = "The file is too large. Please upload a file smaller than 5MB.";
                            } else if (error.message.includes("Invalid config")) {
                              friendlyMessage = "File type mismatch. Please try a different file format.";
                            }

                            setError(friendlyMessage);
                          }}
                        />
                      </div>
                    </div>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Uploaded Files ({attachments.length})
                        </p>
                        <div className="space-y-2">
                          {attachments.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                  {file.fileName}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setAttachments((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setExpenseType("");
                        setAmount("");
                        setDetails("");
                        setAttachments([]);
                        setSelectedRoute("");
                        setSelectedVehicle("");
                      }}
                      className="border-slate-300 dark:border-slate-600"
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        saving || 
                        attachments.length === 0 || 
                        (category === "Expense" && expenseType !== "TOLLS_TAXES" && (!amount || parseFloat(amount) <= 0)) ||
                        (category === "Expense" && expenseType === "TOLLS_TAXES" && tollsTaxesItems.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) <= 0) ||
                        (category === "Fixed Asset" && fixedAssets.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0) <= 0) ||
                        (entryMode === "single" && category === "Expense" && expenseType !== "TOLLS_TAXES" && !details)
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Submit Claim
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Expense Details Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1E293B]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              Expense Details
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              View complete information about this expense claim
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-6">
              {/* Error Display */}
              {actionError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                  <p className="text-sm text-rose-700 dark:text-rose-400">{actionError}</p>
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Current Status    </Label>
                  <Badge
                    className={`mt-1 ${
                      selectedExpense.status === "PENDING"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : selectedExpense.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : selectedExpense.status === "DISBURSED"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    }`}
                  >
                    {selectedExpense.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Expense ID</Label>
                  <p className="text-sm font-mono font-medium text-slate-900 dark:text-white mt-1">
                    {selectedExpense.id.substring(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Main Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Category</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-1 capitalize">
                    {selectedExpense.category || "Expense"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Expense Type</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                    {expenseTypes.find((t) => t.value === selectedExpense.expenseType)?.label || selectedExpense.expenseType}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Amount</Label>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {new Intl.NumberFormat("en-PK", {
                      style: "currency",
                      currency: "PKR",
                    }).format(selectedExpense.amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Disburse Type</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                    {selectedExpense.disburseType || "Cash"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Created Date</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                    {new Date(selectedExpense.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Last Updated</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                    {new Date(selectedExpense.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Fixed Asset Items */}
              {selectedExpense.category === "Fixed Asset" && selectedExpense.items && Array.isArray(selectedExpense.items) && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <Label className="text-xs text-blue-700 dark:text-blue-400 mb-2 font-bold uppercase tracking-wider">Fixed Asset Breakdown</Label>
                  <div className="space-y-2 mt-2">
                    {(selectedExpense.items as any[]).map((item, idx) => (
                      // border-b
                      <div key={idx} className="flex justify-between items-center text-sm border-blue-100 dark:border-blue-900/40 last:border-0 pb-1.5 pt-1">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">Rs. {Number(item.amount).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-blue-800 dark:text-blue-300">Total Assets Value</span>
                      <span className="text-blue-800 dark:text-blue-300">Rs. {selectedExpense.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Tolls & Taxes Breakdown */}
              {selectedExpense.expenseType === "TOLLS_TAXES" && selectedExpense.items && Array.isArray(selectedExpense.items) && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <Label className="text-xs text-blue-700 dark:text-blue-400 mb-2 font-bold uppercase tracking-wider">Tolls & Taxes Breakdown</Label>
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500 border-b pb-1">
                      <span>Vehicle</span>
                      <span>Route</span>
                      <span className="text-right">Amount</span>
                    </div>
                    {(selectedExpense.items as any[]).map((item, idx) => {
                      let vehicle = item.vehicleNo;
                      let route = item.routeNo;
                      if (!vehicle && item.name && item.name.includes("|")) {
                        [vehicle, route] = item.name.split("|").map((s: string) => s.trim());
                      }
                      return (
                        // border-b
                        <div key={idx} className="grid grid-cols-3 gap-2 text-sm border-blue-100 dark:border-blue-900/40 last:border-0 pb-1.5 pt-1">
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{vehicle || "N/A"}</span>
                          <span className="text-slate-600 dark:text-slate-400 truncate">{route || "N/A"}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-right">Rs. {Number(item.amount).toLocaleString()}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-blue-200 dark:border-blue-700">
                      <span className="text-blue-800 dark:text-blue-300">Total Amount</span>
                      <span className="text-blue-800 dark:text-blue-300 font-bold">Rs. {selectedExpense.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Expense Type History in View Dialog */}
              <div className="space-y-2">
                <Label className="text-xs text-slate-500 dark:text-slate-400">Recent History for {expenseTypes.find(t => t.value === selectedExpense.expenseType)?.label}</Label>
                {loadingTypeHistory ? (
                  <div className="text-sm text-muted-foreground py-2 italic font-light">
                    Loading history...
                  </div>
                ) : typeHistory.filter(h => h.id !== selectedExpense.id).length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2 italic font-light">
                    No other previous history found for this expense type.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                    {typeHistory.filter(h => h.id !== selectedExpense.id).map((history) => (
                      <div
                        key={history.id}
                        className="p-2 border rounded-md bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Rs. {history.amount.toLocaleString()}
                          </p>
                          <Badge variant="secondary" className="text-[9px] h-3.5 px-1 font-medium">
                            {history.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[9px] text-slate-500 font-medium">
                            {new Date(history.createdAt).toLocaleDateString()}
                          </p>
                          {history.details && (
                            <p className="text-[9px] text-slate-600 dark:text-slate-400 truncate max-w-[120px] italic">
                              {history.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Context */}
              {(selectedExpense.route || selectedExpense.vehicle) && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <Label className="text-xs text-blue-700 dark:text-blue-400 mb-2">Vehicle Information</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {selectedExpense.route && (
                      <div>
                        <Label className="text-xs text-slate-500 dark:text-slate-400">Route</Label>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {selectedExpense.route.routeNo} - {selectedExpense.route.name}
                        </p>
                      </div>
                    )}
                    {selectedExpense.vehicle && (
                      <div>
                        <Label className="text-xs text-slate-500 dark:text-slate-400">Vehicle</Label>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {selectedExpense.vehicle.vehicleNo}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Details - Show if DISBURSED and Cheque / Online Transfer */}
              {selectedExpense.status === "DISBURSED" && selectedExpense.disburseType === "Cheque / Online Transfer" && (
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <Label className="text-xs text-emerald-700 dark:text-emerald-400 mb-2">Disbursement Payment Details</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Account Title</Label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                        {selectedExpense.accountTitle || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Account / Cheque No.</Label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                        {selectedExpense.accountNo || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Bank Name</Label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                        {selectedExpense.bankName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Cheque Date</Label>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                        {selectedExpense.chequeDate ? new Date(selectedExpense.chequeDate).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Disbursed Amount</Label>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {selectedExpense.disbursedAmount ? new Intl.NumberFormat("en-PK", {
                          style: "currency",
                          currency: "PKR",
                        }).format(selectedExpense.disbursedAmount) : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Vehicle Transaction History */}
              {requiresRouteAndVehicle(selectedExpense.expenseType) && selectedExpense.vehicleId && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Last 3 Transactions for Selected Vehicle</Label>
                      {loadingTransactions ? (
                        <div className="text-sm text-muted-foreground p-3 border rounded-md">
                          Loading transactions...
                        </div>
                      ) : vehicleTransactions.filter(t => t.id !== selectedExpense.id).length === 0 ? (
                        <div className="text-sm text-muted-foreground p-3 border rounded-md">
                          No previous transactions found for this vehicle.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {vehicleTransactions.filter(t => t.id !== selectedExpense.id).map((transaction) => (
                            <div
                              key={transaction.id}
                              className="p-3 border rounded-md bg-slate-50 dark:bg-slate-900"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {expenseTypes.find((t) => t.value === transaction.expenseType)?.label ?? transaction.expenseType}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(transaction.createdAt).toLocaleDateString()} - {transaction?.route?.name} - {transaction.status}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold">
                                  Rs. {transaction.amount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
              )}

              {/* Details */}
              {selectedExpense.details && (
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Details & Notes</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    {selectedExpense.details}
                  </p>
                </div>
              )}

              {/* Attachments with Preview */}
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Attachments ({selectedExpense.attachments.length})
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {selectedExpense.attachments.map((file, idx) => {
                    const isImage = file.fileType?.startsWith("image/");
                    const isPDF = file.fileType === "application/pdf";

                    return (
                      <div
                        key={idx}
                        className="group relative rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-all"
                      >
                        {/* Preview Area */}
                        {isImage ? (
                          <div className="aspect-video bg-slate-100 dark:bg-slate-900 relative">
                            <img
                              src={file.url}
                              alt={file.fileName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>
                        ) : isPDF ? (
                          <div className="aspect-video bg-gradient-to-br from-rose-100 to-orange-100 dark:from-rose-900/30 dark:to-orange-900/30 flex items-center justify-center">
                            <FileText className="h-16 w-16 text-rose-600 dark:text-rose-400" />
                          </div>
                        ) : (
                          <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                            <FileText className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}

                        {/* File Info */}
                        <div className="p-3">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate mb-1">
                            {file.fileName}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {(file.fileSize / 1024).toFixed(0)} KB
                            </span>
                            <div className="flex gap-2">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </a>
                              <a
                                href={file.url}
                                download={file.fileName}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Disbursement Details Form - Show for Cheque / Online Transfer when status is APPROVED */}
              {canDisburse(selectedExpense) && selectedExpense.status === "APPROVED" && selectedExpense.disburseType === "Cheque / Online Transfer" && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-blue-600" />
                    Payment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Account Title <span className="text-rose-500">*</span></Label>
                      <Input
                        value={disburseAccountTitle}
                        onChange={(e) => setDisburseAccountTitle(e.target.value)}
                        placeholder="Enter account title"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Account / Cheque No. <span className="text-rose-500">*</span></Label>
                      <Input
                        value={disburseAccountNo}
                        onChange={(e) => setDisburseAccountNo(e.target.value)}
                        placeholder="Enter account or cheque no"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bank Name <span className="text-rose-500">*</span></Label>
                      <Input
                        value={disburseBankName}
                        onChange={(e) => setDisburseBankName(e.target.value)}
                        placeholder="Enter bank name"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cheque Date <span className="text-rose-500">*</span></Label>
                      <Input
                        type="date"
                        value={disburseChequeDate}
                        onChange={(e) => setDisburseChequeDate(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Disbursed Amount <span className="text-rose-500">*</span></Label>
                      <Input
                        type="number"
                        value={disburseAmount}
                        onChange={(e) => setDisburseAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  onClick={() => setSelectedExpense(null)}
                  disabled={processingAction}
                  className="border-slate-300 dark:border-slate-600"
                >
                  Close
                </Button>

                <div className="flex gap-2">
                  {/* Approve Button - Show for Admin/BM when status is PENDING */}
                  {isAdmin && selectedExpense.status === "PENDING" && (
                    <Button
                      onClick={() => handleExpenseAction(selectedExpense.id, "approve")}
                      disabled={processingAction}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {processingAction ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  )}

                  {/* Disburse Button - Show for Cashier or Accountant when status is APPROVED */}
                  {canDisburse(selectedExpense) && selectedExpense.status === "APPROVED" && (
                    <Button
                      onClick={() => handleExpenseAction(selectedExpense.id, "disburse")}
                      disabled={
                        processingAction || 
                        (selectedExpense.disburseType === "Cheque / Online Transfer" && 
                         (!disburseAccountTitle || !disburseAccountNo || !disburseBankName || !disburseChequeDate || !disburseAmount))
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {processingAction ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Banknote className="h-4 w-4 mr-2" />
                      )}
                      Disburse
                    </Button>
                  )}

                  {/* Reject Button - Show for Admin when status is PENDING */}
                  {isAdmin && selectedExpense.status === "PENDING" && (
                    <Button
                      onClick={() => handleExpenseAction(selectedExpense.id, "reject")}
                      disabled={processingAction}
                      variant="destructive"
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      {processingAction ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  )}

                  {/* Accountant Action: Mark as Cash */}
                  {isAccountant && selectedExpense.status === "APPROVED" && selectedExpense.disburseType !== "Cash" && (
                    <Button
                      onClick={() => handleUpdateDisburseType(selectedExpense.id, "Cash")}
                      disabled={processingAction}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {processingAction ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark as Cash Expense
                    </Button>
                  )}

                  {/* Cashier Action: Mark as Cheque */}
                  {isCashier && selectedExpense.status === "APPROVED" && selectedExpense.disburseType === "Cash" && (
                    <Button
                      onClick={() => handleUpdateDisburseType(selectedExpense.id, "Cheque / Online Transfer")}
                      disabled={processingAction}
                      className="bg-slate-700 hover:bg-slate-800 text-white"
                    >
                      {processingAction ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Mark as Cheque / Online Expense
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <ExpenseVoucherPrint ref={printRef} expense={expenseToPrint} />
      </div>
    </div>
  );
}
