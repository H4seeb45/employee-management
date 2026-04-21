"use client";

import { Loader2, Download, Upload, Search, FileDown, FileUp } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "sonner";
import * as XLSX from "xlsx";

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
}

interface IncentiveManagerProps {
    month: string;
    year: string;
    locationId: string;
}

export function IncentiveManager({ month, year, locationId }: IncentiveManagerProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const locationQuery = locationId !== "all" ? `&locationId=${locationId}` : "";
      const res = await fetch(`/api/payroll/adjustments?month=${month}&year=${year}${locationQuery}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [month, year, locationId]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => 
        r.employee?.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employee?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const downloadTemplate = async () => {
    try {
      const locationQuery = locationId !== "all" ? `&locationId=${locationId}` : "";
      const res = await fetch(`/api/employees?status=Active:Working${locationQuery}`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      const { employees } = await res.json();

      const templateData = employees.map((emp: any) => ({
        "EMP ID": emp.employeeId,
        "NAME": emp.employeeName,
        "INCENTIVES": 0,
        "COMISSION": 0,
        "SHORTAGES": 0,
        "MARKET CREDIT": 0
      }));

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      
      // Auto-size columns
      const colWidths = [
          { wch: 15 }, // EMP ID
          { wch: 25 }, // NAME
          { wch: 15 }, // INCENTIVES
          { wch: 15 }, // COMISSION
          { wch: 15 }, // SHORTAGES
          { wch: 15 }, // MARKET CREDIT
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `Incentives_Template_${month}_${year}.xlsx`);
      toast.success("Template downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Error generating template");
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const formattedRecords = data.map((row: any) => ({
          empId: row["EMP ID"]?.toString(),
          incentives: parseFloat(row["INCENTIVES"]) || 0,
          comission: parseFloat(row["COMISSION"]) || 0,
          shortages: parseFloat(row["SHORTAGES"]) || 0,
          marketCredit: parseFloat(row["MARKET CREDIT"]) || 0,
        })).filter(r => r.empId);

        if (formattedRecords.length === 0) {
            toast.error("No valid records found in file");
            setUploading(false);
            return;
        }

        const res = await fetch("/api/payroll/adjustments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: parseInt(month),
            year: parseInt(year),
            records: formattedRecords
          }),
        });

        if (res.ok) {
          toast.success(`Successfully uploaded ${formattedRecords.length} records`);
          fetchRecords();
        } else {
          toast.error("Failed to upload records");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error processing file");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search employee..." 
            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={downloadTemplate} disabled={uploading}>
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>
          <div className="relative">
            <Button className="bg-[#0A192F] hover:bg-[#162a45]">
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Excel
            </Button>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleUpload}
              disabled={uploading}
            />
          </div>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm">
                <TableHead className="min-w-[100px]">EMP ID</TableHead>
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead className="min-w-[120px]">Location</TableHead>
                <TableHead className="min-w-[100px] text-right">Incentives</TableHead>
                <TableHead className="min-w-[100px] text-right">Commission</TableHead>
                <TableHead className="min-w-[100px] text-right">Shortages</TableHead>
                <TableHead className="min-w-[100px] text-right">Market Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-300" />
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-slate-500">
                    No adjustment records found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((r) => (
                  <TableRow key={r.id} className="text-xs sm:text-sm">
                    <TableCell className="font-mono">{r.employee?.employeeId}</TableCell>
                    <TableCell className="font-medium">{r.employee?.employeeName}</TableCell>
                    <TableCell>{r.employee?.location?.name || "-"}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(r.incentives)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(r.comission)}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{formatCurrency(r.shortages)}</TableCell>
                    <TableCell className="text-right text-red-600 font-medium">{formatCurrency(r.marketCredit)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
