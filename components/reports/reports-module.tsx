"use client";

import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
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
  Download, 
  Printer, 
  Filter, 
  FileText, 
  TrendingUp, 
  Truck, 
  Calendar,
  Search,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { expenseTypes } from "@/components/expenses/expense-types";
import { SearchableSelect } from "@/components/ui/searchable-select";

// --- Types ---

type BudgetReport = {
  id: string;
  location: { name: string; city: string };
  totalBudget: number;
  totalSpent: number;
  totalLeft: number;
  status: string;
  categories: Array<{
    type: string;
    limit: number;
    spent: number;
    left: number;
  }>;
};

type ExpenseDetailed = {
  id: string;
  expenseType: string;
  details: string | null;
  amount: number;
  status: string;
  createdAt: string;
  location?: { name: string; city: string };
  route?: { routeNo: string; name: string };
  vehicle?: { vehicleNo: string };
  createdBy?: { email: string };
  items?: any[];
};

type RouteVehicleReport = {
  routes: Array<{
    id: string;
    routeNo: string;
    name: string;
    location: { name: string; city: string };
    isActive: boolean;
  }>;
  vehicles: Array<{
    id: string;
    vehicleNo: string;
    type: string | null;
    model: string | null;
    location: { name: string; city: string };
    isActive: boolean;
  }>;
};

