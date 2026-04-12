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
  Loader2, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface VehicleWiseReportProps {
  locations: any[];
  vehicles: any[];
  filterLocation: string;
  setFilterLocation: (val: string) => void;
  canSeeAllLocations: boolean;
}

type ExpenseDetailed = {
  id: string;
  expenseType: { name: string; id: string; expenseCode: string; requiresRouteAndVehicle: boolean };
  amount: number;
  status: string;
  createdAt: string;
  location?: { id: string; name: string; city: string };
  locationId?: string;
  vehicle?: { id: string; vehicleNo: string; locationId: string };
  items?: any[];
};

export const VehicleWiseReport: React.FC<VehicleWiseReportProps> = ({
  locations,
  vehicles,
  filterLocation,
  setFilterLocation,
  canSeeAllLocations,
}) => {
  const [loading, setLoading] = useState(false);
  const [filterFromDate, setFilterFromDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [filterToDate, setFilterToDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [vehicleWisePivot, setVehicleWisePivot] = useState<Record<string, Record<string, number>>>({});
  const [vehicleWiseColumns, setVehicleWiseColumns] = useState<string[]>([]);
  const [vehicleWiseRows, setVehicleWiseRows] = useState<string[]>([]);

  const printRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<any>(null);

  const onPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Vehicle Wise Expense Report",
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: "APPROVED,DISBURSED",
        locationId: filterLocation,
        fromDate: filterFromDate,
        toDate: filterToDate,
      });

      const res = await fetch(`/api/reports/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      const expenses: ExpenseDetailed[] = data.expenses;

      const pivot: Record<string, Record<string, number>> = {};
      const vehiclesSet = new Set<string>();
      const expenseTypesSet = new Set<string>();

      // Filter valid vehicles based on the current location if one is selected
      const locationVehicles = filterLocation !== "all"
        ? vehicles.filter(v => v.locationId === filterLocation || v.location?.id === filterLocation)
        : vehicles;

      expenses.forEach(exp => {
        const typeName = exp.expenseType?.name || "Other";

        const hasItemsWithVehicle = exp.items && Array.isArray(exp.items) && exp.items.some((i: any) => i.vehicleNo);
        const hasTopLevelVehicle = !!exp.vehicle;

        if (!hasItemsWithVehicle && !hasTopLevelVehicle) return;

        expenseTypesSet.add(typeName);

        if (exp.items && Array.isArray(exp.items) && exp.items.length > 0) {
          exp.items.forEach((item: any) => {
            const vNo = item.vehicleNo;
            if (vNo) {
              vehiclesSet.add(vNo);
              if (!pivot[typeName]) pivot[typeName] = {};
              pivot[typeName][vNo] = (pivot[typeName][vNo] || 0) + (Number(item.amount) || 0);
            }
          });
        } else if (exp.vehicle) {
          const vNo = exp.vehicle.vehicleNo;
          vehiclesSet.add(vNo);
          if (!pivot[typeName]) pivot[typeName] = {};
          pivot[typeName][vNo] = (pivot[typeName][vNo] || 0) + exp.amount;
        }
      });

      // Also ensure all vehicles belonging to the selected location are shown in columns
      // even if they have no expenses in this period
      if (filterLocation !== "all") {
        vehicles
          .filter(v => v.locationId === filterLocation || v.location?.id === filterLocation)
          .forEach(v => vehiclesSet.add(v.vehicleNo));
      }

      setVehicleWisePivot(pivot);
      setVehicleWiseColumns(Array.from(vehiclesSet).sort());
      setVehicleWiseRows(Array.from(expenseTypesSet).sort());
    } catch (error) {
      console.error(error);
      toast.error("Error generating report");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (vehicleWiseRows.length === 0) return toast.error("No data to export");

    const data: any[] = [];
    const header = ["Expense Type", ...vehicleWiseColumns, "Grand Total"];
    data.push(header);

    const colTotals: Record<string, number> = {};

    vehicleWiseRows.forEach(row => {
      const rowData: any[] = [row];
      let rowTotal = 0;
      vehicleWiseColumns.forEach(col => {
        const val = vehicleWisePivot[row]?.[col] || 0;
        rowData.push(val);
        rowTotal += val;
        colTotals[col] = (colTotals[col] || 0) + val;
      });
      rowData.push(rowTotal);
      data.push(rowData);
    });

    const footer: any[] = ["Total"];
    let grandTotal = 0;
    vehicleWiseColumns.forEach(col => {
      const total = colTotals[col] || 0;
      footer.push(total);
      grandTotal += total;
    });
    footer.push(grandTotal);
    data.push(footer);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehicle Wise Report");
    XLSX.writeFile(wb, `VehicleWiseReport_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const scroll = (direction: "left" | "right") => {
    let el = scrollRef.current;
    if (el) {
      if (el.tagName === 'TABLE') el = el.parentElement;
      if (el) {
        const amount = 500;
        el.scrollTo({
          left: el.scrollLeft + (direction === "left" ? -amount : amount),
          behavior: "smooth"
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Vehicle Wise Expense Report</h2>
            <p className="text-sm text-slate-500">Expense breakdown by vehicle and type</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export Excel
            </Button>
            <Button size="sm" onClick={() => onPrint()}>
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
                  { value: "all", label: "All Locations" },
                  ...locations.map(l => ({ value: l.id, label: `${l.name} (${l.city})` }))
                ]}
                placeholder="Filter by Location"
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

      <div ref={printRef} className="print:p-8">
        <div className="hidden print:block mb-8 text-center border-b-2 border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-slate-900 border-b-2 border-black inline-block mb-2">SADIQ TRADERS HRMS</h1>
          <h2 className="text-xl font-bold text-slate-700">Vehicle Wise Expense Report</h2>
          <div className="flex justify-center gap-4 text-xs text-slate-500 mt-2">
            {filterLocation !== 'all' && <span>Location: {locations.find(l => l.id === filterLocation)?.name}</span>}
            {filterFromDate && <span>From: {filterFromDate}</span>}
            {filterToDate && <span>To: {filterToDate}</span>}
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full max-w-[1180px]">
          <div className="bg-slate-50 dark:bg-slate-800/50 border-b px-4 py-2 flex items-center justify-between print:hidden">
            <span className="text-xs font-medium text-slate-500">Report Preview</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8 dark:bg-slate-900 z-50" onClick={() => scroll("left")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 dark:bg-slate-900 z-50" onClick={() => scroll("right")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Table ref={scrollRef} className="border-collapse custom-scrollbar">
            <TableHeader>
              <TableRow className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                <TableHead className="font-bold text-slate-900 dark:text-white border-r min-w-[200px] sticky left-0 bg-slate-100 dark:bg-slate-800 z-20">Expense Type</TableHead>
                {vehicleWiseColumns.map(col => (
                  <TableHead key={col} className="text-center font-bold text-slate-900 dark:text-white border-r px-4 uppercase text-[10px]">
                    {col}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold text-slate-900 dark:text-white bg-slate-200/50 dark:bg-slate-700/50 min-w-[120px]">Grand Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && vehicleWiseRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={vehicleWiseColumns.length + 2} className="h-40 text-center text-slate-500">
                    No data found.
                  </TableCell>
                </TableRow>
              )}
              {!loading && vehicleWiseRows.map(row => {
                let rowTotal = 0;
                return (
                  <TableRow key={row} className="border-b">
                    <TableCell className="font-medium border-r sticky left-0 dark:bg-slate-900 z-10">{row}</TableCell>
                    {vehicleWiseColumns.map(col => {
                      const val = vehicleWisePivot[row]?.[col] || 0;
                      rowTotal += val;
                      return <TableCell key={col} className="text-right border-r px-4">{val > 0 ? val.toLocaleString() : '-'}</TableCell>;
                    })}
                    <TableCell className="text-right font-bold">{rowTotal.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            {vehicleWiseRows.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2">
                <TableRow>
                  <TableCell className="sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 border-r">Total</TableCell>
                  {vehicleWiseColumns.map(col => {
                    const colTotal = vehicleWiseRows.reduce((sum, row) => sum + (vehicleWisePivot[row]?.[col] || 0), 0);
                    return <TableCell key={col} className="text-right border-r px-4 text-blue-600">{colTotal.toLocaleString()}</TableCell>;
                  })}
                  <TableCell className="text-right text-blue-700">
                    {vehicleWiseRows.reduce((sum, row) => sum + Object.values(vehicleWisePivot[row] || {}).reduce((s, v) => s + v, 0), 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </Card>
      </div>
    </div>
  );
};
