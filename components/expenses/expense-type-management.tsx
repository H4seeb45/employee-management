"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import * as XLSX from "xlsx";
import { Download, Upload, AlertTriangle } from "lucide-react";

type Location = {
  id: string;
  name: string;
  city: string;
};

type ExpenseType = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  requiresRouteAndVehicle: boolean;
  expenseCode?: string | null;
  locationId: string | null;
  location?: Location;
};

export function ExpenseTypeManagement() {
  const [loading, setLoading] = useState(true);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ExpenseType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    locationId: "",
    isActive: true,
    requiresRouteAndVehicle: false,
    expenseCode: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    console.log("ExpenseTypeManagement mounted. current location:", selectedLocationId);
    fetchLocations();
    fetchExpenseTypes();
  }, []);

  useEffect(() => {
    fetchExpenseTypes();
  }, [selectedLocationId]);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  const fetchExpenseTypes = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/expense-types", window.location.origin);
      if (selectedLocationId !== "all") {
        url.searchParams.append("locationId", selectedLocationId);
      }
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setExpenseTypes(data.expenseTypes || []);
      }
    } catch (err) {
      console.error("Failed to fetch expense types:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type: any | null = null) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description || "",
        locationId: type.locationId || "",
        isActive: type.isActive,
        requiresRouteAndVehicle: type.requiresRouteAndVehicle,
        expenseCode: type.expenseCode || "",
      });
    } else {
      setEditingType(null);
      setFormData({
        name: "",
        description: "",
        locationId: selectedLocationId !== "all" ? selectedLocationId : "",
        isActive: true,
        requiresRouteAndVehicle: false,
        expenseCode: "",
      });
    }
    setIsModalOpen(true);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!formData.name || !formData.expenseCode || !formData.locationId) {
      setError("Name, Expense Code, and Location are required.");
      setSaving(false);
      return;
    }

    const url = editingType 
      ? `/api/expense-types/${editingType.id}` 
      : "/api/expense-types";
    const method = editingType ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess(`Expense type ${editingType ? "updated" : "created"} successfully!`);
        setIsModalOpen(false);
        fetchExpenseTypes();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to save expense type");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense type? It can only be deleted if it is not in use.")) return;

    try {
      const res = await fetch(`/api/expense-types/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Expense type deleted successfully!");
        fetchExpenseTypes();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete expense type");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLocationId === "all") return;
    const locationName = locations.find(l => l.id === selectedLocationId)?.name;
    
    if (!confirm(`DANGER: Are you sure you want to delete ALL expense types for ${locationName}? This will only work for types NOT in use.`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/expense-types?locationId=${selectedLocationId}`, { method: "DELETE" });
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(data.message);
        fetchExpenseTypes();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message);
        if (data.usedTypes) {
          console.log("Types in use:", data.usedTypes);
        }
      }
    } catch (err) {
      setError("Failed to perform bulk delete");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (filteredTypes.length === 0) {
      alert("No records to export.");
      return;
    }
    
    const dataToExport = filteredTypes.map(t => ({
      "Type Name*": t.name,
      "Description": t.description || "",
      "Code*": t.expenseCode || "",
      "Vehicle Required (true/false)": t.requiresRouteAndVehicle ? "true" : "false",
      "Active (true/false)": t.isActive ? "true" : "false",
      "Location": t.location?.name || ""
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expense Types");
    
    const fileName = selectedLocationId === "all" 
      ? "All_Expense_Types.xlsx" 
      : `Expense_Types_${locations.find(l => l.id === selectedLocationId)?.name || 'Location'}.xlsx`;
      
    XLSX.writeFile(wb, fileName);
  };

  const downloadTemplate = () => {
    const template = [
      { "Type Name*": "Fuel", "Description": "Vehicle fuel", "Code*": "VEHICLE_FUEL", "Vehicle Required (true/false)": "true", "Active (true/false)": "true" },
      { "Type Name*": "Rent", "Description": "Office rent", "Code*": "OFFICE_RENT", "Vehicle Required (true/false)": "false", "Active (true/false)": "true" },
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Expense_Types_Template.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedLocationId === "all") {
      if (selectedLocationId === "all") alert("Please select a specific location first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstream = evt.target?.result;
        const wb = XLSX.read(bstream, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formattedData = data.map((row: any) => {
          // Helper to find value by multiple possible keys
          const getValue = (keys: string[]) => {
            const key = keys.find(k => k in row);
            return key ? row[key] : undefined;
          };

          const name = getValue(["Type Name*", "Name*", "Name", "Type Name"]);
          const expenseCode = getValue(["Code*", "Expense Code*", "Expense Code", "Code", "expenseCode"]);
          
          if (!name) return null;

          return {
            name,
            description: getValue(["Description", "desc"]),
            expenseCode: expenseCode || "",
            requiresRouteAndVehicle: String(getValue(["Vehicle Required (true/false)", "Requires Vehicle/Route (true/false)", "Requires Vehicle/Route", "Vehicle Required"]) || "false").toLowerCase() === "true",
            isActive: String(getValue(["Active (true/false)", "Is Active (true/false)", "Is Active", "Active"]) || "true").toLowerCase() !== "false",
            locationId: selectedLocationId
          };
        }).filter(Boolean);

        console.log("Importing formatted data:", formattedData);

        if (formattedData.length === 0) {
          alert("No valid expense types found in Excel sheet. Check headers.");
          return;
        }

        setSaving(true);
        const res = await fetch("/api/expense-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formattedData),
        });

        const result = await res.json();
        if (res.ok) {
          setSuccess(result.message);
          fetchExpenseTypes();
          setTimeout(() => setSuccess(null), 5000);
        } else {
          setError(result.message);
        }
      } catch (err) {
        console.error("Import error:", err);
        setError("Failed to process Excel file");
      } finally {
        setSaving(false);
        // Reset file input
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredTypes = expenseTypes.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.location?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Expense Types Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Configure dynamic expense types for each location
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* {selectedLocationId !== "all" && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              className="bg-rose-500 hover:bg-rose-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Location
            </Button>
          )} */}
          <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense Type
          </Button>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
               <Input
                placeholder="Search types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={downloadTemplate}
                className="text-slate-600 border-slate-200"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Template
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToExcel}
                className="text-emerald-600 border-emerald-200 bg-emerald-50/50"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
              <div className="relative">
                <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 bg-blue-50/50">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Import
                </Button>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleImport}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} - {loc.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="font-semibold">Type Name</TableHead>
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                   <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-center">Vehicle/Route Req.</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                    </TableCell>
                  </TableRow>
                ) : filteredTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                      No expense types found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTypes.map((type) => (
                    <TableRow key={type.id} className="group">
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {type.name}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                          {type.expenseCode || "-"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {type.location?.name || "Global"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-slate-500">
                        {type.description || "-"}
                      </TableCell>
                       <TableCell className="text-center">
                        <Badge className={type.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}>
                          {type.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={type.requiresRouteAndVehicle ? "border-amber-200 text-amber-700 bg-amber-50" : "text-slate-400 border-slate-200"}>
                          {type.requiresRouteAndVehicle ? "Required" : "Not Required"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenModal(type)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {/* <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(type.id)}
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Expense Type" : "Add New Expense Type"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="locationId">Location <span className="text-rose-500">*</span></Label>
              <Select 
                value={formData.locationId} 
                onValueChange={(val) => setFormData({ ...formData, locationId: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} - {loc.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Type Name <span className="text-rose-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Fuel, Rent, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseCode">Expense Code <span className="text-rose-500">*</span></Label>
              <Input
                id="expenseCode"
                value={formData.expenseCode}
                onChange={(e) => setFormData({ ...formData, expenseCode: e.target.value })}
                placeholder="e.g. VEHICLE_FUEL"
                required
              />
              <p className="text-[10px] text-slate-500">Internal code for references/logic (REQUIRED)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>

             <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-[10px] text-slate-500">Allow users to select this type</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Require Vehicle & Route</Label>
                <p className="text-[10px] text-slate-500">Forces user to select vehicle/route for this expense</p>
              </div>
              <Switch
                checked={formData.requiresRouteAndVehicle}
                onCheckedChange={(val) => setFormData({ ...formData, requiresRouteAndVehicle: val })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
