"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLayout } from "../layout/layout-provider";

interface AddLeaveRequestFormProps {
  onSubmit: (data: any) => void;
}

export function AddLeaveRequestForm({ onSubmit }: AddLeaveRequestFormProps) {
  const { employees, user } = useLayout();
  const isAdmin = user?.roles?.some((role: any) => ["Admin"].includes(role));
  const isSuperAdmin = user?.roles?.some((role: any) => ["Super Admin"].includes(role));
  const isBusinessManager = user?.roles?.some((role: any) => ["Business Manager"].includes(role));
  const currentUserEmployee = employees.find((e) => e.userId === user?.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    leaveType: "Sick Leave",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    days: "1",
    reason: "",
  });

  // Sync form data when user/employees load
  useEffect(() => {
    if (!isAdmin && currentUserEmployee && !formData.employeeId) {
      setFormData((prev) => ({
        ...prev,
        employeeId: currentUserEmployee.id,
        employeeName: currentUserEmployee.employeeName,
      }));
    }
  }, [isAdmin, currentUserEmployee, formData.employeeId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "startDate" || name === "endDate") {
        const start = name === "startDate" ? new Date(value) : new Date(prev.startDate);
        const end = name === "endDate" ? new Date(value) : new Date(prev.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          newData.days = diffDays.toString();
        }
      }
      return newData;
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "employeeId") {
      const emp = employees.find((e) => e.id === value);
      setFormData((prev) => ({
        ...prev,
        employeeId: value,
        employeeName: emp?.employeeName || "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        days: Number.parseInt(formData.days),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(isAdmin || isSuperAdmin || isBusinessManager) && (
          <div>
            <Label htmlFor="employeeId">Select Employee</Label>
            <Select
              value={formData.employeeId}
              onValueChange={(value) => handleSelectChange("employeeId", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.employeeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!isAdmin && !isSuperAdmin && !isBusinessManager && (
          <div>
            <Label>Employee Name</Label>
            <Input value={formData.employeeName} disabled className="mt-2" />
          </div>
        )}

        <div>
          <Label htmlFor="leaveType">Leave Type</Label>
          <Select
            value={formData.leaveType}
            onValueChange={(value) => handleSelectChange("leaveType", value)}
            disabled={isSubmitting}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select leave type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sick Leave">Sick Leave</SelectItem>
              <SelectItem value="Medical Leave">Medical Leave</SelectItem>
              <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
              <SelectItem value="Annual Leave">Annual Leave</SelectItem>
              <SelectItem value="Casual Leave">Casual Leave</SelectItem>
              <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="mt-2"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="mt-2"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="days">Number of Days</Label>
          <Input
            type="number"
            id="days"
            name="days"
            value={formData.days}
            onChange={handleChange}
            className="mt-2"
            min="1"
            readOnly
            disabled
          />
        </div>
      </div>

      <div>
        <Label htmlFor="reason">Reason for Leave (Required)</Label>
        <Input
          id="reason"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          className="mt-2"
          placeholder="Enter reason for leave"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          className="bg-sky-600 hover:bg-sky-700"
          disabled={!formData.employeeId || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}
