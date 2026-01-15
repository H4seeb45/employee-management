"use client";

import { useEffect, useMemo, useState } from "react";
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
  attachments: ExpenseAttachment[];
};

const expenseTypes = [
  { value: "VEHICLES_FUEL", label: "Vehicles Fuel" },
  { value: "VEHICLES_RENTAL", label: "Vehicles Rental" },
  { value: "WAREHOUSE_RENTAL", label: "Warehouse Rental" },
  { value: "SALARIES", label: "Salaries" },
  { value: "ADVANCES_TO_EMP", label: "Advances To Emp" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "REPAIR_MAINTENANCE", label: "Repair & Maintenance" },
  { value: "STATIONERY", label: "Stationery" },
  { value: "KITCHEN_EXPENSE", label: "Kitchen Expense" },
];

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

  useEffect(() => {
    setPage(1);
  }, [locationId]);

  useEffect(() => {
    loadExpenses(page);
  }, [page, locationId]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!expenseType || !amount) {
      setError("Expense type and amount are required.");
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
                  <Label>Expense Type</Label>
                  <Select value={expenseType} onValueChange={setExpenseType}>
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
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Add notes for this expense"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Upload Attachments (PDF, DOC, Images)</Label>
                <UploadButton
                  endpoint="expenseAttachment"
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
                  <div className="text-sm text-muted-foreground">
                    {attachments.length} file(s) ready to attach.
                  </div>
                ) : null}
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
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
