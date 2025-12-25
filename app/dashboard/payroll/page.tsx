"use client";

import { useEffect, useState } from "react";

function formatDate(dt: string | null) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt as string;
  }
}

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [amount, setAmount] = useState(0);
  const [employeeId, setEmployeeId] = useState("");
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [status, setStatus] = useState("Paid");
  const [notes, setNotes] = useState("");

  const [viewing, setViewing] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch("/api/payroll").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/employees").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([payrollData, employeeData]) => {
        if (!mounted) return;
        setPayrolls(Array.isArray(payrollData) ? payrollData : []);
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
        amount,
        paidAt: paidAt || new Date().toISOString(),
        status,
        notes,
      };
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      if (res.ok) {
        setPayrolls((prev) => [created, ...prev]);
        setAmount(0);
        setNotes("");
        setStatus("Paid");
        setPaidAt(null);
      } else {
        console.error("Create payroll failed", created);
        alert(created?.error || "Failed to create payroll");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create payroll");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Payroll</h1>

      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Create Payroll Record</h2>
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
            <label className="block text-sm mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value || "0"))}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Paid At</label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded"
              onChange={(e) =>
                setPaidAt(
                  e.target.value ? new Date(e.target.value).toISOString() : null
                )
              }
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Status</label>
            <select
              className="w-full p-2 border rounded"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Paid</option>
              <option>Pending</option>
              <option>Failed</option>
            </select>
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
          {payrolls.length === 0 ? (
            <p className="p-4">No payroll records found.</p>
          ) : (
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2">Employee</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Paid At</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t hover:bg-slate-50"
                    onClick={() => setViewing(p)}
                  >
                    <td className="p-2">
                      {p.employee?.employeeName ?? p.employeeId}
                    </td>
                    <td className="p-2">{p.amount}</td>
                    <td className="p-2">{formatDate(p.paidAt)}</td>
                    <td className="p-2">{p.status ?? "-"}</td>
                    <td className="p-2">
                      <a
                        //   /dashboard/payroll/${p.id}/slip
                        href={`#`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 underline"
                      >
                        Salary Slip (Not Available in Demo)
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* View modal - simple implementation */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded shadow max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-2">Payroll Details</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>Employee</strong>
                <div>
                  {viewing.employee?.employeeName ?? viewing.employeeId}
                </div>
              </div>
              <div>
                <strong>Amount</strong>
                <div>{viewing.amount}</div>
              </div>
              <div>
                <strong>Paid At</strong>
                <div>{formatDate(viewing.paidAt)}</div>
              </div>
              <div>
                <strong>Status</strong>
                <div>{viewing.status}</div>
              </div>
              <div className="md:col-span-2">
                <strong>Notes</strong>
                <div>{viewing.notes ?? "-"}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              {/* <a
                href={`/dashboard/payroll/${viewing.id}/slip`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-gray-100 rounded"
              >
                Open Slip
              </a> */}
              <button
                className="px-4 py-2 bg-slate-600 text-white rounded"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
