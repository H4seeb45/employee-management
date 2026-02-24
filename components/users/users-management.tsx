"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";

type Role = { id: string; name: string };
type Location = { id: string; name: string; city: string };
type UserSummary = {
  id: string;
  email: string;
  isActive: boolean;
  location: Location;
  authorizedLocations?: Location[];
  roles: Role[];
};

export function UsersManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [email, setEmail] = useState("");
  const [locationId, setLocationId] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [authorizedLocationIds, setAuthorizedLocationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ email: string; success: boolean; password?: string; error?: string }[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, locationsRes, usersRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/locations"),
        fetch("/api/users"),
      ]);
      if (!rolesRes.ok || !locationsRes.ok || !usersRes.ok) {
        throw new Error("Failed to load users data.");
      }
      const rolesData = await rolesRes.json();
      const locationsData = await locationsRes.json();
      const usersData = await usersRes.json();
      setRoles(rolesData.roles ?? []);
      setLocations(locationsData.locations ?? []);
      setUsers(usersData.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isCashier = useMemo(() => {
    return roles.some(
      (r) => roleIds.includes(r.id) && r.name === "Cashier"
    );
  }, [roles, roleIds]);

  const locationOptions = useMemo(
    () =>
      locations.map((location) => ({
        value: location.id,
        label: `${location.city} - ${location.name}`,
      })),
    [locations]
  );

  const toggleRole = (roleId: string) => {
    setRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId]
    );
  };

  const toggleAuthorizedLocation = (locId: string) => {
    setAuthorizedLocationIds((current) =>
      current.includes(locId)
        ? current.filter((id) => id !== locId)
        : [...current, locId]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setCreatedPassword(null);
    if (!email || !locationId || roleIds.length === 0) {
      setError("Please provide email, location, and at least one role.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          locationId,
          roleIds,
          authorizedLocationIds: isCashier ? authorizedLocationIds : [],
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to create user.");
      }
      setCreatedPassword(result.password || null);
      setEmail("");
      setLocationId("");
      setRoleIds([]);
      setAuthorizedLocationIds([]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        Email: "user@example.com",
        Location: "Karachi - Main Branch",
        Roles: "Cashier, Business Manager",
        AuthorizedLocations: "Lahore - Branch A, Islamabad - Branch B",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users Template");
    XLSX.writeFile(wb, "users_import_template.xlsx");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults([]);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const payload = {
          users: jsonData.map((row) => ({
            email: row.Email || row.email,
            location: row.Location || row.location,
            roles: row.Roles || row.roles,
            authorizedLocations: row.AuthorizedLocations || row.Authorized_Locations || row.authorizedLocations,
          })),
        };

        const res = await fetch("/api/users/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (Array.isArray(result.results)) {
          setImportResults(result.results);
        }
        
        if (res.ok) {
          await loadData();
        } else {
          setError(result.message || "Import failed.");
        }
      } catch (err) {
        setError("Error processing file.");
        console.error(err);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadImportResults = () => {
    const successResults = importResults
      .filter((r) => r.success)
      .map((r) => ({
        Email: r.email,
        Password: r.password,
        Status: "Created Successfully",
      }));

    if (successResults.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(successResults);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Created Users");
    XLSX.writeFile(wb, `created_users_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Create User</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportDialogOpen(true);
                setImportResults([]);
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Users
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {createdPassword ? (
            <Alert className="mb-4">
              <AlertTitle>Temporary password</AlertTitle>
              <AlertDescription>
                Share this password with the user:{" "}
                <span className="font-semibold">{createdPassword}</span>
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert className="mb-4" variant="destructive">
              <AlertTitle>Unable to create user</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {roles?.filter(r=>!["Super Admin","Admin", "Accountant", "Employee"].includes(r.name))?.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={roleIds.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>

            {isCashier && (
              <div className="space-y-2 border-t pt-4">
                <Label>Authorized Locations (for Cashier)</Label>
                <div className="grid gap-2 md:grid-cols-3">
                  {locations.map((loc) => (
                    <label
                      key={loc.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={authorizedLocationIds.includes(loc.id)}
                        onCheckedChange={() => toggleAuthorizedLocation(loc.id)}
                      />
                      {loc.city} - {loc.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Primary Location</TableHead>
                  <TableHead>Authorized Locations</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.location?.city} - {user.location?.name}
                    </TableCell>
                    <TableCell>
                      {user.roles.some((r) => r.name === "Cashier") ? (
                        <div className="text-xs text-muted-foreground">
                          {user.authorizedLocations && user.authorizedLocations.length > 0
                            ? user.authorizedLocations
                                .map((l) => `${l.city}-${l.name}`)
                                .join(", ")
                            : "No multiple locations"}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {user.roles.map((role) => role.name).join(", ")}
                    </TableCell>
                    <TableCell>{user.isActive ? "Active" : "Inactive"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Users from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file with columns: Email, Location, Roles, and AuthorizedLocations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="users-excel">Excel File</Label>
              <Input
                id="users-excel"
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImport}
                disabled={importing}
              />
            </div>

            {importing && <p className="text-sm text-blue-600">Importing users, please wait...</p>}

            {importResults.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium text-xs">
                          {result.email}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {result.password || "-"}
                        </TableCell>
                        <TableCell>
                          {result.success ? (
                            <span className="text-green-600 text-xs">Success</span>
                          ) : (
                            <span className="text-red-600 text-xs">Failed</span>
                          )}
                        </TableCell>
                        <TableCell className="text-red-500 text-xs">
                          {result.error || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-between items-center sm:justify-between">
            {importResults.some((r) => r.success) && (
              <Button
                variant="outline"
                onClick={downloadImportResults}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Results
              </Button>
            )}
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
