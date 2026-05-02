"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Hourglass,
  CheckCircle2,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddAdminRequestForm } from "./add-admin-request-form";
import { useLayout } from "@/components/layout/layout-provider";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatCard } from "@/components/leave/stat-card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";

export function AdminRequestManagement() {
  const { user } = useLayout();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [requestData, setRequestData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString(),
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const isAdmin = user?.roles?.some((role: any) =>
    ["Admin", "Super Admin"].includes(role),
  );

  const months = [
    { label: "January", value: "1" },
    { label: "February", value: "2" },
    { label: "March", value: "3" },
    { label: "April", value: "4" },
    { label: "May", value: "5" },
    { label: "June", value: "6" },
    { label: "July", value: "7" },
    { label: "August", value: "8" },
    { label: "September", value: "9" },
    { label: "October", value: "10" },
    { label: "November", value: "11" },
    { label: "December", value: "12" },
  ];

  useEffect(() => {
    setMounted(true);
    fetchLocations();
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchRequests();
    }
  }, [mounted, selectedMonth, selectedYear, selectedLocation]);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error("Failed to fetch locations", error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let url = `/api/admin-requests?month=${selectedMonth}&year=${selectedYear}&locationId=${selectedLocation}`;

      const res = await fetch(url);
      const data = await res.json();
      setRequestData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch admin requests", error);
      toast({
        title: "Error",
        description: "Failed to fetch admin requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRequest = async (request: any) => {
    try {
      const res = await fetch("/api/admin-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request");

      toast({
        title: "Request Submitted",
        description: "Your request has been submitted successfully.",
      });
      setDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update request");

      toast({
        title: `Request ${status}`,
        description: `Request has been marked as ${status}.`,
      });
      fetchRequests();
      setViewOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = requestData.map((request) => ({
      "EMP ID": request.employee?.employeeId || "N/A",
      Name: request.employeeName || request.employee?.employeeName,
      Designation: request.employee?.position || "N/A",
      Office: request.employee?.location?.name || "N/A",
      Subject: request.subject,
      Details: request.details,
      Status: request.status,
      Date: request.createdAt
        ? new Date(request.createdAt).toLocaleDateString()
        : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Admin Requests");
    XLSX.writeFile(
      workbook,
      `Admin_Requests_${selectedMonth}_${selectedYear}.xlsx`,
    );

    toast({
      title: "Export Successful",
      description: `${requestData.length} requests exported to Excel.`,
    });
  };

  const renderStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || "";
    let color =
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    let icon = <AlertCircle className="h-4 w-4 mr-1" />;

    if (s === "APPROVED") {
      color =
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      icon = <CheckCircle2 className="h-4 w-4 mr-1" />;
    } else if (s === "REJECTED") {
      color = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      icon = <XCircleIcon className="h-4 w-4 mr-1" />;
    }

    return (
      <Badge variant="outline" className={`flex items-center ${color}`}>
        {icon} {status}
      </Badge>
    );
  };

  const totalCount = requestData.length;
  const pendingCount = requestData.filter(
    (r) => r.status?.toUpperCase() === "PENDING",
  ).length;
  const approvedCount = requestData.filter(
    (r) => r.status?.toUpperCase() === "APPROVED",
  ).length;
  const rejectedCount = requestData.filter(
    (r) => r.status?.toUpperCase() === "REJECTED",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-sky-600" />
            <h3 className="text-lg font-medium">Request to Admin</h3>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-transparent"
                    onClick={exportToExcel}
                    disabled={!mounted || loading}
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden min-[380px]:inline">Export</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export requests to Excel</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              className="flex-1 sm:flex-none bg-sky-600 hover:bg-sky-700"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />{" "}
              <span className="hidden min-[380px]:inline">New Request</span>
              <span className="min-[380px]:hidden">New</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground font-semibold">
              Month
            </Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-muted-foreground font-semibold">
              Year
            </Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground font-semibold">
                Office / Location
              </Label>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Offices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {mounted ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Requests"
              value={totalCount}
              gradientFrom="from-sky-600"
              gradientTo="to-cyan-500"
              icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
              subtext="Filtered requests"
            />
            <StatCard
              title="Pending"
              value={pendingCount}
              gradientFrom="from-sky-700"
              gradientTo="to-sky-500"
              icon={<Hourglass className="h-5 w-5" aria-hidden="true" />}
              subtext="Awaiting review"
            />
            <StatCard
              title="Approved"
              value={approvedCount}
              gradientFrom="from-green-600"
              gradientTo="to-emerald-500"
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
              subtext="Approved requests"
            />
            <StatCard
              title="Rejected"
              value={rejectedCount}
              gradientFrom="from-red-600"
              gradientTo="to-red-500"
              icon={<XCircleIcon className="h-5 w-5" aria-hidden="true" />}
              subtext="Rejected requests"
            />
          </div>

          <Card>
            <Tabs defaultValue="all">
              <TabsList className="w-full border-b rounded-none justify-start h-auto p-0 bg-transparent overflow-x-auto flex-nowrap scrollbar-hide">
                <TabsTrigger
                  value="all"
                  className="flex items-center gap-2 py-3 px-4 rounded-tl-lg rounded-tr-none rounded-b-none data-[state=active]:bg-muted whitespace-nowrap"
                >
                  All Requests
                  <Badge variant="secondary" className="rounded-full">
                    {totalCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="flex items-center gap-2 py-3 px-4 rounded-none data-[state=active]:bg-muted whitespace-nowrap"
                >
                  Pending
                  <Badge variant="secondary" className="rounded-full">
                    {pendingCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="approved"
                  className="flex items-center gap-2 py-3 px-4 rounded-none data-[state=active]:bg-muted whitespace-nowrap"
                >
                  Approved
                  <Badge variant="secondary" className="rounded-full">
                    {approvedCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                  className="flex items-center gap-2 py-3 px-4 rounded-none data-[state=active]:bg-muted whitespace-nowrap"
                >
                  Rejected
                  <Badge variant="secondary" className="rounded-full">
                    {rejectedCount}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {["all", "pending", "approved", "rejected"].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="hidden lg:table-cell">
                            EMP ID
                          </TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead className="hidden md:table-cell">
                            Designation
                          </TableHead>
                          {isAdmin && (
                            <TableHead className="hidden xl:table-cell">
                              Office
                            </TableHead>
                          )}
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">
                            Date
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell
                              colSpan={isAdmin ? 8 : 7}
                              className="text-center py-8 text-muted-foreground"
                            >
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : requestData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={isAdmin ? 8 : 7}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No requests found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          requestData
                            .filter(
                              (req) =>
                                tab === "all" ||
                                req.status?.toUpperCase() === tab.toUpperCase(),
                            )
                            .map((request) => (
                              <TableRow key={request.id}>
                                <TableCell className="hidden lg:table-cell font-mono text-xs">
                                  {request.employee?.employeeId || "N/A"}
                                </TableCell>
                                <TableCell className="font-medium whitespace-nowrap">
                                  {request.employeeName ||
                                    request.employee?.employeeName}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {request.employee?.position || "N/A"}
                                </TableCell>
                                {isAdmin && (
                                  <TableCell className="hidden xl:table-cell">
                                    {request.employee?.location?.name || "N/A"}
                                  </TableCell>
                                )}
                                <TableCell className="max-w-[150px] sm:max-w-[200px] truncate">
                                  <div className="flex flex-col">
                                    <span>{request.subject}</span>
                                    <span className="sm:hidden text-[10px] text-muted-foreground">
                                      {request.createdAt
                                        ? new Date(
                                            request.createdAt,
                                          ).toLocaleDateString()
                                        : "-"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {renderStatusBadge(request.status)}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell whitespace-nowrap">
                                  {request.createdAt
                                    ? new Date(
                                        request.createdAt,
                                      ).toLocaleDateString()
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-sky-600"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setViewOpen(true);
                                    }}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </>
      ) : (
        <Card>
          <div className="p-6 text-sm text-muted-foreground">Loading...</div>
        </Card>
      )}

      {/* New Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Request</DialogTitle>
          </DialogHeader>
          <AddAdminRequestForm onSubmit={handleAddRequest} />
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      {mounted && (
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase font-bold">
                      Employee
                    </Label>
                    <p className="text-sm font-medium mt-1">
                      {selectedRequest.employeeName ||
                        selectedRequest.employee?.employeeName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase font-bold">
                      Status
                    </Label>
                    <div className="mt-1">
                      {renderStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase font-bold">
                    Subject
                  </Label>
                  <p className="text-sm font-medium mt-1 p-2 bg-muted/50 rounded border">
                    {selectedRequest.subject}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase font-bold">
                    Details
                  </Label>
                  <p className="text-sm mt-1 p-3 bg-muted/30 rounded-lg border min-h-[100px] whitespace-pre-wrap">
                    {selectedRequest.details}
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  {selectedRequest.status?.toUpperCase() === "PENDING" &&
                  isAdmin ? (
                    <>
                      <Button
                        variant="outline"
                        className="text-red-600 bg-transparent"
                        onClick={() =>
                          handleUpdateStatus(selectedRequest.id, "Rejected")
                        }
                        disabled={updatingStatus}
                      >
                        Reject
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          handleUpdateStatus(selectedRequest.id, "Approved")
                        }
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? "Processing..." : "Approve"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setViewOpen(false)}
                      variant="secondary"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
