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
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, CheckCircle2, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEPARTMENTS, DESIGNATIONS_BY_DEPARTMENT, EMPLOYMENT_STATUSES } from "@/lib/constants";
import { UploadButton } from "@/lib/uploadthing";

interface EditEmployeeFormProps {
  employee: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function EditEmployeeForm({
  employee,
  onSubmit,
  onCancel,
}: EditEmployeeFormProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const [locations, setLocations] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    ...employee,
    joinDate: employee.joinDate || new Date().toISOString(),
  });

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => res.json())
      .then((data) => setLocations(data.locations || []))
      .catch((err) => console.error("Error fetching locations:", err));
  }, []);

  useEffect(() => {
    setFormData({
      ...employee,
      joinDate: employee.joinDate || new Date().toISOString(),
    });
  }, [employee]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Numbers only validation for CNIC and phones
    if (["cnicNumber", "phone", "emergencyContactNumber", "referenceNumber"].includes(name)) {
      const numbersOnly = value.replace(/\D/g, "");
      if (name === "cnicNumber" && numbersOnly.length > 13) return;
      if (name !== "cnicNumber" && numbersOnly.length > 11) return;
      setFormData((prev: any) => ({ ...prev, [name]: numbersOnly }));
      return;
    }

    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "locationId") {
      const loc = locations.find(l => l.id === value);
      setFormData((prev: any) => ({ ...prev, locationId: value, setupName: loc ? `${loc.name} (${loc.city})` : "" }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleRemoveFile = async (name: string) => {
    const fileUrl = formData[name];
    if (!fileUrl) return;

    const isOriginalFile = employee[name] === fileUrl;

    // Remove from state immediately
    setFormData((prev: any) => ({ ...prev, [name]: "" }));

    // Only delete from server if it's NOT the original file
    // (Original files are deleted by the PATCH route ONLY on successful submission)
    if (!isOriginalFile) {
      try {
        await fetch("/api/uploadthing/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: fileUrl }),
        });
      } catch (err) {
        console.error("Failed to delete file:", err);
      }
    }
  };


  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const validatePhone = (phone: string) => {
    return /^03\d{9}$/.test(phone);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (formData.email && !validateEmail(formData.email)) {
      alert("Please enter a valid email address");
      return;
    }
    if (formData.referenceEmail && !validateEmail(formData.referenceEmail)) {
      alert("Please enter a valid reference email address");
      return;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      alert("Mobile number must be in format 03XXXXXXXXX (11 digits)");
      return;
    }
    if (formData.emergencyContactNumber && !validatePhone(formData.emergencyContactNumber)) {
      alert("Emergency contact number must be in format 03XXXXXXXXX (11 digits)");
      return;
    }
    if (formData.referenceNumber && !validatePhone(formData.referenceNumber)) {
      alert("Reference contact number must be in format 03XXXXXXXXX (11 digits)");
      return;
    }

    const requiredPersonalFields = [
      "employeeName", "cnicNumber", "cnicIssueDate", "cnicExpiryDate", 
      "phone", "fatherName", "emergencyContactName", "emergencyContactNumber", 
      "birthDate", "bloodGroup", "maritalStatus", "gender", "email", 
      "referenceName", "referenceEmail", "referenceNumber", "address"
    ];

    const missingFields = requiredPersonalFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      alert("All fields in the Personal Info tab are required.");
      setActiveTab("personal");
      return;
    }

    onSubmit(formData);
  };

  const renderDateField = (label: string, name: string, required = false) => {
    return (
      <div className="space-y-2">
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          type="date"
          name={name}
          value={formData[name] ? formData[name].split("T")[0] : ""}
          onChange={handleChange}
          required={required}
          className="w-full h-9 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        />
      </div>
    );
  };

  const documentFields = [
    { label: "Photograph", name: "avatar" },
    { label: "CNIC Copy", name: "cnicCopyUrl" },
    { label: "Educational documents", name: "eduDocsUrl" },
    { label: "CV", name: "cvUrl" },
    { label: "Employee Guarantee Cheque", name: "guaranteeChequeUrl" },
    { label: "Guarantor Cheque", name: "guarantorChequeUrl" },
    { label: "Guarantor CNIC Copy", name: "guarantorCnicUrl" },
    { label: "Stamp Paper", name: "stampPaperUrl" },
    { label: "Utility Bill Copy", name: "utilityBillUrl" },
    { label: "Driving License Copy", name: "drivingLicenseUrl" },
    { label: "Police Certificate", name: "policeCertUrl" },
    { label: "Clearance/Experience Letter", name: "clearanceLetterUrl" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-12 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="personal" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Personal Info</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Documents Info</TabsTrigger>
          <TabsTrigger value="employment" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Employment Info</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeName">Full Name <span className="text-red-500">*</span></Label>
              <Input id="employeeName" name="employeeName" value={formData.employeeName || ""} onChange={handleChange} required className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnicNumber">CNIC Number (Numbers Only) <span className="text-red-500">*</span></Label>
              <Input id="cnicNumber" name="cnicNumber" value={formData.cnicNumber || ""} onChange={handleChange} placeholder="13 digits" required className="border-slate-200 dark:border-slate-700" />
            </div>
            {renderDateField("CNIC Issue Date", "cnicIssueDate", true)}
            {renderDateField("CNIC Expiry Date", "cnicExpiryDate", true)}
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number (03XXXXXXXXX) <span className="text-red-500">*</span></Label>
              <Input id="phone" name="phone" value={formData.phone || ""} onChange={handleChange} placeholder="03xxxxxxxxx" required className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatherName">Father's Name <span className="text-red-500">*</span></Label>
              <Input id="fatherName" name="fatherName" value={formData.fatherName || ""} onChange={handleChange} required className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Emergency Contact Name <span className="text-red-500">*</span></Label>
              <Input id="emergencyContactName" name="emergencyContactName" value={formData.emergencyContactName || ""} onChange={handleChange} required className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactNumber">Emergency Contact (03XXXXXXXXX) <span className="text-red-500">*</span></Label>
              <Input id="emergencyContactNumber" name="emergencyContactNumber" value={formData.emergencyContactNumber || ""} onChange={handleChange} placeholder="03xxxxxxxxx" required className="border-slate-200 dark:border-slate-700" />
            </div>
            {renderDateField("Date of Birth (DOB)", "birthDate", true)}
            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood Group <span className="text-red-500">*</span></Label>
              <Select value={formData.bloodGroup || ""} onValueChange={(v) => handleSelectChange("bloodGroup", v)}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Marital Status <span className="text-red-500">*</span></Label>
              <Select value={formData.maritalStatus || ""} onValueChange={(v) => handleSelectChange("maritalStatus", v)}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Single", "Married", "Divorced", "Widowed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
              <Select value={formData.gender || ""} onValueChange={(v) => handleSelectChange("gender", v)}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
              <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} required className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceName">Professional Reference Name <span className="text-red-500">*</span></Label>
              <Input id="referenceName" name="referenceName" value={formData.referenceName || ""} onChange={handleChange} required className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceEmail">Reference Email Address <span className="text-red-500">*</span></Label>
              <Input id="referenceEmail" name="referenceEmail" type="email" value={formData.referenceEmail || ""} onChange={handleChange} required className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Contact (03XXXXXXXXX) <span className="text-red-500">*</span></Label>
              <Input id="referenceNumber" name="referenceNumber" value={formData.referenceNumber || ""} onChange={handleChange} required placeholder="03xxxxxxxxx" className="border-slate-200 dark:border-slate-700" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
            <Textarea id="address" name="address" value={formData.address || ""} onChange={handleChange} rows={2} required className="border-slate-200 dark:border-slate-700" />
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documentFields.map((doc) => (
              <div key={doc.name} className="flex flex-col gap-2 p-4 border rounded-xl bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20">
                      <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <Label className="text-sm font-semibold">{doc.label}</Label>
                  </div>
                  {formData[doc.name] && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      onClick={() => handleRemoveFile(doc.name)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {formData[doc.name] ? (
                  <div className="flex items-center gap-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 truncate max-w-[200px]">File Uploaded Successfully</span>
                    <a href={formData[doc.name]} target="_blank" rel="noreferrer" className="ml-auto text-xs font-medium text-sky-600 hover:underline">View</a>
                  </div>
                ) : (
                  <UploadButton
                    endpoint="employeeDocument"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]) handleSelectChange(doc.name, res[0].url);
                    }}
                    onUploadError={(error: Error) => alert(`Upload Error: ${error.message}`)}
                    appearance={{
                      button: "bg-sky-600 hover:bg-sky-700 text-white text-xs h-9 w-full rounded-lg transition-all shadow-sm font-medium",
                      allowedContent: "hidden"
                    }}
                    content={{
                      button({ isUploading }) {
                        if (isUploading) return <Loader2 className="h-4 w-4 animate-spin" />;
                        return <div className="flex items-center gap-2"><Upload className="h-4 w-4" /> Upload {doc.label}</div>;
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="employment" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locationId">Setup Name / Office <span className="text-red-500">*</span></Label>
              <Select value={formData.locationId || ""} onValueChange={(v) => handleSelectChange("locationId", v)}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Select Office" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID <span className="text-red-500">*</span></Label>
              <Input id="employeeId" name="employeeId" value={formData.employeeId || ""} onChange={handleChange} required className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
              <Select value={formData.department || ""} onValueChange={(v) => {
                handleSelectChange("department", v);
                handleSelectChange("position", "");
              }}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select Department" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Designation <span className="text-red-500">*</span></Label>
              <Select value={formData.position || ""} onValueChange={(v) => handleSelectChange("position", v)} disabled={!formData.department}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                <SelectContent>
                  {(DESIGNATIONS_BY_DEPARTMENT[formData.department] || []).map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Employment Status</Label>
              <Select value={formData.status || ""} onValueChange={(v) => handleSelectChange("status", v)}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select Status" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {renderDateField("Date of Joining", "joinDate", true)}
            {renderDateField("Date of Leaving", "leaveDate")}
            {renderDateField("Probation & Confirmation Date", "probationConfirmationDate")}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 px-8 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Cancel
        </Button>
        <Button type="submit" className="bg-sky-600 hover:bg-sky-700 h-11 px-10 rounded-xl font-bold text-white shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
          Apply Changes
        </Button>
      </div>
    </form>
  );
}
