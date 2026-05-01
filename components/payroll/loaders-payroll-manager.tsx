"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, Download, FileDown, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import { useLayout } from "../layout/layout-provider";

interface LoaderPayrollManagerProps {
  month: string;
  year: string;
  locationId: string;
  locations?: any[];
}

export function LoaderPayrollManager({
  month,
  year,
  locationId,
  locations = [],
}: LoaderPayrollManagerProps) {
  const { user } = useLayout();
  const isAdmin = user?.roles?.some((role: any) =>
    ["Admin", "Super Admin"].includes(role),
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [supervisorAdvance, setSupervisorAdvance] = useState(0);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Loaders_Payroll_${month}_${year}`,
  });

  const fetchRecords = async () => {
    if (!month || !year || !locationId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/payroll/loaders?month=${month}&year=${year}&locationId=${locationId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecords(data.records || []);
      setSupervisorAdvance(data.supervisorAdvance || 0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load loader payroll records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [month, year, locationId]);

  const handleDownloadTemplate = () => {
    const template = [
      {
        "LOCATION ID": locations[0]?.id || "Location_ID_Here",
        SETUP: "CCI - LHR",
        "EMP ID": "LOADERS",
        NAME: "UBAIDULLAH",
        DESIGNATION: "LOADER",
        DEPARTMENT: "LOGISTIC",
        "BASIC SALARY": 30000,
        "WORKING DAYS": 30,
        "BASIC PAYABLE": 29032,
        "NET SALARY": 29032,
      },
    ];

    const wb = XLSX.utils.book_new();

    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, "Loaders Payroll");

    const locationsData = locations.map((l) => ({
      "LOCATION ID": l.id,
      "LOCATION NAME": l.name,
    }));
    const wsLocations = XLSX.utils.json_to_sheet(
      locationsData.length > 0
        ? locationsData
        : [{ "LOCATION ID": "No locations", "LOCATION NAME": "found" }],
    );
    XLSX.utils.book_append_sheet(wb, wsLocations, "Locations");

    XLSX.writeFile(wb, "loaders_payroll_template.xlsx");
  };

  const handleExportData = () => {
    if (!records.length) {
      toast({ title: "Info", description: "No records to export" });
      return;
    }

    const data = records.map((r) => ({
      "LOCATION ID": r.locationId,
      SETUP: r.setup,
      "EMP ID": r.empId,
      NAME: r.name,
      DESIGNATION: r.designation,
      DEPARTMENT: r.department,
      "BASIC SALARY": r.basicSalary,
      "WORKING DAYS": r.workingDays,
      "BASIC PAYABLE": r.basicPayable,
      "NET SALARY": r.netSalary,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loaders Payroll");

    const monthName = new Date(0, parseInt(month) - 1).toLocaleString(
      "default",
      { month: "long" },
    );
    XLSX.writeFile(wb, `loaders_payroll_${monthName}_${year}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Find the header row index. We assume it's the row containing 'NAME' or 'EMP ID'
      let headerRowIndex = -1;
      for (let i = 0; i < rawJson.length; i++) {
        const row: any = rawJson[i];
        if (
          row &&
          Array.isArray(row) &&
          (row.includes("NAME") || row.includes("EMP ID"))
        ) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error("Invalid template format. Could not find header row.");
      }

      const headers: any = rawJson[headerRowIndex];
      const items = rawJson
        .slice(headerRowIndex + 1)
        .filter(
          (row: any) => row && row.length > 0 && row[headers.indexOf("NAME")],
        );

      const parsedRecords = items.map((row: any) => {
        const getVal = (colName: string) => row[headers.indexOf(colName)];
        return {
          locationId: getVal("LOCATION ID"),
          setup: getVal("SETUP"),
          empId: getVal("EMP ID"),
          name: getVal("NAME"),
          designation: getVal("DESIGNATION"),
          department: getVal("DEPARTMENT"),
          basicSalary: getVal("BASIC SALARY"),
          workingDays: getVal("WORKING DAYS"),
          basicPayable: getVal("BASIC PAYABLE"),
          netSalary: getVal("NET SALARY"),
        };
      });

      const res = await fetch("/api/payroll/loaders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year),
          records: parsedRecords,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to upload records");
      }

      toast({
        title: "Success",
        description: `Successfully saved ${result.count} loader payroll records.`,
      });

      fetchRecords();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred while uploading",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const grossAmount = records.reduce((sum, r) => sum + (r.netSalary || 0), 0);
  const netAmount = grossAmount - supervisorAdvance;
  const locationName =
    locationId === "all"
      ? "All Locations"
      : locations.find((l) => l.id === locationId)?.name || "Location";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-[#0A192F] dark:text-white">
            Loaders Payroll Import
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Upload excel file to save loaders payroll for selected month.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportData}
            disabled={records.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => handlePrint()}
            disabled={records.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <FileDown className="w-4 h-4 mr-2" />
                Template
              </Button>
              <div>
                <Input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-[#0A192F] hover:bg-[#112240] text-white"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Excel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        ref={printRef}
        className="space-y-6 print:p-6 print:bg-white print:text-black"
      >
        {/* Print Header */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-3xl font-bold uppercase text-black">
            Sadiq Traders
          </h1>
          <h2 className="text-2xl font-bold uppercase text-black">
            {locationName}
          </h2>
          <p className="text-xl font-medium mt-2 text-black">
            Loaders Payroll -{" "}
            {new Date(0, parseInt(month) - 1).toLocaleString("default", {
              month: "long",
            })}{" "}
            {year}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-0 print:shadow-none">
          <div className="overflow-x-auto">
            <Table className="print:text-black">
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50 print:bg-slate-100">
                <TableRow>
                  <TableHead className="whitespace-nowrap print:text-black">
                    Setup
                  </TableHead>
                  <TableHead className="whitespace-nowrap print:text-black">
                    Emp ID
                  </TableHead>
                  <TableHead className="whitespace-nowrap print:text-black">
                    Name
                  </TableHead>
                  <TableHead className="whitespace-nowrap print:text-black">
                    Designation
                  </TableHead>
                  <TableHead className="whitespace-nowrap print:text-black">
                    Department
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap print:text-black">
                    Basic Salary
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap print:text-black">
                    Working Days
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap print:text-black">
                    Basic Payable
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap print:text-black">
                    Net Salary
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-slate-500"
                    >
                      No loader payroll records found for this month/location.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow
                      key={record.id}
                      className="print:border-b print:border-slate-200"
                    >
                      <TableCell className="font-medium print:text-black">
                        {record.setup || "-"}
                      </TableCell>
                      <TableCell className="print:text-black">
                        {record.empId || "-"}
                      </TableCell>
                      <TableCell className="print:text-black font-bold">
                        {record.name}
                      </TableCell>
                      <TableCell className="print:text-black">
                        {record.designation || "-"}
                      </TableCell>
                      <TableCell className="print:text-black">
                        {record.department || "-"}
                      </TableCell>
                      <TableCell className="text-right print:text-black">
                        {record.basicSalary?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center print:text-black">
                        {record.workingDays}
                      </TableCell>
                      <TableCell className="text-right font-medium print:text-black">
                        {record.basicPayable?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                        {record.netSalary?.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {records.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-end items-end gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6 print:border-0 print:shadow-none print:bg-white print:p-0">
            <div className="space-y-1 text-right">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider print:text-slate-700">
                Gross Amount
              </p>
              <p className="text-2xl font-black text-[#0A192F] dark:text-white print:text-black">
                {grossAmount.toLocaleString()}
              </p>
            </div>
            <div className="w-full sm:w-px h-px sm:h-12 bg-slate-200 dark:bg-slate-700 print:bg-slate-400"></div>
            <div className="space-y-1 text-right">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider print:text-slate-700">
                Supervisor Advance
              </p>
              <p className="text-2xl font-black text-rose-500 print:text-rose-700">
                - {supervisorAdvance.toLocaleString()}
              </p>
            </div>
            <div className="w-full sm:w-px h-px sm:h-12 bg-slate-200 dark:bg-slate-700 print:bg-slate-400"></div>
            <div className="space-y-1 text-right">
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-wider print:text-emerald-700">
                Net Amount
              </p>
              <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
                {netAmount.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
