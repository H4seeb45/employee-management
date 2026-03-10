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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("");
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

    // Non-negative number validation for salary fields
    const salaryNumericFields = [
      "basicSalary", "attendanceAllowance", "dailyAllowance", "fuelAllowance",
      "conveyanceAllowance", "maintainence", "comission", "eachKpiIncentives",
      "incentives", "categoryIncentive"
    ];
    if (salaryNumericFields.includes(name)) {
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

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
      "birthDate", "bloodGroup", "maritalStatus", "gender", "address"
    ];

    const missingFields = requiredPersonalFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      alert("All fields in the Personal Info tab are required.");
      setActiveTab("personal");
      return;
    }

    // Salary Info validation
    const requiredSalaryFields = [
      "basicSalary", "attendanceAllowance", "dailyAllowance", "fuelAllowance",
      "conveyanceAllowance", "maintainence", "comission", "eachKpiIncentives",
      "incentives", "categoryIncentive", "taxDeduction", "eobiDeduction",
      "socialSecurityDeduction"
    ];
    const missingSalaryFields = requiredSalaryFields.filter(field => !formData[field] && formData[field] !== 0);
    if (missingSalaryFields.length > 0) {
      alert("All fields in the Salary Info tab are required.");
      setActiveTab("salary");
      return;
    }

    // Convert salary numeric fields from strings to numbers before submit
    const salaryNumericFields = [
      "basicSalary", "attendanceAllowance", "dailyAllowance", "fuelAllowance",
      "conveyanceAllowance", "maintainence", "comission", "eachKpiIncentives",
      "incentives", "categoryIncentive"
    ];
    const submissionData = { ...formData };
    for (const field of salaryNumericFields) {
      if (submissionData[field] !== undefined && submissionData[field] !== "" && submissionData[field] !== null) {
        submissionData[field] = parseFloat(submissionData[field]);
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(submissionData);
    } finally {
      setIsSubmitting(false);
    }
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
        <TabsList className="grid w-full grid-cols-4 mb-8 h-12 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="personal" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Personal Info</TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Documents Info</TabsTrigger>
          <TabsTrigger value="employment" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Employment Info</TabsTrigger>
          <TabsTrigger value="salary" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">Salary Info</TabsTrigger>
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
              <Label htmlFor="email">Email Address </Label>
              <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceName">Professional Reference Name </Label>
              <Input id="referenceName" name="referenceName" value={formData.referenceName || ""} onChange={handleChange} className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceEmail">Reference Email Address </Label>
              <Input id="referenceEmail" name="referenceEmail" type="email" value={formData.referenceEmail || ""} onChange={handleChange} className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Contact (03XXXXXXXXX) </Label>
              <Input id="referenceNumber" name="referenceNumber" value={formData.referenceNumber || ""} onChange={handleChange} placeholder="03xxxxxxxxx" className="border-slate-200 dark:border-slate-700" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
            <Textarea id="address" name="address" value={formData.address || ""} onChange={handleChange} rows={2} required className="border-slate-200 dark:border-slate-700" />
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {/* Upload Section */}
          <div className="p-4 border rounded-xl bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select document to upload..." />
                  </SelectTrigger>
                  <SelectContent>
                    {documentFields.filter(doc => !formData[doc.name]).map(doc => (
                      <SelectItem key={doc.name} value={doc.name}>{doc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedDocType ? (
                <UploadButton
                  endpoint="employeeDocument"
                  onClientUploadComplete={(res) => {
                    if (res?.[0]) {
                      handleSelectChange(selectedDocType, res[0].url);
                      setSelectedDocType("");
                    }
                  }}
                  onUploadError={(error: Error) => alert(`Upload Error: ${error.message}`)}
                  appearance={{
                    button: "bg-sky-600 hover:bg-sky-700 text-white text-sm h-10 px-6 rounded-lg transition-all shadow-sm font-medium",
                    allowedContent: "hidden"
                  }}
                  content={{
                    button({ isUploading }) {
                      if (isUploading) return <Loader2 className="h-4 w-4 animate-spin" />;
                      return <div className="flex items-center gap-2"><Upload className="h-4 w-4" /> Upload</div>;
                    }
                  }}
                />
              ) : (
                <Button type="button" disabled className="h-10 px-6 rounded-lg opacity-50 cursor-not-allowed">
                  <Upload className="h-4 w-4 mr-2" /> Upload
                </Button>
              )}
            </div>
          </div>

          {/* Uploaded Files List */}
          {documentFields.some(doc => formData[doc.name]) && (
            <div className="p-4 border rounded-xl bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" /> Uploaded Documents
              </h3>
              <div className="space-y-1.5">
                {documentFields.filter(doc => formData[doc.name]).map(doc => (
                  <div key={doc.name} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-sm">{doc.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={formData[doc.name]} target="_blank" rel="noreferrer" className="text-xs font-medium text-sky-600 hover:underline px-2 py-1">View</a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        onClick={() => handleRemoveFile(doc.name)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!documentFields.some(doc => formData[doc.name]) && (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
              No documents uploaded yet. Select a document type above to begin.
            </div>
          )}
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

        <TabsContent value="salary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic Salary <span className="text-red-500">*</span></Label>
              <Input id="basicSalary" name="basicSalary" type="text" inputMode="decimal" value={formData.basicSalary ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendanceAllowance">Attendance Allowance <span className="text-red-500">*</span></Label>
              <Input id="attendanceAllowance" name="attendanceAllowance" type="text" inputMode="decimal" value={formData.attendanceAllowance ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyAllowance">Daily Allowance <span className="text-red-500">*</span></Label>
              <Input id="dailyAllowance" name="dailyAllowance" type="text" inputMode="decimal" value={formData.dailyAllowance ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuelAllowance">Fuel Allowance <span className="text-red-500">*</span></Label>
              <Input id="fuelAllowance" name="fuelAllowance" type="text" inputMode="decimal" value={formData.fuelAllowance ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conveyanceAllowance">Conveyance Allowance <span className="text-red-500">*</span></Label>
              <Input id="conveyanceAllowance" name="conveyanceAllowance" type="text" inputMode="decimal" value={formData.conveyanceAllowance ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintainence">Maintainence <span className="text-red-500">*</span></Label>
              <Input id="maintainence" name="maintainence" type="text" inputMode="decimal" value={formData.maintainence ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comission">Comission <span className="text-red-500">*</span></Label>
              <Input id="comission" name="comission" type="text" inputMode="decimal" value={formData.comission ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eachKpiIncentives">Each KPI Incentives <span className="text-red-500">*</span></Label>
              <Input id="eachKpiIncentives" name="eachKpiIncentives" type="text" inputMode="decimal" value={formData.eachKpiIncentives ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incentives">Incentives <span className="text-red-500">*</span></Label>
              <Input id="incentives" name="incentives" type="text" inputMode="decimal" value={formData.incentives ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryIncentive">Category Incentive <span className="text-red-500">*</span></Label>
              <Input id="categoryIncentive" name="categoryIncentive" type="text" inputMode="decimal" value={formData.categoryIncentive ?? ""} onChange={handleChange} required placeholder="0" className="border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxDeduction">Tax Deduction <span className="text-red-500">*</span></Label>
              <Select value={formData.taxDeduction || ""} onValueChange={(v) => handleSelectChange("taxDeduction", v)}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eobiDeduction">EOBI Deduction <span className="text-red-500">*</span></Label>
              <Select value={formData.eobiDeduction || ""} onValueChange={(v) => handleSelectChange("eobiDeduction", v)}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="socialSecurityDeduction">Social Security Deduction <span className="text-red-500">*</span></Label>
              <Select value={formData.socialSecurityDeduction || ""} onValueChange={(v) => handleSelectChange("socialSecurityDeduction", v)}>
                <SelectTrigger className="border-slate-200 dark:border-slate-700"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
        <Button type="button" variant="outline" onClick={onCancel} className="h-11 px-8 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700 h-11 px-10 rounded-xl font-bold text-white shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Apply Changes"}
        </Button>
      </div>
    </form>
  );
}