export function ReportsModule({ roles }: { roles: string[] }) {
  const [activeTab, setActiveTab] = useState("budget");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Reports Data ---
  const [budgetData, setBudgetData] = useState<BudgetReport[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseDetailed[]>([]);
  const [routeVehicleData, setRouteVehicleData] = useState<RouteVehicleReport | null>(null);

  // --- Filter States (for Expense Report) ---
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  const [filterMaxAmount, setFilterMaxAmount] = useState("");
  const [filterRoute, setFilterRoute] = useState("all");
  const [filterVehicle, setFilterVehicle] = useState("all");

  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // --- Printing Refs ---
  const budgetPrintRef = useRef<HTMLDivElement>(null);
  const expensePrintRef = useRef<HTMLDivElement>(null);
  const routeVehiclePrintRef = useRef<HTMLDivElement>(null);

  // --- Printing ---
  const handlePrintBudget = useReactToPrint({
    contentRef: budgetPrintRef,
    documentTitle: "Budget Report",
  });

  const handlePrintExpense = useReactToPrint({
    contentRef: expensePrintRef,
    documentTitle: "Expense Detail Report",
  });

  const handlePrintRouteVehicle = useReactToPrint({
    contentRef: routeVehiclePrintRef,
    documentTitle: "Routes and Vehicles Report",
  });

  const onPrintBudget = () => {
    if (budgetPrintRef.current) {
      handlePrintBudget();
    }
  };

  const onPrintExpense = () => {
    if (expensePrintRef.current) {
      handlePrintExpense();
    }
  };

  const onPrintRouteVehicle = () => {
    if (routeVehiclePrintRef.current) {
      handlePrintRouteVehicle();
    }
  };

  // --- Fetch Logic ---

  const fetchRoutesAndVehicles = async () => {
    try {
      const [rRes, vRes] = await Promise.all([
        fetch("/api/routes-vehicles/routes"),
        fetch("/api/routes-vehicles/vehicles")
      ]);
      if (rRes.ok) setRoutes((await rRes.json()).routes || []);
      if (vRes.ok) setVehicles((await vRes.json()).vehicles || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBudgetReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/budget");
      const data = await res.json();
      if (res.ok) setBudgetData(data.report);
    } catch (err) {
      setError("Failed to fetch budget report");
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenseReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterType !== "all") params.append("expenseType", filterType);
      if (filterFromDate) params.append("fromDate", filterFromDate);
      if (filterToDate) params.append("toDate", filterToDate);
      if (filterMinAmount) params.append("minAmount", filterMinAmount);
      if (filterMaxAmount) params.append("maxAmount", filterMaxAmount);
      if (filterRoute !== "all") params.append("routeId", filterRoute);
      if (filterVehicle !== "all") params.append("vehicleId", filterVehicle);

      const res = await fetch(`/api/reports/expenses?${params}`);
      const data = await res.json();
      if (res.ok) setExpenseData(data.expenses);
    } catch (err) {
      setError("Failed to fetch expense report");
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteVehicleReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/routes-vehicles");
      const data = await res.json();
      if (res.ok) setRouteVehicleData(data);
    } catch (err) {
      setError("Failed to fetch routes & vehicles report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutesAndVehicles();
  }, []);

  useEffect(() => {
    if (activeTab === "budget") fetchBudgetReport();
    if (activeTab === "expenses") fetchExpenseReport();
    if (activeTab === "routes-vehicles") fetchRouteVehicleReport();
  }, [activeTab]);

  const getRouteDisplay = (e: ExpenseDetailed) => {
    if (e.items && Array.isArray(e.items) && e.items.length > 0) {
      const distinctRoutes = Array.from(new Set(e.items.map((i: any) => i.routeNo).filter(Boolean))) as string[];
      if (distinctRoutes.length === 0) return "-";
      return distinctRoutes.map(rNo => {
        const r = routes.find(rt => rt.routeNo === rNo);
        return r ? r.name : rNo;
      }).join(", ");
    }
    if (e.route) return e.route.name;
    
    return "-";
  };

  const getVehicleDisplay = (e: ExpenseDetailed) => {
    if (e.items && Array.isArray(e.items) && e.items.length > 0) {
      const distinctVehicles = Array.from(new Set(e.items.map((i: any) => i.vehicleNo).filter(Boolean))) as string[];
      if (distinctVehicles.length === 0) return "-";
      return distinctVehicles.join(", ");
    }
    if (e.vehicle) return e.vehicle.vehicleNo;
    return "-";
  };

  // --- Export Logic ---

  const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleExportBudget = () => {
    const flatData = budgetData.flatMap(b => 
      b.categories.map(c => ({
        Location: `${b.location.name} (${b.location.city})`,
        "Total Budget": b.totalBudget,
        Category: expenseTypes.find(t => t.value === c.type)?.label || c.type,
        "Category Limit": c.limit,
        "Spent": c.spent,
        "Left": c.left,
        Status: b.status
      }))
    );
    exportToExcel(flatData, "Budget_Report");
  };

  const handleExportExpenses = () => {
    const data = expenseData.map(e => ({
      ID: e.id,
      Date: new Date(e.createdAt).toLocaleDateString(),
      Type: expenseTypes.find(t => t.value === e.expenseType)?.label || e.expenseType,
      Details: e.details,
      Amount: e.amount,
      Status: e.status,
      Location: e.location?.name,
      Route: getRouteDisplay(e),
      Vehicle: getVehicleDisplay(e),
      User: e.createdBy?.email
    }));
    exportToExcel(data, "Expense_Report");
  };

  const handleExportRoutesVehicles = () => {
    if (!routeVehicleData) return;
    const routes = routeVehicleData.routes.map(r => ({
      Type: "Route",
      "No/Name": `${r.routeNo} - ${r.name}`,
      Location: `${r.location.name} (${r.location.city})`,
      Status: r.isActive ? "Active" : "Inactive"
    }));
    const vehicles = routeVehicleData.vehicles.map(v => ({
      Type: "Vehicle",
      "No/Name": v.vehicleNo,
      Location: `${v.location.name} (${v.location.city})`,
      Status: v.isActive ? "Active" : "Inactive"
    }));
    exportToExcel([...routes, ...vehicles], "Routes_Vehicles_Report");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reports Central</h1>
        <p className="text-slate-500 dark:text-slate-400">Generate, view, and export detailed reports for your organization.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full lg:w-auto h-auto grid grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="budget" className="rounded-lg py-2.5">
            <TrendingUp className="h-4 w-4 mr-2" />
            Budget Report
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-lg py-2.5">
            <FileText className="h-4 w-4 mr-2" />
            Expense Report
          </TabsTrigger>
          <TabsTrigger value="routes-vehicles" className="rounded-lg py-2.5">
            <Truck className="h-4 w-4 mr-2" />
            Routes & Vehicles
          </TabsTrigger>
        </TabsList>

        {/* --- Budget Report Tab --- */}
        <TabsContent value="budget" className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold">Budget Summary</h2>
              <p className="text-sm text-slate-500">Overview of spent vs remaining budget across categories</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportBudget}>
                <Download className="h-4 w-4 mr-2" /> Export Excel
              </Button>
              <Button size="sm" onClick={onPrintBudget}>
                <Printer className="h-4 w-4 mr-2" /> Print Report
              </Button>
            </div>
          </div>

          <div ref={budgetPrintRef} className="print:p-8">
            <div className="hidden print:block mb-8 text-center border-b-2 border-slate-200 pb-4">
              <h1 className="text-3xl font-bold text-slate-900 border-b-2 border-black inline-block mb-2">SADIQ TRADERS HRMS</h1>
              <h2 className="text-xl font-bold text-slate-700">Budget Report</h2>
              <p className="text-xs text-slate-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
            </div>
            
            <div className="space-y-8">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue-600" />
                  <p className="font-medium">Loading budget report...</p>
                </div>
              )}
              
              {!loading && budgetData.length === 0 && (
                <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                   No budget reports found.
                </div>
              )}

              {!loading && budgetData.map((budget) => {
                const budgetUsagePercent = budget.totalBudget > 0 ? (budget.totalSpent / budget.totalBudget) * 100 : 0;
               return <Card key={budget.id} className="overflow-hidden border-slate-200 dark:border-slate-800">
                  <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl text-blue-600 dark:text-blue-400">
                          {budget.location.name} ({budget.location.city})
                        </CardTitle>
                        <CardDescription>Monthly Budget Status: {budget.status}</CardDescription>
                      </div>
                      <div className="grid grid-cols-3 gap-8 text-right">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Budget</p>
                          <p className="text-lg font-bold">{new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(budget.totalBudget)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold text-emerald-600">Spent</p>
                          <p className="text-lg font-bold text-emerald-600">{new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(budget.totalSpent)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold text-blue-600">Left</p>
                          <p className="text-lg font-bold text-blue-600">{new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(budget.totalLeft)}</p>
                        </div>
                      </div>
                    </div>
                     <div className="grid grid-cols-[95%_5%] gap-2 mt-2">
                        <div className="w-full h-4 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div                                
                                className={`h-full ${budgetUsagePercent > 90 ? 'bg-rose-500' : budgetUsagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                                style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
                            />
                        </div>
                        <span className="text-[11px] font-bold w-10">{budgetUsagePercent.toFixed(0)}%</span>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                          <TableHead className="w-[300px]">Category</TableHead>
                          <TableHead className="text-right">Budget Limit</TableHead>
                          <TableHead className="text-right">Spent</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead className="w-[200px] text-right">Usage %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budget.categories.map((cat) => {
                          const usagePercent = cat.limit > 0 ? (cat.spent / cat.limit) * 100 : 0;
                          return (
                            <TableRow key={cat.type}>
                              <TableCell className="font-medium">
                                {expenseTypes.find(t => t.value === cat.type)?.label || cat.type}
                              </TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat("en-PK").format(cat.limit)}
                              </TableCell>
                              <TableCell className="text-right text-emerald-600 font-medium">
                                {new Intl.NumberFormat("en-PK").format(cat.spent)}
                              </TableCell>
                              <TableCell className={`text-right font-bold ${cat.left < 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                                {new Intl.NumberFormat("en-PK").format(cat.left)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-24 h-2 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${usagePercent > 90 ? 'bg-rose-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                                      style={{ width: `${Math.min(100, usagePercent)}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold w-10">{usagePercent.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
})}
            </div>

            <div className="hidden print:block mt-12 pt-4 border-t border-slate-200 text-center">
              <p className="text-[10px] text-slate-400 italic">This is a computer-generated report and does not require a physical signature.</p>
              <p className="text-[8px] text-slate-300">Generated via Sadiq Traders HRMS</p>
            </div>
          </div>
        </TabsContent>

        {/* --- Expense Report Tab --- */}
        <TabsContent value="expenses" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
             <CardHeader className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Detailed Expenses</CardTitle>
                  <CardDescription>Filter and analyze every expense claim</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? "bg-slate-100 dark:bg-slate-800" : ""}
                  >
                    <Filter className="h-4 w-4 mr-2" /> Filters
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExpenses}>
                    <Download className="h-4 w-4 mr-2" /> Export Excel
                  </Button>
                  <Button size="sm" onClick={onPrintExpense}>
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </Button>
                </div>
              </div>
            </CardHeader>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800"
                >
                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                       <Label>Status</Label>
                       <Select value={filterStatus} onValueChange={setFilterStatus}>
                         <SelectTrigger className="bg-white dark:bg-slate-800">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="all">All</SelectItem>
                           <SelectItem value="PENDING">Pending</SelectItem>
                           <SelectItem value="APPROVED">Approved</SelectItem>
                           <SelectItem value="DISBURSED">Disbursed</SelectItem>
                           <SelectItem value="REJECTED">Rejected</SelectItem>
                         </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label>Expense Type</Label>
                       <SearchableSelect
                         value={filterType}
                         onValueChange={setFilterType}
                         options={[
                           { value: "all", label: "All Types" },
                           ...expenseTypes.map(t => ({ value: t.value, label: t.label }))
                         ]}
                         placeholder="All Types"
                         searchPlaceholder="Search type..."
                       />
                    </div>

                    <div className="space-y-2">
                       <Label>Route</Label>
                       <SearchableSelect
                         value={filterRoute}
                         onValueChange={setFilterRoute}
                         options={[
                           { value: "all", label: "All Routes" },
                           ...routes.map(r => ({ value: r.id, label: `${r.routeNo} - ${r.name}` }))
                         ]}
                         placeholder="All Routes"
                         searchPlaceholder="Search route..."
                       />
                    </div>

                    <div className="space-y-2">
                       <Label>Vehicle</Label>
                       <SearchableSelect
                         value={filterVehicle}
                         onValueChange={setFilterVehicle}
                         options={[
                           { value: "all", label: "All Vehicles" },
                           ...vehicles.map(v => ({ value: v.id, label: v.vehicleNo }))
                         ]}
                         placeholder="All Vehicles"
                         searchPlaceholder="Search vehicle..."
                       />
                    </div>

                    <div className="space-y-2">
                       <Label>From Date</Label>
                       <Input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} className="bg-white dark:bg-slate-800" />
                    </div>

                    <div className="space-y-2">
                       <Label>To Date</Label>
                       <Input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} className="bg-white dark:bg-slate-800" />
                    </div>

                    <div className="space-y-2">
                       <Label>Min Amount</Label>
                       <Input type="number" value={filterMinAmount} onChange={(e) => setFilterMinAmount(e.target.value)} placeholder="0" className="bg-white dark:bg-slate-800" />
                    </div>

                    <div className="space-y-2">
                       <Label>Max Amount</Label>
                       <Input type="number" value={filterMaxAmount} onChange={(e) => setFilterMaxAmount(e.target.value)} placeholder="99999" className="bg-white dark:bg-slate-800" />
                    </div>

                    <div className="md:col-span-3 lg:col-span-4 flex justify-end gap-2 pt-2">
                       <Button variant="ghost" onClick={() => {
                         setFilterStatus("all");
                         setFilterType("all");
                         setFilterRoute("all");
                         setFilterVehicle("all");
                         setFilterFromDate("");
                         setFilterToDate("");
                         setFilterMinAmount("");
                         setFilterMaxAmount("");
                       }}>Clear Filters</Button>
                       <Button onClick={fetchExpenseReport} className="bg-blue-600 hover:bg-blue-700">Apply Filters</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={expensePrintRef} className="print:p-8">
               <div className="hidden print:block mb-8 text-center border-b-2 border-slate-200 pb-4">
                  <h1 className="text-3xl font-bold text-slate-900 border-b-2 border-black inline-block mb-2">SADIQ TRADERS HRMS</h1>
                  <h2 className="text-xl font-bold text-slate-700">Expense Detail Report</h2>
                  {(filterStatus !== "all" || filterType !== "all" || filterFromDate || filterToDate || filterMinAmount || filterMaxAmount || filterRoute !== "all" || filterVehicle !== "all") && (
                    <p className="text-xs text-slate-500 mt-2">
                       Active Filters: {filterStatus !== "all" && `Status: ${filterStatus} | `} 
                       {filterType !== "all" && `Type: ${expenseTypes.find(t => t.value === filterType)?.label} | `}
                       {(filterFromDate || filterToDate) && `Date: ${filterFromDate || "Start"} to ${filterToDate || "End"} | `}
                       {filterRoute !== "all" && `Route: ${routes.find(r => r.id === filterRoute)?.routeNo} | `}
                       {filterVehicle !== "all" && `Vehicle: ${vehicles.find(v => v.id === filterVehicle)?.vehicleNo}`}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">Total Records: {expenseData.length} | Generated: {new Date().toLocaleString()}</p>
                </div>

                <div className="overflow-x-auto">
                   <Table>
                     <TableHeader>
                       <TableRow className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                         <TableHead>Date</TableHead>
                         <TableHead>Type</TableHead>
                         <TableHead>Details</TableHead>
                         <TableHead>Location</TableHead>
                         <TableHead>Route</TableHead>
                         <TableHead>Vehicle</TableHead>
                         <TableHead className="text-right">Amount</TableHead>
                         <TableHead>Status</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                        {loading && (
                          <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                              Loading report data...
                            </TableCell>
                          </TableRow>
                        )}
                        {!loading && expenseData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                              No expenses found for the selected filters.
                            </TableCell>
                          </TableRow>
                        )}
                        {expenseData.map((e) => (
                          <TableRow key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <TableCell className="text-xs whitespace-nowrap">
                              {new Date(e.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium text-xs">
                               {expenseTypes.find(t => t.value === e.expenseType)?.label || e.expenseType}
                            </TableCell>
                            <TableCell className="max-w-[200px] text-xs truncate" title={e.details || ""}>
                              {e.details}
                            </TableCell>
                            <TableCell className="text-xs">
                              {e.location?.name}
                            </TableCell>
                            <TableCell className="text-xs">
                              {getRouteDisplay(e)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {getVehicleDisplay(e)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-xs">
                              {new Intl.NumberFormat("en-PK").format(e.amount)}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                e.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                e.status === 'DISBURSED' ? 'bg-blue-100 text-blue-700' :
                                e.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {e.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                     {expenseData.length > 0 && (
                       <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800">
                         <TableRow>
                            <TableCell colSpan={6} className="font-bold text-right py-4">REPORT TOTAL</TableCell>
                            <TableCell className="text-right font-bold text-lg text-blue-600">
                              {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(
                                expenseData.reduce((sum, e) => sum + e.amount, 0)
                              )}
                            </TableCell>
                            <TableCell></TableCell>
                         </TableRow>
                       </tfoot>
                     )}
                   </Table>
                 </div>

                 <div className="hidden print:block mt-12 pt-4 border-t border-slate-200 text-center">
                    <p className="text-[10px] text-slate-400 italic">This is a computer-generated report and does not require a physical signature.</p>
                    <p className="text-[8px] text-slate-300">Generated via Sadiq Traders HRMS</p>
                 </div>
            </div>
          </Card>
        </TabsContent>

        {/* --- Routes & Vehicles Report Tab --- */}
        <TabsContent value="routes-vehicles" className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold">Routes & Vehicles Master List</h2>
              <p className="text-sm text-slate-500">Comprehensive list of all registered routes and vehicles</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportRoutesVehicles}>
                <Download className="h-4 w-4 mr-2" /> Export Excel
              </Button>
              <Button size="sm" onClick={onPrintRouteVehicle}>
                <Printer className="h-4 w-4 mr-2" /> Print Report
              </Button>
            </div>
          </div>

          <div ref={routeVehiclePrintRef} className="print:p-8">
             <div className="hidden print:block mb-8 text-center border-b-2 border-slate-200 pb-4">
               <h1 className="text-3xl font-bold text-slate-900 border-b-2 border-black inline-block mb-2">SADIQ TRADERS HRMS</h1>
               <h2 className="text-xl font-bold text-slate-700">Routes & Vehicles Report</h2>
               <p className="text-xs text-slate-500 mt-1">Generated on: {new Date().toLocaleString()}</p>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Routes Table */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-fit">
                   <CardHeader className="bg-slate-50 dark:bg-slate-800/50 py-3">
                     <CardTitle className="text-sm flex items-center"><Truck className="h-4 w-4 mr-2 text-blue-600" /> Registered Routes</CardTitle>
                   </CardHeader>
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Route No</TableHead>
                         <TableHead>Name</TableHead>
                         <TableHead>Location</TableHead>
                         <TableHead>Status</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                        {loading && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12">
                               <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                               <span className="text-xs text-slate-500 font-medium">Loading...</span>
                            </TableCell>
                          </TableRow>
                        )}
                        {routeVehicleData?.routes.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-bold text-blue-600">{r.routeNo}</TableCell>
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="text-xs">{r.location.name}</TableCell>
                            <TableCell>
                              <span className={`text-[10px] font-bold ${r.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {r.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                   </Table>
                </Card>

                {/* Vehicles Table */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-fit">
                   <CardHeader className="bg-slate-50 dark:bg-slate-800/50 py-3">
                     <CardTitle className="text-sm flex items-center"><Truck className="h-4 w-4 mr-2 text-indigo-600" /> Registered Vehicles</CardTitle>
                   </CardHeader>
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Vehicle No</TableHead>
                         <TableHead>Details</TableHead>
                         <TableHead>Location</TableHead>
                         <TableHead>Status</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                        {loading && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12">
                               <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                               <span className="text-xs text-slate-500 font-medium">Loading...</span>
                            </TableCell>
                          </TableRow>
                        )}
                        {routeVehicleData?.vehicles.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="font-bold text-indigo-600">{v.vehicleNo}</TableCell>
                            <TableCell className="text-xs">{v.type} {v.model ? `- ${v.model}` : ''}</TableCell>
                            <TableCell className="text-xs">{v.location.name}</TableCell>
                            <TableCell>
                              <span className={`text-[10px] font-bold ${v.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {v.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                     </TableBody>
                   </Table>
                </Card>
              </div>

              <div className="hidden print:block mt-12 pt-4 border-t border-slate-200 text-center col-span-1 lg:col-span-2">
                 <p className="text-[10px] text-slate-400 italic">This is a computer-generated report and does not require a physical signature.</p>
                 <p className="text-[8px] text-slate-300">Generated via Sadiq Traders HRMS</p>
              </div>
           </div>
        </TabsContent>
      </Tabs>

      <style jsx global>{`
        @media print {
          /* Force hide scrollbars completely in print */
          ::-webkit-scrollbar {
            display: none !important;
          }
          
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          .overflow-x-auto {
            overflow: visible !important;
          }

          table {
            overflow: visible !important;
          }

          /* Ensure body doesn't clip content or show scrollbars */
          body {
            overflow: visible !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
