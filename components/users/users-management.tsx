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

type Role = { id: string; name: string };
type Location = { id: string; name: string; city: string };
type UserSummary = {
  id: string;
  email: string;
  isActive: boolean;
  location: Location;
  roles: Role[];
};

export function UsersManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [email, setEmail] = useState("");
  const [locationId, setLocationId] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

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
        body: JSON.stringify({ email, locationId, roleIds }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to create user.");
      }
      setCreatedPassword(result.password || null);
      setEmail("");
      setLocationId("");
      setRoleIds([]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create User</CardTitle>
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
                {roles?.filter(r=>!["Super Admin","Admin"].includes(r.name))?.map((role) => (
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
                  <TableHead>Location</TableHead>
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
    </div>
  );
}
