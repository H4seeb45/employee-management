"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PayrollSlipPage() {
  const params = useParams();
  const id = params?.id;
  const [payroll, setPayroll] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    fetch(`/api/payroll/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted) return;
        setPayroll(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  function formatDate(dt: string | null) {
    if (!dt) return "-";
    try {
      return new Date(dt).toLocaleString();
    } catch {
      return dt as string;
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">Sasdiq Traders</h1>
          <div className="text-sm text-slate-600">Salary Slip</div>
        </div>
        <div>
          <button
            // onClick={async () => {
            //   if (!id) return;
            //   try {
            //     const res = await fetch(`/api/payroll/${id}/pdf`);
            //     if (!res.ok) {
            //       const err = await res.json().catch(() => ({}));
            //       alert(err?.error || "Failed to generate PDF");
            //       return;
            //     }
            //     const blob = await res.blob();
            //     const url = URL.createObjectURL(blob);
            //     window.open(url, "_blank");
            //   } catch (e) {
            //     console.error(e);
            //     alert("Failed to download PDF");
            //   }
            // }}
            className="px-3 py-1 bg-sky-600 text-white rounded"
          >
            Download / Print (Not Available in Demo)
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : !payroll ? (
        <p>Payroll record not found.</p>
      ) : (
        <div className="border p-6 rounded bg-white">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-slate-500">Employee</div>
              <div className="font-semibold">
                {payroll.employee?.employeeName ?? payroll.employeeId}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Payroll ID</div>
              <div className="font-semibold">{payroll.id}</div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Amount</div>
              <div className="font-semibold">{payroll.amount}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Paid At</div>
              <div className="font-semibold">{formatDate(payroll.paidAt)}</div>
            </div>

            <div>
              <div className="text-sm text-slate-500">Status</div>
              <div className="font-semibold">{payroll.status}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Generated</div>
              <div className="font-semibold">{new Date().toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-slate-500">Notes</div>
            <div className="mt-1">{payroll.notes ?? "-"}</div>
          </div>

          <style jsx>{`
            @media print {
              button {
                display: none !important;
              }
              body {
                -webkit-print-color-adjust: exact;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
