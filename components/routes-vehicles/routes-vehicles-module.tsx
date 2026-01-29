"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Upload, Download, Plus } from "lucide-react";
import * as XLSX from "xlsx";

type Route = {
  id: string;
  routeNo: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Vehicle = {
  id: string;
  vehicleNo: string;
  type: string | null;
  model: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ImportResult = {
  success: boolean;
  routeNo?: string;
  vehicleNo?: string;
  name?: string;
  type?: string;
  model?: string;
  error?: string;
};

export function RoutesVehiclesModule() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Route form state
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeNo, setRouteNo] = useState("");
  const [routeName, setRouteName] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [savingRoute, setSavingRoute] = useState(false);

  // Vehicle form state
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleNo, setVehicleNo] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState<"routes" | "vehicles">("routes");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [routesRes, vehiclesRes] = await Promise.all([
        fetch("/api/routes-vehicles/routes"),
        fetch("/api/routes-vehicles/vehicles"),
      ]);

      if (!routesRes.ok || !vehiclesRes.ok) {
        throw new Error("Failed to load data.");
      }

      const routesData = await routesRes.json();
      const vehiclesData = await vehiclesRes.json();

      setRoutes(routesData.routes || []);
      setVehicles(vehiclesData.vehicles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async () => {
    setError(null);
    setSuccess(null);
    setSavingRoute(true);
    try {
      const response = await fetch("/api/routes-vehicles/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeNo,
          name: routeName,
          description: routeDescription || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create route.");
      }

      setSuccess("Route created successfully!");
      setRouteDialogOpen(false);
      resetRouteForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create route.");
    } finally {
      setSavingRoute(false);
    }
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute) return;
    setError(null);
    setSuccess(null);
    setSavingRoute(true);
    try {
      const response = await fetch(
        `/api/routes-vehicles/routes/${editingRoute.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routeNo,
            name: routeName,
            description: routeDescription || null,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update route.");
      }

      setSuccess("Route updated successfully!");
      setRouteDialogOpen(false);
      resetRouteForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update route.");
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/routes-vehicles/routes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete route.");
      }

      setSuccess("Route deleted successfully!");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route.");
    }
  };

  const handleCreateVehicle = async () => {
    setError(null);
    setSuccess(null);
    setSavingVehicle(true);
    try {
      const response = await fetch("/api/routes-vehicles/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNo,
          type: vehicleType || null,
          model: vehicleModel || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create vehicle.");
      }

      setSuccess("Vehicle created successfully!");
      setVehicleDialogOpen(false);
      resetVehicleForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create vehicle."
      );
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleUpdateVehicle = async () => {
    if (!editingVehicle) return;
    setError(null);
    setSuccess(null);
    setSavingVehicle(true);
    try {
      const response = await fetch(
        `/api/routes-vehicles/vehicles/${editingVehicle.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleNo,
            type: vehicleType || null,
            model: vehicleModel || null,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update vehicle.");
      }

      setSuccess("Vehicle updated successfully!");
      setVehicleDialogOpen(false);
      resetVehicleForm();
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update vehicle."
      );
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/routes-vehicles/vehicles/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete vehicle.");
      }

      setSuccess("Vehicle deleted successfully!");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete vehicle."
      );
    }
  };

  const resetRouteForm = () => {
    setRouteNo("");
    setRouteName("");
    setRouteDescription("");
    setEditingRoute(null);
  };

  const resetVehicleForm = () => {
    setVehicleNo("");
    setVehicleType("");
    setVehicleModel("");
    setEditingVehicle(null);
  };

  const openRouteDialog = (route?: Route) => {
    if (route) {
      setEditingRoute(route);
      setRouteNo(route.routeNo);
      setRouteName(route.name);
      setRouteDescription(route.description || "");
    } else {
      resetRouteForm();
    }
    setRouteDialogOpen(true);
  };

  const openVehicleDialog = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setVehicleNo(vehicle.vehicleNo);
      setVehicleType(vehicle.type || "");
      setVehicleModel(vehicle.model || "");
    } else {
      resetVehicleForm();
    }
    setVehicleDialogOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        handleImport(jsonData);
      } catch (err) {
        setError("Failed to parse Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async (data: any[]) => {
    setImporting(true);
    setError(null);
    setImportResults([]);

    try {
      const endpoint =
        importType === "routes"
          ? "/api/routes-vehicles/routes/import"
          : "/api/routes-vehicles/vehicles/import";

      const payload =
        importType === "routes"
          ? {
              routes: data.map((row) => ({
                routeNo: row.RouteNo || row.routeNo || row["Route No"],
                name: row.Name || row.name,
                description: row.Description || row.description || null,
              })),
            }
          : {
              vehicles: data.map((row) => ({
                vehicleNo: row.VehicleNo || row.vehicleNo || row["Vehicle No"],
                type: row.Type || row.type || null,
                model: row.Model || row.model || null,
              })),
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Import failed.");
      }

      setImportResults(result.results || []);
      setSuccess(result.message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template =
      importType === "routes"
        ? [
            { RouteNo: "R001", Name: "Route 1", Description: "Description" },
            { RouteNo: "R002", Name: "Route 2", Description: "Description" },
          ]
        : [
            { VehicleNo: "ABC-123", Type: "Truck", Model: "Toyota Hilux" },
            { VehicleNo: "XYZ-456", Type: "Van", Model: "Suzuki Every" },
            { VehicleNo: "DEF-789", Type: "Motorcycle", Model: "Honda CD 70" },
          ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      importType === "routes" ? "Routes" : "Vehicles"
    );
    XLSX.writeFile(
      workbook,
      `${importType}_template.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Routes & Vehicles Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="routes">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="routes">Routes</TabsTrigger>
              <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            </TabsList>

            <TabsContent value="routes" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Routes</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportType("routes");
                      downloadTemplate();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportType("routes");
                      setImportDialogOpen(true);
                      setImportResults([]);
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Excel
                  </Button>
                  <Button size="sm" onClick={() => openRouteDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Route
                  </Button>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading routes...</p>
              ) : routes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No routes available.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Route No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => (
                      <TableRow key={route.id}>
                        <TableCell className="font-medium">
                          {route.routeNo}
                        </TableCell>
                        <TableCell>{route.name}</TableCell>
                        <TableCell>{route.description || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={route.isActive ? "default" : "secondary"}
                          >
                            {route.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRouteDialog(route)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteRoute(route.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="vehicles" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Vehicles</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportType("vehicles");
                      downloadTemplate();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportType("vehicles");
                      setImportDialogOpen(true);
                      setImportResults([]);
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Excel
                  </Button>
                  <Button size="sm" onClick={() => openVehicleDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-muted-foreground">
                  Loading vehicles...
                </p>
              ) : vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No vehicles available.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle No</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          {vehicle.vehicleNo}
                        </TableCell>
                        <TableCell>{vehicle.type || "-"}</TableCell>
                        <TableCell>{vehicle.model || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={vehicle.isActive ? "default" : "secondary"}
                          >
                            {vehicle.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVehicleDialog(vehicle)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteVehicle(vehicle.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Route Dialog */}
      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? "Edit Route" : "Add New Route"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routeNo">Route Number *</Label>
              <Input
                id="routeNo"
                value={routeNo}
                onChange={(e) => setRouteNo(e.target.value)}
                placeholder="e.g., R001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routeName">Name *</Label>
              <Input
                id="routeName"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="e.g., Main Route"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routeDescription">Description</Label>
              <Textarea
                id="routeDescription"
                value={routeDescription}
                onChange={(e) => setRouteDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRouteDialogOpen(false);
                resetRouteForm();
              }}
              disabled={savingRoute}
            >
              Cancel
            </Button>
            <Button
              onClick={editingRoute ? handleUpdateRoute : handleCreateRoute}
              disabled={savingRoute}
            >
              {savingRoute
                ? editingRoute
                  ? "Updating..."
                  : "Creating..."
                : editingRoute
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleNo">Vehicle Number *</Label>
              <Input
                id="vehicleNo"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="e.g., V001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleType">Type</Label>
              <Input
                id="vehicleType"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="e.g., Truck, Van"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleModel">Model</Label>
              <Input
                id="vehicleModel"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g., Model X"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVehicleDialogOpen(false);
                resetVehicleForm();
              }}
              disabled={savingVehicle}
            >
              Cancel
            </Button>
            <Button
              onClick={
                editingVehicle ? handleUpdateVehicle : handleCreateVehicle
              }
              disabled={savingVehicle}
            >
              {savingVehicle
                ? editingVehicle
                  ? "Updating..."
                  : "Creating..."
                : editingVehicle
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Import {importType === "routes" ? "Routes" : "Vehicles"} from
              Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <div className="flex-1">
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={importing}
                />
              </div>
            </div>

            {importing && (
              <p className="text-sm text-muted-foreground">
                Importing data...
              </p>
            )}

            {importResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Import Results</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {importType === "routes" ? "Route No" : "Vehicle No"}
                      </TableHead>
                      <TableHead>
                        {importType === "routes" ? "Name" : "Type"}
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {result.routeNo || result.vehicleNo || "N/A"}
                        </TableCell>
                        <TableCell>
                          {result.name || result.type || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={result.success ? "default" : "destructive"}
                          >
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {result.error || "Imported successfully"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setImportDialogOpen(false);
                setImportResults([]);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
