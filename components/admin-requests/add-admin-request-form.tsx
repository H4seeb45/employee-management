"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { useLayout } from "../layout/layout-provider";

interface AddAdminRequestFormProps {
  onSubmit: (data: any) => Promise<void>;
}

export function AddAdminRequestForm({ onSubmit }: AddAdminRequestFormProps) {
  const { employees, user } = useLayout();
  const isAdmin = user?.roles?.some((role: any) => ["Admin", "Super Admin"].includes(role));
  const isBusinessManager = user?.roles?.some((role: any) => ["Business Manager"].includes(role));
  const currentUserEmployee = employees.find((e) => e.userId === user?.id);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    subject: "",
    details: "",
  });

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    const emp = employees.find((e) => e.id === value);
    setFormData((prev) => ({
      ...prev,
      employeeId: value,
      employeeName: emp?.employeeName || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.details || !formData.employeeId) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {(isAdmin || isBusinessManager) && (
          <div>
            <Label htmlFor="employeeId">Select Employee</Label>
            <Select
              value={formData.employeeId}
              onValueChange={handleSelectChange}
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

        {!isAdmin && !isBusinessManager && (
          <div>
            <Label>Employee Name</Label>
            <Input value={formData.employeeName} disabled className="mt-2" />
          </div>
        )}

        <div>
          <Label htmlFor="subject">Subject (Required)</Label>
          <Input
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="mt-2"
            placeholder="Enter request subject"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label htmlFor="details">Request Details (Required)</Label>
          <Textarea
            id="details"
            name="details"
            value={formData.details}
            onChange={handleChange}
            className="mt-2 min-h-[120px]"
            placeholder="Provide detailed information about your request"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          className="bg-sky-600 hover:bg-sky-700"
          disabled={!formData.employeeId || !formData.subject || !formData.details || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}
