"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, Download, FileDown } from "lucide-react";
import * as XLSX from "xlsx";

interface LoaderPayrollManagerProps {
  month: string;
  year: string;
  locationId: string;
  locations?: any[];
}

export function LoaderPayrollManager({ month, year, locationId, locations = [] }: LoaderPayrollManagerProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    if (!month || !year || !locationId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll/loaders?month=${month}&year=${year}&locationId=${locationId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecords(data);
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
        "SETUP": "CCI - LHR",
        "EMP ID": "LOADERS",
        "NAME": "UBAIDULLAH",
        "DESIGNATION": "LOADER",
        "DEPARTMENT": "LOGISTIC",
        "BASIC SALARY": 30000,
        "WORKING DAYS": 30,
        "BASIC PAYABLE": 29032,
        "NET SALARY": 29032
      }
    ];

    const wb = XLSX.utils.book_new();
    
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, "Loaders Payroll");

    const locationsData = locations.map(l => ({
      "LOCATION ID": l.id,
      "LOCATION NAME": l.name
    }));
    const wsLocations = XLSX.utils.json_to_sheet(locationsData.length > 0 ? locationsData : [{ "LOCATION ID": "No locations", "LOCATION NAME": "found" }]);
    XLSX.utils.book_append_sheet(wb, wsLocations, "Locations");

    XLSX.writeFile(wb, "loaders_payroll_template.xlsx");
  };

  const handleExportData = () => {
    if (!records.length) {
      toast({ title: "Info", description: "No records to export" });
      return;
    }

    const data = records.map(r => ({
      "LOCATION ID": r.locationId,
      "SETUP": r.setup,
      "EMP ID": r.empId,
      "NAME": r.name,
      "DESIGNATION": r.designation,
      "DEPARTMENT": r.department,
      "BASIC SALARY": r.basicSalary,
      "WORKING DAYS": r.workingDays,
      "BASIC PAYABLE": r.basicPayable,
      "NET SALARY": r.netSalary
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loaders Payroll");
    
    const monthName = new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'long' });
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
        if (row && Array.isArray(row) && (row.includes('NAME') || row.includes('EMP ID'))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
          throw new Error("Invalid template format. Could not find header row.");
      }

      const headers: any = rawJson[headerRowIndex];
      const items = rawJson.slice(headerRowIndex + 1).filter((row: any) => row && row.length > 0 && row[headers.indexOf('NAME')]);

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
          netSalary: getVal("NET SALARY")
        };
      });

      const res = await fetch("/api/payroll/loaders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: parseInt(month),
          year: parseInt(year),
          records: parsedRecords
        })
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-[#0A192F] dark:text-white">Loaders Payroll Import</h3>
          <p className="text-sm text-slate-500 mt-1">Upload excel file to save loaders payroll for selected month.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <FileDown className="w-4 h-4 mr-2" />
            Template
          </Button>
          <Button variant="outline" onClick={handleExportData} disabled={records.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <div>
            <Input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-[#0A192F] hover:bg-[#112240] text-white">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="whitespace-nowrap">Setup</TableHead>
                <TableHead className="whitespace-nowrap">Emp ID</TableHead>
                <TableHead className="whitespace-nowrap">Name</TableHead>
                <TableHead className="whitespace-nowrap">Designation</TableHead>
                <TableHead className="whitespace-nowrap">Department</TableHead>
                <TableHead className="text-right whitespace-nowrap">Basic Salary</TableHead>
                <TableHead className="text-center whitespace-nowrap">Working Days</TableHead>
                <TableHead className="text-right whitespace-nowrap">Basic Payable</TableHead>
                <TableHead className="text-right whitespace-nowrap">Net Salary</TableHead>
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
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    No loader payroll records found for this month/location.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.setup || "-"}</TableCell>
                    <TableCell>{record.empId || "-"}</TableCell>
                    <TableCell>{record.name}</TableCell>
                    <TableCell>{record.designation || "-"}</TableCell>
                    <TableCell>{record.department || "-"}</TableCell>
                    <TableCell className="text-right">{record.basicSalary?.toLocaleString()}</TableCell>
                    <TableCell className="text-center">{record.workingDays}</TableCell>
                    <TableCell className="text-right font-medium">{record.basicPayable?.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {record.netSalary?.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
