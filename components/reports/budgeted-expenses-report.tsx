"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import { Check, ChevronsUpDown, Download, Loader2, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type LocationOption = {
  id: string;
  name: string;
  city: string;
};

type BudgetedExpensesRow = {
  locationId: string;
  locationName: string;
  city: string;
  budgeted: number;
  expenses: number;
  balance: number;
};

type BudgetedExpensesReportProps = {
  locations: LocationOption[];
  canSeeAllLocations: boolean;
};

const currencyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-PK", {
  maximumFractionDigits: 0,
});

export const BudgetedExpensesReport: React.FC<BudgetedExpensesReportProps> = ({
  locations,
  canSeeAllLocations,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [reportRows, setReportRows] = useState<BudgetedExpensesRow[]>([]);
  const [totals, setTotals] = useState({ budgeted: 0, expenses: 0, balance: 0 });

  const printRef = useRef<HTMLDivElement>(null);

  const selectedLocationLabels = useMemo(() => {
    if (!canSeeAllLocations || selectedLocationIds.length === 0) {
      return "All Locations";
    }

    return selectedLocationIds
      .map((id) => locations.find((location) => location.id === id))
      .filter(Boolean)
      .map((location) => `${location!.name} (${location!.city})`);
  }, [canSeeAllLocations, locations, selectedLocationIds]);

  const locationButtonLabel = Array.isArray(selectedLocationLabels)
    ? selectedLocationLabels.length <= 2
      ? selectedLocationLabels.join(", ")
      : `${selectedLocationLabels.length} locations selected`
    : selectedLocationLabels;

  const onPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Budgeted Expenses Report",
  });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) {
        const [year, month] = selectedMonth.split("-");
        params.append("year", year);
        params.append("month", month);
      }
      if (canSeeAllLocations && selectedLocationIds.length > 0) {
        params.append("locationIds", selectedLocationIds.join(","));
      }

      const res = await fetch(`/api/reports/budgeted-expenses?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to generate report");
      }

      setReportRows(data.report || []);
      setTotals(data.totals || { budgeted: 0, expenses: 0, balance: 0 });
    } catch (error) {
      console.error(error);
      toast.error("Error generating Budgeted / Expenses report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds((current) =>
      current.includes(locationId)
        ? current.filter((id) => id !== locationId)
        : [...current, locationId],
    );
  };

  const handleExport = () => {
    if (reportRows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const rows = reportRows.map((row) => ({
      Location: `${row.locationName} (${row.city})`,
      Budgeted: row.budgeted,
      Expenses: row.expenses,
      Balance: row.balance,
    }));

    rows.push({
      Location: "Total",
      Budgeted: totals.budgeted,
      Expenses: totals.expenses,
      Balance: totals.balance,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budgeted Expenses");
    XLSX.writeFile(wb, `Budgeted_Expenses_${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">Budgeted / Expenses</h2>
            <p className="text-sm text-slate-500">
              Monthly budget, expense, and balance summary by office
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={reportRows.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export Excel
            </Button>
            <Button size="sm" onClick={() => onPrint()} disabled={reportRows.length === 0}>
              <Printer className="h-4 w-4 mr-2" /> Print Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-t pt-4">
          {canSeeAllLocations && (
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Locations</Label>
              <Popover open={locationsOpen} onOpenChange={setLocationsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={locationsOpen}
                    className="w-full justify-between font-normal bg-white dark:bg-slate-950"
                  >
                    <span className="truncate">{locationButtonLabel}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search location..." />
                    <CommandList>
                      <CommandEmpty>No location found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="All Locations"
                          onSelect={() => setSelectedLocationIds([])}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedLocationIds.length === 0 ? "opacity-100" : "opacity-0",
                            )}
                          />
                          All Locations
                        </CommandItem>
                        {locations.map((location) => (
                          <CommandItem
                            key={location.id}
                            value={`${location.name} ${location.city}`}
                            onSelect={() => toggleLocation(location.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedLocationIds.includes(location.id)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {location.name} ({location.city})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="flex justify-between gap-2 border-t p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLocationIds(locations.map((location) => location.id))}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLocationIds([])}
                    >
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Month</Label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-9 cursor-pointer"
              onClick={(event) => {
                try {
                  if ("showPicker" in event.currentTarget) {
                    (event.currentTarget as HTMLInputElement).showPicker();
                  }
                } catch (error) {}
              }}
            />
          </div>

          <Button onClick={fetchReport} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </Button>
        </div>
      </div>

      <div ref={printRef} className="print:p-8">
        <div className="hidden print:block mb-8 text-center border-b-2 border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-slate-900 border-b-2 border-black inline-block mb-2">
            SADIQ TRADERS HRMS
          </h1>
          <h2 className="text-xl font-bold text-slate-700">Budgeted / Expenses Report</h2>
          <div className="flex justify-center gap-4 text-xs text-slate-500 mt-2">
            <span>Month: {selectedMonth}</span>
            <span>Locations: {Array.isArray(selectedLocationLabels) ? selectedLocationLabels.join(", ") : selectedLocationLabels}</span>
            <span>Generated: {new Date().toLocaleString()}</span>
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 py-4">
            <CardTitle className="text-base">Budgeted / Expenses Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700">
                  <TableHead className="font-bold text-slate-900 dark:text-white">Office</TableHead>
                  <TableHead className="text-right font-bold text-slate-900 dark:text-white">Budgeted</TableHead>
                  <TableHead className="text-right font-bold text-slate-900 dark:text-white">Expenses</TableHead>
                  <TableHead className="text-right font-bold text-slate-900 dark:text-white">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                      <span className="text-sm text-slate-500">Generating report...</span>
                    </TableCell>
                  </TableRow>
                )}

                {!loading && reportRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center text-slate-500">
                      No data found for the selected month and locations.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  reportRows.map((row) => (
                    <TableRow key={row.locationId} className="border-b">
                      <TableCell className="font-medium">
                        {row.locationName} ({row.city})
                      </TableCell>
                      <TableCell className="text-right">{numberFormatter.format(row.budgeted)}</TableCell>
                      <TableCell className="text-right">{numberFormatter.format(row.expenses)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-bold",
                          row.balance < 0 ? "text-rose-600" : "text-blue-600",
                        )}
                      >
                        {numberFormatter.format(row.balance)}
                      </TableCell>
                    </TableRow>
                  ))}

                {!loading && reportRows.length > 0 && (
                  <TableRow className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(totals.budgeted)}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(totals.expenses)}</TableCell>
                    <TableCell className={cn("text-right", totals.balance < 0 ? "text-rose-600" : "text-blue-700")}>
                      {currencyFormatter.format(totals.balance)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="hidden print:block mt-12 pt-4 border-t border-slate-200 text-center">
          <p className="text-[10px] text-slate-400 italic">
            This is a computer-generated report and does not require a physical signature.
          </p>
          <p className="text-[8px] text-slate-300">Generated via Sadiq Traders HRMS</p>
        </div>
      </div>
    </div>
  );
};
