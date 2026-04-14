"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfDay, isBefore } from "date-fns";
import { 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Calendar as CalendarIcon,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";

interface Vehicle {
  id: string;
  vehicleNo: string;
}

interface LoaderEntry {
  id?: string;
  vehicleId: string;
  vehicleNo: string;
  loads: number;
  loaders: number;
}

interface Summary {
  warehouseLoaders: number;
  dailyWages: number;
  netAttendance: number;
}

/**
 * Loaders Management Module
 * Allows Admin and Storekeeper to manage vehicle loads and loader assignments.
 */
export function LoaderModule({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [date, setDate] = useState<Date>(new Date());
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(user?.locationId || "");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [entries, setEntries] = useState<LoaderEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({
    warehouseLoaders: 0,
    dailyWages: 0,
    netAttendance: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Requirement: no records can be added or edited in previous dates.
  const isPreviousDate = isBefore(startOfDay(date), startOfDay(new Date()));

  // Fetch locations if Admin
  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      const data = await res.json();
      if (res.ok) {
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLocations();
    }
  }, [isAdmin]);

  const fetchData = useCallback(async () => {
    if (!selectedLocationId) return;
    setIsLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/loaders?date=${dateStr}&locationId=${selectedLocationId}`);
      const data = await res.json();
      
      if (res.ok) {
        setEntries(data.loaderEntries || []);
        if (data.summary) {
          setSummary({
            warehouseLoaders: data.summary.warehouseLoaders || 0,
            dailyWages: data.summary.dailyWages || 0,
            netAttendance: data.summary.netAttendance || 0
          });
        } else {
          setSummary({
            warehouseLoaders: 0,
            dailyWages: 0,
            netAttendance: 0
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch loaders:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [date, selectedLocationId]);

  const fetchVehicles = useCallback(async () => {
    if (!selectedLocationId) return;
    try {
      const res = await fetch(`/api/routes-vehicles/vehicles?locationId=${selectedLocationId}`);
      const data = await res.json();
      if (res.ok) {
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddEntry = () => {
    setEntries([...entries, { vehicleId: "", vehicleNo: "", loads: 1, loaders: 2 }]);
  };

  const handleRemoveEntry = (index: number) => {
    const newEntries = [...entries];
    newEntries.splice(index, 1);
    setEntries(newEntries);
  };

  const handleUpdateEntry = (index: number, field: keyof LoaderEntry, value: any) => {
    const newEntries = [...entries];
    if (field === "vehicleId") {
      const vehicle = vehicles.find(v => v.id === value);
      newEntries[index].vehicleId = value;
      newEntries[index].vehicleNo = vehicle?.vehicleNo || "";
    } else {
      (newEntries[index] as any)[field] = value;
    }
    setEntries(newEntries);
  };

  const handleUpdateSummary = (field: keyof Summary, value: number) => {
    setSummary({ ...summary, [field]: value });
  };

  const calculateTotalLoaders = () => {
    const vehicleLoaders = entries.reduce((sum, entry) => sum + (parseInt(entry.loaders.toString()) || 0), 0);
    return vehicleLoaders + (parseInt(summary.warehouseLoaders.toString()) || 0);
  };

  const totalLoaders = calculateTotalLoaders();
  const netAttendance = totalLoaders - (parseInt(summary.dailyWages.toString()) || 0);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/loaders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(date, "yyyy-MM-dd"),
          locationId: selectedLocationId,
          loaderEntries: entries,
          summary: {
            ...summary,
            totalLoaders,
            netAttendance
          }
        })
      });

      if (res.ok) {
        toast.success("Saved successfully");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header section with glassmorphism */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-blue-900/5 border border-white/40 dark:border-slate-800/50">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Operations Log</h2>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Record vehicle loads and loader counts</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {isAdmin && (
            <Select
              value={selectedLocationId}
              onValueChange={setSelectedLocationId}
            >
              <SelectTrigger className="min-w-[200px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl h-12 shadow-sm font-semibold transition-all">
                <SelectValue placeholder="Select Location" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl">
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="rounded-xl font-medium">
                    {loc.name} - {loc.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "min-w-[260px] justify-start text-left font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl h-12 shadow-sm transition-all",
                  !date && "text-muted-foreground"
                )}
              >
                <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg mr-3">
                  <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                {date ? format(date, "PPPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-3xl shadow-2xl border-slate-200 dark:border-slate-800" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className="p-4"
              />
            </PopoverContent>
          </Popover>

          <Button 
            onClick={handleSave} 
            disabled={isSaving || isPreviousDate || !selectedLocationId}
            className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold px-8 rounded-2xl h-12 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Sync Records
          </Button>
        </div>
      </div>

      {isPreviousDate && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-200/60 dark:border-amber-700/30 rounded-2xl py-4 px-6 flex items-center gap-4 shadow-sm"
        >
          <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <p className="text-amber-900 dark:text-amber-200 font-bold text-sm">Read-Only History</p>
            <p className="text-amber-700 dark:text-amber-400 text-xs font-medium">
              You are viewing data for <span className="font-extrabold">{format(date, "MMM dd, yyyy")}</span>. Modifications are locked for past entries.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Table Card */}
        <Card className="lg:col-span-8 shadow-2xl shadow-slate-200/50 dark:shadow-none border-slate-200/60 dark:border-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 px-8 py-6">
            <div>
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Vehicle Statistics</CardTitle>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Manage distribution loads per vehicle</p>
            </div>
            {!isPreviousDate && (
              <Button 
                onClick={handleAddEntry} 
                variant="outline" 
                size="sm" 
                className="h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 px-4 transition-all"
              >
                <Plus className="mr-2 h-4 w-4 text-blue-500" />
                Add Vessel
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-slate-800"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
                </div>
                <p className="text-sm font-bold text-slate-400 animate-pulse">Fetching records...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                      <TableHead className="font-extrabold text-slate-500 dark:text-slate-400 pl-8 h-14 text-[10px] uppercase tracking-[0.15em]">Vehicle Number</TableHead>
                      <TableHead className="w-[140px] font-extrabold text-slate-500 dark:text-slate-400 text-center text-[10px] uppercase tracking-[0.15em]">Loads</TableHead>
                      <TableHead className="w-[140px] font-extrabold text-slate-500 dark:text-slate-400 text-center text-[10px] uppercase tracking-[0.15em]">Loaders</TableHead>
                      {!isPreviousDate && <TableHead className="w-[80px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isPreviousDate ? 3 : 4} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-4 text-slate-300 dark:text-slate-700">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem]">
                              <Truck className="h-16 w-16 opacity-40" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-black text-slate-400 dark:text-slate-600">No Distribution Records</p>
                              {!isPreviousDate && (
                                <p className="text-xs font-semibold text-blue-400 cursor-pointer hover:text-blue-500 transition-colors" onClick={handleAddEntry}>
                                  Start by adding a new vehicle &rarr;
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((entry, index) => (
                        <motion.tr 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          key={index} 
                          className="group hover:bg-slate-50/40 dark:hover:bg-blue-900/10 transition-colors border-b border-slate-50 dark:border-slate-800/50"
                        >
                          <TableCell className="pl-8 py-5">
                            <Select
                              value={entry.vehicleId}
                              onValueChange={(val) => handleUpdateEntry(index, "vehicleId", val)}
                              disabled={isPreviousDate}
                            >
                              <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl h-12 focus:ring-blue-500 shadow-sm font-semibold transition-all group-hover:bg-white dark:group-hover:bg-slate-800">
                                <SelectValue placeholder="Identify Vehicle" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl">
                                {vehicles.map((v) => (
                                  <SelectItem key={v.id} value={v.id} className="rounded-xl font-medium focus:bg-blue-50 dark:focus:bg-blue-900/30">
                                    {v.vehicleNo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-5">
                            <Input
                              type="number"
                              min="0"
                              value={entry.loads}
                              onChange={(e) => handleUpdateEntry(index, "loads", parseInt(e.target.value) || 0)}
                              disabled={isPreviousDate}
                              className="bg-slate-50/50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-center font-black h-12 transition-all group-hover:bg-white dark:group-hover:bg-slate-800 focus:scale-105"
                            />
                          </TableCell>
                          <TableCell className="py-5">
                            <Input
                              type="number"
                              min="0"
                              value={entry.loaders}
                              onChange={(e) => handleUpdateEntry(index, "loaders", parseInt(e.target.value) || 0)}
                              disabled={isPreviousDate}
                              className="bg-slate-50/50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl text-center font-black h-12 transition-all group-hover:bg-white dark:group-hover:bg-slate-800 focus:scale-105"
                            />
                          </TableCell>
                          {!isPreviousDate && (
                            <TableCell className="py-5 pr-8">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveEntry(index)}
                                className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl h-10 w-10 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </TableCell>
                          )}
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side Summary Card */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="shadow-2xl shadow-blue-900/5 border-slate-200/60 dark:border-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/50">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 px-8 py-6">
              <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Loaders Detail</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="warehouse-loaders" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Warehouse Loaders</Label>
                <div className="relative group">
                  <Input
                    id="warehouse-loaders"
                    type="number"
                    min="0"
                    value={summary.warehouseLoaders}
                    onChange={(e) => handleUpdateSummary("warehouseLoaders", parseInt(e.target.value) || 0)}
                    disabled={isPreviousDate}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl h-14 pl-12 shadow-inner font-black text-lg focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Truck className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="daily-wages" className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Daily Wages</Label>
                <div className="relative group">
                  <Input
                    id="daily-wages"
                    type="number"
                    min="0"
                    value={summary.dailyWages}
                    onChange={(e) => handleUpdateSummary("dailyWages", parseInt(e.target.value) || 0)}
                    disabled={isPreviousDate}
                    className="bg-rose-50/50 dark:bg-rose-900/10 border-none rounded-2xl h-14 pl-12 shadow-inner font-black text-lg text-rose-600 focus:ring-2 focus:ring-rose-500 transition-all"
                    placeholder="0"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300 dark:text-rose-700 font-black text-xl">-</div>
                </div>
              </div>
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-5">
                <div className="flex justify-between items-center px-2">
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Gross Headcount</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                    <span className="font-black text-slate-800 dark:text-slate-100 text-lg">{totalLoaders}</span>
                  </div>
                </div>
                
                <div className="relative p-6 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/40 border border-blue-400/30 overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-[40px] group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-indigo-400/20 rounded-full blur-[40px]"></div>
                  
                  <div className="flex flex-col gap-1 relative z-10">
                    <span className="text-blue-100 text-[10px] uppercase font-black tracking-[0.2em]">Net Attendance</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white">{netAttendance}</span>
                      <span className="text-blue-300 text-xs font-bold">Loaders</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper icons
function Truck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10a1 1 0 0 0 1 1Z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}
