"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Banknote, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { expenseTypes } from "@/components/expenses/expense-types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Budget = {
  id: string;
  amount: number;
  categories: Record<string, number>;
  status: "PENDING" | "APPROVED" | "REJECTED";
  locationId: string;
  location: { name: string; city: string };
  createdBy: { email: string };
  approvedBy?: { email: string };
  createdAt: string;
  updatedAt: string;
};

export function BudgetManagement({ roles }: { roles: string[] }) {
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = roles.includes("Admin") || roles.includes("Super Admin");
  const isBM = roles.includes("Business Manager");

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/budgets");
      const data = await res.json();
      if (res.ok) {
        setBudgets(data.budgets || []);
      }
    } catch (err) {
      console.error("Failed to fetch budgets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: categoryBudgets }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Budget submitted for approval!");
        setCategoryBudgets({});
        fetchBudgets();
      } else {
        setError(data.message || "Failed to set budget");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setSaving(true);
    try {
      const res = await fetch(`/api/budgets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        setSuccess(`Budget ${action}ed successfully!`);
        fetchBudgets();
      } else {
        const data = await res.json();
        setError(data.message || `Failed to ${action} budget`);
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Budget Management</h1>
          <p className="text-slate-500 dark:text-slate-400">Set and approve monthly petty cash budgets for locations.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchBudgets}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
        </motion.div>
      )}

      {isBM && (
        <Card className="border-blue-100 dark:border-blue-900/30 overflow-hidden">
          <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10">
            <CardTitle className="text-lg">Set Petty Cash Budget</CardTitle>
            <CardDescription>Enter the requested amount for this month's petty cash.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSetBudget} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expenseTypes.map((type) => (
                  <div key={type.value} className="space-y-2">
                    <Label htmlFor={type.value} className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {type.label}
                    </Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id={type.value}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-9 h-9"
                        value={categoryBudgets[type.value] || ""}
                        onChange={(e) => setCategoryBudgets({
                          ...categoryBudgets,
                          [type.value]: e.target.value
                        })}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Budget Amount</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(
                      Object.values(categoryBudgets).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
                    )}
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={saving || budgets.some(b => b.status === "APPROVED")}
                  className="bg-blue-600 hover:bg-blue-700 h-11 px-10 font-semibold shadow-lg shadow-blue-500/20"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Budget for Approval"}
                </Button>
              </div>
            </form>
            {budgets.some(b => b.status === "APPROVED") && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-4 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                An approved budget already exists. You cannot set a new one.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Active Budgets</h2>
        {budgets.length === 0 ? (
          <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-500">
            No budgets found for your location.
          </div>
        ) : (
          budgets.map((budget) => (
            <Card key={budget.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Banknote className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-lg text-slate-900 dark:text-white">
                          {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(budget.amount)}
                        </span>
                        <Badge 
                          className={
                            budget.status === "APPROVED" 
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : budget.status === "PENDING"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                          }
                        >
                          {budget.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {budget.location.name} ({budget.location.city})
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] text-slate-400 flex items-center lg:justify-end gap-1 uppercase tracking-wider font-medium">
                        <Clock className="h-3 w-3" />
                        Uploaded: {new Date(budget.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">By: {budget.createdBy.email.split('@')[0]}</p>
                      {budget.approvedBy && (
                        <p className="text-xs text-emerald-500 font-medium">Approved by: {budget.approvedBy.email.split('@')[0]}</p>
                      )}
                    </div>

                    {isAdmin && budget.status === "PENDING" && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-3"
                          onClick={() => handleAction(budget.id, "reject")}
                          disabled={saving}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
                          onClick={() => handleAction(budget.id, "approve")}
                          disabled={saving}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {budget.categories && typeof budget.categories === "object" && Object.keys(budget.categories).length > 0 && (
                  <div className="px-6 pb-6 border-t border-slate-50 dark:border-slate-800/50">
                     <Accordion type="single" collapsible className="w-full border-none">
                      <AccordionItem value="breakdown" className="border-none">
                        <AccordionTrigger className="py-3 hover:no-underline text-xs text-blue-600 font-semibold justify-start gap-2 h-auto">
                          <span className="bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                            <AlertCircle className="h-3 w-3" />
                            {Object.keys(budget.categories).length} Categories Breakdown
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 mt-2 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[11px]">
                            {Object.entries(budget.categories as Record<string, number>)
                              .sort(([, a], [, b]) => b - a)
                              .map(([key, val]) => {
                                const label = expenseTypes.find(t => t.value === key)?.label || key;
                                return (
                                  <div key={key} className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-1.5 h-auto">
                                    <span className="text-slate-500 font-medium truncate max-w-[140px]" title={label}>{label}</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                                      {new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(val)}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
