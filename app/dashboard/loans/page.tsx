"use client";

import { useEffect, useState } from "react";

export default function LoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [employeeId, setEmployeeId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch("/api/loans").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/employees").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([loanData, employeeData]) => {
        if (!mounted) return;
        setLoans(Array.isArray(loanData) ? loanData : []);
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
        if (
          Array.isArray(employeeData) &&
          employeeData.length > 0 &&
          !employeeId
        ) {
          setEmployeeId(employeeData[0].id || employeeData[0].employeeId || "");
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        employeeId,
        principalAmount,
        balance: balance || principalAmount,
        dueAt: dueAt || null,
        notes,
      };
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      if (res.ok) {
        setLoans((prev) => [created, ...prev]);
        setPrincipalAmount(0);
        setBalance(0);
        setDueAt(null);
        setNotes("");
      } else {
        console.error("Create loan failed", created);
        alert(created?.error || "Failed to create loan");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create loan");
    }
  };

  const openPdf = async (id: string) => {
    try {
      const res = await fetch(`/api/loans/${id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to generate PDF");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
      alert("Failed to download PDF");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Loans</h1>

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Create Loan</h2>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label className="block text-sm mb-1">Employee</label>
            <select
              className="w-full p-2 border rounded"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employeeName ?? emp.employeeId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Principal</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded"
              value={principalAmount}
              onChange={(e) =>
                setPrincipalAmount(parseFloat(e.target.value || "0"))
              }
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Balance</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded"
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value || "0"))}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Due At</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              onChange={(e) =>
                setDueAt(
                  e.target.value ? new Date(e.target.value).toISOString() : null
                )
              }
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Notes</label>
            <input
              className="w-full p-2 border rounded"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-sky-600 text-white p-2 rounded"
            >
              Create
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded shadow-sm overflow-hidden">
          {loans.length === 0 ? (
            <p className="p-4">No loan records found.</p>
          ) : (
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Principal</th>
                  <th className="text-left p-2">Balance</th>
                  <th className="text-left p-2">Due At</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-slate-50">
                    <td className="p-2">
                      {l.employee?.employeeName ?? l.employeeId}
                    </td>
                    <td className="p-2">{l.principalAmount}</td>
                    <td className="p-2">{l.balance}</td>
                    <td className="p-2">
                      {l.dueAt ? new Date(l.dueAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => openPdf(l.id)}
                        className="text-sky-600 underline"
                      >
                        Print (Not Available in Demo)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
