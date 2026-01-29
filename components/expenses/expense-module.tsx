"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadButton } from "@/lib/uploadthing";
import { Download, Printer, Search, X } from "lucide-react";
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
  createdAt: string;
  updatedAt: string;
  location?: { name: string; city: string };
  route?: { routeNo: string; name: string };
  vehicle?: { vehicleNo: string; type: string | null; model: string | null };
  attachments: ExpenseAttachment[];
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
  const [expenses, setExpenses] = useState<ExpenseSheet[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expenseType, setExpenseType] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseSheet | null>(
    null
  );
  const [previewAttachment, setPreviewAttachment] =
    useState<ExpenseAttachment | null>(null);
  const [expenseToPrint, setExpenseToPrint] = useState<ExpenseSheet | null>(
    null
  );

  // Routes and Vehicles state
  const [routes, setRoutes] = useState<Array<{ id: string; routeNo: string; name: string }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; vehicleNo: string; type: string | null; model: string | null }>>([]);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [vehicleTransactions, setVehicleTransactions] = useState<ExpenseSheet[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Helper function to check if expense type requires route/vehicle
  const requiresRouteAndVehicle = (type: string) => {
    const vehicleRelatedTypes = [
      "LOADING_CHARGES",
      "REPAIR_MAINT_VEHICLE",
      "RIKSHAW_RENTAL",
      "VEHICLE_CHALLAN",
      "VEHICLE_FUEL",
      "VEHICLE_RENTAL",
      "VEHICLES_RENT"
    ];
    return vehicleRelatedTypes.includes(type);
  };

  // Search filters (draft state)
  const [searchId, setSearchId] = useState("");
  const [searchStatus, setSearchStatus] = useState("all");
  const [searchType, setSearchType] = useState("all");
  const [searchMinAmount, setSearchMinAmount] = useState("");
  const [searchMaxAmount, setSearchMaxAmount] = useState("");
  const [searchFromDate, setSearchFromDate] = useState("");
  const [searchToDate, setSearchToDate] = useState("");
  const [searchRoute, setSearchRoute] = useState("all");
  const [searchVehicle, setSearchVehicle] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Applied filters (actual state used for API calls)
  const [appliedSearchId, setAppliedSearchId] = useState("");
  const [appliedSearchStatus, setAppliedSearchStatus] = useState("all");
  const [appliedSearchType, setAppliedSearchType] = useState("all");
  const [appliedSearchMinAmount, setAppliedSearchMinAmount] = useState("");
  const [appliedSearchMaxAmount, setAppliedSearchMaxAmount] = useState("");
  const [appliedSearchFromDate, setAppliedSearchFromDate] = useState("");
  const [appliedSearchToDate, setAppliedSearchToDate] = useState("");
  const [appliedSearchRoute, setAppliedSearchRoute] = useState("all");
  const [appliedSearchVehicle, setAppliedSearchVehicle] = useState("all");

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const canCreate = roles.includes("Business Manager");
  const canApprove = roles.includes("Admin") || roles.includes("Super Admin");
  const canDisburse = roles.includes("Cashier");

  const loadExpenses = async (pageNumber = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        limit: "10",
      });
      if (locationId) {
        params.set("locationId", locationId);
      }
      // Add applied search filters
      if (appliedSearchId.trim()) {
        params.set("searchId", appliedSearchId.trim());
      }
      if (appliedSearchStatus && appliedSearchStatus !== "all") {
        params.set("status", appliedSearchStatus);
      }
      if (appliedSearchType && appliedSearchType !== "all") {
        params.set("expenseType", appliedSearchType);
      }
      if (appliedSearchMinAmount.trim()) {
        params.set("minAmount", appliedSearchMinAmount.trim());
      }
      if (appliedSearchMaxAmount.trim()) {
        params.set("maxAmount", appliedSearchMaxAmount.trim());
      }
      if (appliedSearchFromDate.trim()) {
        params.set("fromDate", appliedSearchFromDate.trim());
      }
      if (appliedSearchToDate.trim()) {
        params.set("toDate", appliedSearchToDate.trim());
      }
      if (appliedSearchRoute && appliedSearchRoute !== "all") {
        params.set("routeId", appliedSearchRoute);
      }
      if (appliedSearchVehicle && appliedSearchVehicle !== "all") {
        params.set("vehicleId", appliedSearchVehicle);
      }
      
      const response = await fetch(`/api/expenses?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to load expenses.");
      }
      setExpenses(data.expenses ?? []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setPage(data?.pagination?.page || pageNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  };

  // Load routes and vehicles
  const loadRoutesAndVehicles = async () => {
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
      console.error("Failed to load routes/vehicles:", err);
    }
  };

  // Load last 3 transactions for selected vehicle
  const loadVehicleTransactions = async (vehicleId: string) => {
    if (!vehicleId) {
      setVehicleTransactions([]);
      return;
    }
    
    setLoadingTransactions(true);
    try {
      const response = await fetch(`/api/expenses?vehicleId=${vehicleId}&limit=3`);
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
    loadRoutesAndVehicles();
  }, []);

  // Load vehicle transactions when vehicle is selected
  useEffect(() => {
    if (selectedVehicle) {
      loadVehicleTransactions(selectedVehicle);
    } else {
      setVehicleTransactions([]);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    setPage(1);
  }, [locationId, appliedSearchId, appliedSearchStatus, appliedSearchType, appliedSearchMinAmount, appliedSearchMaxAmount, appliedSearchFromDate, appliedSearchToDate, appliedSearchRoute, appliedSearchVehicle]);

  useEffect(() => {
    loadExpenses(page);
  }, [page, locationId, appliedSearchId, appliedSearchStatus, appliedSearchType, appliedSearchMinAmount, appliedSearchMaxAmount, appliedSearchFromDate, appliedSearchToDate, appliedSearchRoute, appliedSearchVehicle]);

  const handleApplyFilters = () => {
    setAppliedSearchId(searchId);
    setAppliedSearchStatus(searchStatus);
    setAppliedSearchType(searchType);
    setAppliedSearchMinAmount(searchMinAmount);
    setAppliedSearchMaxAmount(searchMaxAmount);
    setAppliedSearchFromDate(searchFromDate);
    setAppliedSearchToDate(searchToDate);
    setAppliedSearchRoute(searchRoute);
    setAppliedSearchVehicle(searchVehicle);
  };

  const handleClearFilters = () => {
    setSearchId("");
    setSearchStatus("all");
    setSearchType("all");
    setSearchMinAmount("");
    setSearchMaxAmount("");
    setSearchFromDate("");
    setSearchToDate("");
    setSearchRoute("all");
    setSearchVehicle("all");
    // Also clear applied filters
    setAppliedSearchId("");
    setAppliedSearchStatus("all");
    setAppliedSearchType("all");
    setAppliedSearchMinAmount("");
    setAppliedSearchMaxAmount("");
    setAppliedSearchFromDate("");
    setAppliedSearchToDate("");
    setAppliedSearchRoute("all");
    setAppliedSearchVehicle("all");
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!expenseType || !amount) {
      setError("Expense type and amount are required.");
      return;
    }
    if (!details || details.trim() === "") {
      setError("Details are required.");
      return;
    }
    if (attachments.length === 0) {
      setError("At least one attachment is required.");
      return;
    }
    if (requiresRouteAndVehicle(expenseType) && (!selectedRoute || !selectedVehicle)) {
      setError("Route and Vehicle are required for this expense type.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseType,
          amount: Number.parseFloat(amount),
          details: details || null,
          attachments,
          routeId: requiresRouteAndVehicle(expenseType) ? selectedRoute : null,
          vehicleId: requiresRouteAndVehicle(expenseType) ? selectedVehicle : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to create expense.");
      }
      setExpenseType("");
      setAmount("");
      setDetails("");
      setAttachments([]);
      setSelectedRoute("");
      setSelectedVehicle("");
      await loadExpenses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create expense."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update expense.");
      }
      await loadExpenses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update expense."
      );
    }
  };

  const statusColor = useMemo(
    () =>
      ({
        PENDING: "bg-amber-100 text-amber-800",
        APPROVED: "bg-blue-100 text-blue-800",
        REJECTED: "bg-red-100 text-red-800",
        DISBURSED: "bg-green-100 text-green-800",
      } as Record<string, string>),
    []
  );

  const isImage = (fileType: string) => fileType.startsWith("image/");
  const isPdf = (fileType: string) => fileType === "application/pdf";
  const isPreviewable = (fileType: string) =>
    isImage(fileType) || isPdf(fileType);

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Expense Sheet</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Expense Type *</Label>
                  <Select value={expenseType} onValueChange={setExpenseType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Conditional Route and Vehicle Selection */}
              {requiresRouteAndVehicle(expenseType) && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Route *</Label>
                    <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                      <SelectTrigger>
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
                    <Label>Vehicle *</Label>
                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicleNo}
                            {vehicle.type || vehicle.model ? ` (${[vehicle.type, vehicle.model].filter(Boolean).join(' - ')})` : ''}
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
                  <Label className="text-sm font-medium">Last 3 Transactions for Selected Vehicle</Label>
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
                                {new Date(transaction.createdAt).toLocaleDateString()} - {transaction.status}
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
                <Label htmlFor="details">Details *</Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Add notes for this expense (required)"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Attachments (PDF, DOC, Images) *</Label>
                  <UploadButton
                    endpoint="expenseAttachment"
                    appearance={{
                      button: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600 font-medium px-4 py-2 rounded-md transition-colors",
                      container: "w-full flex justify-start",
                      allowedContent: "text-slate-600 dark:text-slate-400 text-sm"
                    }}
                    content={{
                      button: "Choose Files",
                      allowedContent: "PDF, DOC, DOCX, PNG, JPG (Max 5MB)"
                    }}
                    onClientUploadComplete={(
                      files: Array<{
                        url: string;
                        key: string;
                        name: string;
                        type: string;
                        size: number;
                      }>
                    ) => {
                      const uploaded = (files ?? []).map((file) => ({
                        url: file.url,
                        fileKey: file.key,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                      }));
                      setAttachments((prev) => [...prev, ...uploaded]);
                    }}
                    onUploadError={(uploadError: { message: string }) => {
                      setError(uploadError.message);
                    }}
                  />
                {attachments.length > 0 ? (
                  <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                    ✓ {attachments.length} file(s) ready to attach.
                  </div>
                ) : (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    ⚠ At least one attachment is required.
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Submitting..." : "Submit Expense"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search Expenses</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Search className="h-4 w-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplyFilters();
                }
              }}
            >
              {/* Search by ID */}
              <div className="space-y-2">
                <Label htmlFor="searchId">Expense ID</Label>
                <Input
                  id="searchId"
                  placeholder="Search by ID..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                />
              </div>

              {/* Search by Status */}
              <div className="space-y-2">
                <Label htmlFor="searchStatus">Status</Label>
                <Select value={searchStatus} onValueChange={setSearchStatus}>
                  <SelectTrigger id="searchStatus">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="DISBURSED">Disbursed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search by Type */}
              <div className="space-y-2">
                <Label htmlFor="searchType">Expense Type</Label>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger id="searchType">
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

              {/* Search by Min Amount */}
              <div className="space-y-2">
                <Label htmlFor="searchMinAmount">Min Amount</Label>
                <Input
                  id="searchMinAmount"
                  type="number"
                  placeholder="Min amount"
                  value={searchMinAmount}
                  onChange={(e) => setSearchMinAmount(e.target.value)}
                />
              </div>

              {/* Search by Max Amount */}
              <div className="space-y-2">
                <Label htmlFor="searchMaxAmount">Max Amount</Label>
                <Input
                  id="searchMaxAmount"
                  type="number"
                  placeholder="Max amount"
                  value={searchMaxAmount}
                  onChange={(e) => setSearchMaxAmount(e.target.value)}
                />
              </div>

              {/* Search by From Date */}
              <div className="space-y-2">
                <Label htmlFor="searchFromDate">From Date</Label>
                <Input
                  id="searchFromDate"
                  type="date"
                  value={searchFromDate}
                  onChange={(e) => setSearchFromDate(e.target.value)}
                />
              </div>

              {/* Search by To Date */}
              <div className="space-y-2">
                <Label htmlFor="searchToDate">To Date</Label>
                <Input
                  id="searchToDate"
                  type="date"
                  value={searchToDate}
                  onChange={(e) => setSearchToDate(e.target.value)}
                />
              </div>

              {/* Search by Route */}
              <div className="space-y-2">
                <Label htmlFor="searchRoute">Route</Label>
                <Select value={searchRoute} onValueChange={setSearchRoute}>
                  <SelectTrigger id="searchRoute">
                    <SelectValue placeholder="All routes" />
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

              {/* Search by Vehicle */}
              <div className="space-y-2">
                <Label htmlFor="searchVehicle">Vehicle</Label>
                <Select value={searchVehicle} onValueChange={setSearchVehicle}>
                  <SelectTrigger id="searchVehicle">
                    <SelectValue placeholder="All vehicles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicles</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNo}
                        {vehicle.type || vehicle.model ? ` (${[vehicle.type, vehicle.model].filter(Boolean).join(' - ')})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Apply Filters Button */}
              <div className="flex items-end">
                <Button
                  variant="default"
                  size="default"
                  onClick={handleApplyFilters}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>

              {/* Clear Filters Button */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleClearFilters}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense Sheets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading expenses...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No expense data available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attachments</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {expenseTypes.find((t) => t.value === expense.expenseType)
                        ?.label ?? expense.expenseType}
                    </TableCell>
                    <TableCell>{expense.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      {expense.location
                        ? `${expense.location.city} - ${expense.location.name}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {expense.route
                        ? `${expense.route.routeNo} - ${expense.route.name}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {expense.vehicle
                        ? expense.vehicle.vehicleNo
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[expense.status] || ""}>
                        {expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{expense.attachments.length}</TableCell>
                    <TableCell>
                      {new Date(expense.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(expense.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setPreviewAttachment(
                              expense.attachments[0] ?? null
                            );
                          }}
                        >
                          View
                        </Button>
                        {canApprove && expense.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleAction(expense.id, "approve")
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(expense.id, "reject")}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {canDisburse && expense.status === "APPROVED" ? (
                          <Button
                            size="sm"
                            onClick={() => handleAction(expense.id, "disburse")}
                          >
                            Mark Disbursed
                          </Button>
                        ) : null}
                        {canDisburse && expense.status === "DISBURSED" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setExpenseToPrint(expense);
                              setTimeout(() => handlePrint(), 100);
                            }}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-end">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(Math.max(1, page - 1))}
                  className={
                    page === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && page > 3) {
                  pageNum = Math.min(totalPages, page - 2 + i);
                  if (pageNum < 1) pageNum = 1;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={page === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  className={
                    page === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog
        open={Boolean(selectedExpense)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExpense(null);
            setPreviewAttachment(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {expenseTypes.find(
                      (t) => t.value === selectedExpense.expenseType
                    )?.label ?? selectedExpense.expenseType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">
                    {selectedExpense.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">
                    {selectedExpense.location
                      ? `${selectedExpense.location.city} - ${selectedExpense.location.name}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColor[selectedExpense.status] || ""}>
                    {selectedExpense.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(selectedExpense.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Updated</p>
                  <p className="font-medium">
                    {new Date(selectedExpense.updatedAt).toLocaleString()}
                  </p>
                </div>
                {selectedExpense.route && (
                  <div>
                    <p className="text-sm text-muted-foreground">Route</p>
                    <p className="font-medium">
                      {selectedExpense.route.routeNo} - {selectedExpense.route.name}
                    </p>
                  </div>
                )}
                {selectedExpense.vehicle && (
                  <div>
                    <p className="text-sm text-muted-foreground">Vehicle</p>
                    <p className="font-medium">
                      {selectedExpense.vehicle.vehicleNo}
                      {selectedExpense.vehicle.type || selectedExpense.vehicle.model
                        ? ` (${[selectedExpense.vehicle.type, selectedExpense.vehicle.model].filter(Boolean).join(' - ')})`
                        : ''}
                    </p>
                  </div>
                )}
              </div>

              {selectedExpense.details ? (
                <div>
                  <p className="text-sm text-muted-foreground">Details</p>
                  <p className="whitespace-pre-wrap">
                    {selectedExpense.details}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2 min-w-0">
                  <p className="text-sm text-muted-foreground">Attachments</p>
                  {selectedExpense.attachments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedExpense.attachments.map((file) => (
                        <div
                          key={file.fileKey}
                          className="flex flex-col gap-2 rounded border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <button
                            type="button"
                            className="text-left min-w-0"
                            onClick={() => setPreviewAttachment(file)}
                          >
                            <div className="font-medium break-words">
                              {file.fileName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {file.fileType}
                            </div>
                          </button>
                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 px-3"
                            >
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open
                              </a>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="secondary"
                              className="h-8 px-3"
                            >
                              <a href={file.url} download>
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <p className="text-sm text-muted-foreground">Preview</p>
                  {previewAttachment ? (
                    isPreviewable(previewAttachment.fileType) ? (
                      <div className="rounded border p-2">
                        {isImage(previewAttachment.fileType) ? (
                          <img
                            src={previewAttachment.url}
                            alt={previewAttachment.fileName}
                            className="max-h-72 w-full object-contain"
                          />
                        ) : (
                          <iframe
                            src={previewAttachment.url}
                            className="h-72 w-full"
                            title={previewAttachment.fileName}
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Preview not available. Use Open or Download.
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select a file to preview.
                    </p>
                  )}
                </div>
              </div>

              {canDisburse && selectedExpense.status === "DISBURSED" ? (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="default"
                    onClick={() => {
                      setExpenseToPrint(selectedExpense);
                      setTimeout(() => handlePrint(), 100);
                    }}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Voucher
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Hidden print component */}
      <div className="hidden">
        {expenseToPrint && (
          <ExpenseVoucherPrint ref={printRef} expense={expenseToPrint} />
        )}
      </div>
    </div>
  );
}
