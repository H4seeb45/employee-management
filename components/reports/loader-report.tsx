"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  Printer, 
  Search, 
  Loader2 
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface LoaderReportProps {
  locations: any[];
  filterLocation: string;
  setFilterLocation: (val: string) => void;
  canSeeAllLocations: boolean;
}

export const LoaderReport: React.FC<LoaderReportProps> = ({
  locations,
  filterLocation,
  setFilterLocation,
  canSeeAllLocations,
}) => {
  const [loading, setLoading] = useState(false);
  const [filterFromDate, setFilterFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [filterToDate, setFilterToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [reportData, setReportData] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const onPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Loaders Report",
  });

  const fetchReport = async () => {
    if (filterLocation === "all") {
        toast.error("Please select a specific location for the Loaders Report");
        return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        locationId: filterLocation,
        fromDate: filterFromDate,
        toDate: filterToDate,
      });

      const res = await fetch(`/api/reports/loaders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setReportData(data);
    } catch (error) {
      console.error(error);
      toast.error("Error generating report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!reportData) return toast.error("No data to export");

    const data: any[] = [];
    const header = ["Vehicle Number", "Loads", "Loaders"];
    data.push(header);

    reportData.vehicleList.forEach((v: any) => {
      data.push([v.vehicleNo, v.loads, v.loaders]);
    });

    data.push(["Warehouse", "", reportData.warehouseLoaders]);
    data.push(["", "", ""]);
    data.push(["", "Total", reportData.totalLoaders]);
    data.push(["", "Daily Wages", reportData.dailyWages]);
    data.push(["", "Net Attendance", reportData.netAttendance]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loaders Report");
    XLSX.writeFile(wb, `LoadersReport_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Loaders Report</h2>
            <p className="text-sm text-slate-500">Summary of vehicle loads and loaders personnel</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!reportData}>
              <Download className="h-4 w-4 mr-2" /> Export Excel
            </Button>
            <Button size="sm" onClick={() => onPrint()} disabled={!reportData}>
              <Printer className="h-4 w-4 mr-2" /> Print Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-t pt-4">
          {canSeeAllLocations && (
            <div className="space-y-1">
              <Label className="text-xs">Location</Label>
              <SearchableSelect
                value={filterLocation}
                onValueChange={setFilterLocation}
                options={[
                  { value: "all", label: "Select Location" },
                  ...locations.map(l => ({ value: l.id, label: `${l.name} (${l.city})` }))
                ]}
                placeholder="Select Location"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} />
          </div>
          <Button onClick={fetchReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Generate Report
          </Button>
        </div>
      </div>

      {reportData && (
        <div ref={printRef} className="print:p-8">
          {/* Print Header */}
          <div className="hidden print:block mb-8 text-center border-b-2 border-slate-200 pb-4">
            <h1 className="text-3xl font-bold text-slate-900 border-b-2 border-black inline-block mb-2">SADIQ TRADERS HRMS</h1>
            <h2 className="text-xl font-bold text-slate-700">Loaders Summary Report</h2>
            <div className="flex justify-center gap-4 text-xs text-slate-500 mt-2">
              <span>Location: {locations.find(l => l.id === filterLocation)?.name}</span>
              <span>Range: {filterFromDate} to {filterToDate}</span>
            </div>
          </div>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full max-w-[600px] mx-auto">
            <Table className="border-collapse table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                  <TableHead className="font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700 h-10 py-0">Vehicle Number</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700 text-center h-10 py-0">Loads</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-white text-center h-10 py-0">Loaders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.vehicleList.map((v: any, idx: number) => (
                  <TableRow key={idx} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell className="border-r border-slate-200 dark:border-slate-800 font-medium">{v.vehicleNo}</TableCell>
                    <TableCell className="border-r border-slate-200 dark:border-slate-800 text-center">{v.loads}</TableCell>
                    <TableCell className="text-center">{v.loaders}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  <TableCell className="border-r border-slate-200 dark:border-slate-800 font-medium">Warehouse</TableCell>
                  <TableCell className="border-r border-slate-200 dark:border-slate-800 text-center"></TableCell>
                  <TableCell className="text-center">{reportData.warehouseLoaders}</TableCell>
                </TableRow>
                {/* Empty Rows like in picture if needed, but lets keep it clean */}
                <TableRow className="h-4">
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
                {/* Footer Totals */}
                <TableRow className="bg-white dark:bg-slate-950 font-medium">
                  <TableCell className="border-0"></TableCell>
                  <TableCell className="border border-slate-200 dark:border-slate-800 text-right pr-4">Total</TableCell>
                  <TableCell className="border border-slate-200 dark:border-slate-800 text-center">{reportData.totalLoaders}</TableCell>
                </TableRow>
                <TableRow className="bg-white dark:bg-slate-950 font-medium">
                  <TableCell className="border-0"></TableCell>
                  <TableCell className="border border-slate-200 dark:border-slate-800 text-right pr-4">Daily Wages</TableCell>
                  <TableCell className="border border-slate-200 dark:border-slate-800 text-center">{reportData.dailyWages}</TableCell>
                </TableRow>
                <TableRow className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                  <TableCell className="border-0"></TableCell>
                  <TableCell className="border border-slate-200 dark:border-slate-700 text-right pr-4 text-slate-900 dark:text-white">Net Attendance</TableCell>
                  <TableCell className="border border-slate-200 dark:border-slate-700 text-center text-slate-900 dark:text-white">{reportData.netAttendance}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
};
