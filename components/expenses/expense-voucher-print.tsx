"use client";

import React from "react";

type ExpenseVoucherPrintProps = {
  expense: {
    id: string;
    expenseType: string;
    amount: number;
    details: string | null;
    status?: string;
    createdAt?: string;
    updatedAt: string | Date;
    location?: {
      name: string;
      city: string;
    };
    route?: {
      routeNo: string;
      name: string;
    };
    vehicle?: {
      vehicleNo: string;
      type: string | null;
      model: string | null;
    };
    attachments?: Array<{
      url: string;
      fileKey: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    }>;
    disburseType?: string;
    accountTitle?: string;
    accountNo?: string;
    bankName?: string;
    chequeDate?: string | Date;
    disbursedAmount?: number;
    category?: string;
    items?: any;
  } | null;
};

export const ExpenseVoucherPrint = React.forwardRef<
  HTMLDivElement,
  ExpenseVoucherPrintProps
>(({ expense }, ref) => {
  // Return null if no expense is provided
  if (!expense) {
    return <div ref={ref} />;
  }
  const expenseTypeLabels: Record<string, string> = {
    VEHICLES_FUEL: "Vehicles Fuel",
    VEHICLES_RENTAL: "Vehicles Rental",
    WAREHOUSE_RENTAL: "Warehouse Rental",
    SALARIES: "Salaries",
    ADVANCES_TO_EMP: "Advances To Employees",
    ENTERTAINMENT: "Entertainment",
    UTILITIES: "Utilities",
    REPAIR_MAINTENANCE: "Repair & Maintenance",
    STATIONERY: "Stationery",
    KITCHEN_EXPENSE: "Kitchen Expense",
    FIXED_ASSET: "Fixed Asset",
    TOLLS_TAXES: "Tolls & Taxes",
  };

  const numberToWords = (num: number): string => {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    if (num === 0) return "Zero";

    const convertHundreds = (n: number): string => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100)
        return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convertHundreds(n % 100) : "")
      );
    };

    const convertThousands = (n: number): string => {
      if (n < 1000) return convertHundreds(n);
      if (n < 100000)
        return (
          convertHundreds(Math.floor(n / 1000)) +
          " Thousand" +
          (n % 1000 ? " " + convertHundreds(n % 1000) : "")
        );
      return (
        convertHundreds(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + convertThousands(n % 100000) : "")
      );
    };

    const wholePart = Math.floor(num);
    const decimalPart = Math.round((num - wholePart) * 100);

    let result = convertThousands(wholePart) + " Rupees";
    if (decimalPart > 0) {
      result += " and " + convertHundreds(decimalPart) + " Paisa";
    }
    return result + " Only";
  };

  const formattedDate = new Date(expense.updatedAt).toLocaleDateString(
    "en-GB"
  );

  return (
    <div ref={ref} className="p-6 pt-0 bg-white text-black font-sans">
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}
      </style>

      {/* Main Border Container */}
      <div className="border-4 border-double border-black p-6">
        
        {/* Header with Company Name */}
        <div className="text-center mb-4 pb-3 border-b-2 border-black">
          <h1 className="text-3xl font-bold tracking-wider mb-1">SADIQ TRADERS</h1>
          <div className="text-xs text-gray-700">Trading & Distribution Company</div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-4">
          <div className="inline-block border-2 border-black px-6 py-2">
            <h2 className="text-lg font-bold tracking-wide">{`${
              (expense.disburseType || "Cash") === "Cash" ? "CASH" : "CHEQUE / ONLINE TRANSFER"
            } PAYMENT VOUCHER`}</h2>
          </div>
        </div>

        {/* Voucher Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 border border-gray-400 p-3 bg-gray-50 text-sm">
          <div className="flex">
            <span className="font-bold w-28">CPV #:</span>
            <span className="font-mono font-semibold text-base">{expense.id.substring(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-24">Date:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-28">Expense Type:</span>
            <span>{expenseTypeLabels[expense.expenseType] || expense.expenseType}</span>
          </div>
          {expense.location && (
            <div className="flex">
              <span className="font-bold w-24">Location:</span>
              <span>{expense.location.city} - {expense.location.name}</span>
            </div>
          )}
          {expense.vehicle && (
            <div className="flex">
              <span className="font-bold w-28">Vehicle:</span>
              <span>{expense.vehicle.vehicleNo}</span>
            </div>
          )}
          {expense.route && (
            <div className="flex">
              <span className="font-bold w-24">Route:</span>
              <span>{expense.route.routeNo} - {expense.route.name}</span>
            </div>
          )}
        </div>

        {/* Payment / Disbursement Details Section */}
        {(expense.disburseType || "Cash") === "Cash" ? (
          /* Standard Table for Cash Payments */
          <div className="mb-4">
            <table className="w-full border-2 border-black text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border-2 border-black text-left py-2 px-3 font-bold w-12">Sr #</th>
                  <th className="border-2 border-black text-left py-2 px-3 font-bold">Description / Details</th>
                  <th className="border-2 border-black text-right py-2 px-3 font-bold w-32">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-2 border-black py-2 px-3 text-center">1</td>
                  <td className="border-2 border-black py-2 px-3">
                    {expense.details || "No details provided"}
                  </td>
                  <td className="border-2 border-black py-2 px-3 text-right font-semibold">
                    {expense.amount.toLocaleString("en-PK", {
                      style: "currency",
                      currency: "PKR",
                    })}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan={2} className="border-2 border-black py-2 px-3 text-right font-bold">
                    TOTAL AMOUNT:
                  </td>
                  <td className="border-2 border-black py-2 px-3 text-right font-bold">
                    {expense.amount.toLocaleString("en-PK", {
                      style: "currency",
                      currency: "PKR",
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          /* Disbursement Details Box for Cheque/Online Transfer */
          <div className="mb-4 p-3 border-2 border-black bg-gray-50 text-sm">
            <h3 className="font-bold border-b border-black mb-3 pb-1 uppercase tracking-wider">Disbursement Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                  <span className="font-bold w-40">Account Title:</span>
                  <span className="flex-1">{expense.accountTitle || "N/A"}</span>
                </div>
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                  <span className="font-bold w-40">Account / Cheque No:</span>
                  <span className="flex-1">{expense.accountNo || "N/A"}</span>
                </div>
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                  <span className="font-bold w-40">Bank Name:</span>
                  <span className="flex-1">{expense.bankName || "N/A"}</span>
                </div>
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                  <span className="font-bold w-40">Cheque Date:</span>
                  <span className="flex-1">
                    {expense.chequeDate ? new Date(expense.chequeDate).toLocaleDateString("en-GB") : "N/A"}
                  </span>
                </div>
                <div className="flex border-b border-dotted border-gray-400 pb-1">
                  <span className="font-bold w-40 text-blue-800">Disbursed Amount:</span>
                  <span className="flex-1 font-bold text-lg">
                    {expense.disbursedAmount?.toLocaleString("en-PK", {
                      style: "currency",
                      currency: "PKR",
                    }) || "N/A"}
                  </span>
                </div>
              </div>

              {/* Add Expense Details in this view too for context */}
              <div className="bg-white p-2 border border-black/10 mt-2">
                <span className="font-bold text-xs uppercase text-gray-500 block mb-1">Description / Particulars:</span>
                <p className="text-sm italic">{expense.details || "No details provided"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown Section for Fixed Assets, Tolls & Taxes, or Bulk Entries */}
        {expense.items && Array.isArray(expense.items) && expense.items.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase border-black mb-2 pb-1">
              {(expense.category === "Fixed Asset" || expense.expenseType === "FIXED_ASSET") ? "Asset List / Breakdown" : "Payment Breakdown Details"}
            </h3>
            <table className="w-full border-2 border-black text-[11px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 text-left w-6">#</th>
                  {/* Determine columns based on first item's data */}
                  {expense.items.some((i: any) => i.vehicleNo || i.routeNo) ? (
                    <>
                      <th className="border border-black p-1 text-left">Vehicle No.</th>
                      <th className="border border-black p-1 text-left">Route No.</th>
                    </>
                  ) : (
                    <th className="border border-black p-1 text-left">Item / Detail</th>
                  )}
                  <th className="border border-black p-1 text-right w-28">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody>
                {expense.items.map((item: any, idx: number) => {
                  let vehicle = item.vehicleNo;
                  let route = item.routeNo;
                  // Handle legacy or combined format
                  if (!vehicle && item.name && item.name.includes("|")) {
                    const parts = item.name.split("|").map((s: string) => s.trim());
                    vehicle = parts[0];
                    route = parts[1];
                  }
                  
                  return (
                    <tr key={idx}>
                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                      {expense.items.some((i: any) => i.vehicleNo || i.routeNo) ? (
                        <>
                          <td className="border border-black p-1">{vehicle || "N/A"}</td>
                          <td className="border border-black p-1">{route || "N/A"}</td>
                        </>
                      ) : (
                        <td className="border border-black p-1">{item.name || item.details || "N/A"}</td>
                      )}
                      <td className="border border-black p-1 text-right font-medium">
                        {Number(item.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={expense.items.some((i: any) => i.vehicleNo || i.routeNo) ? 3 : 2} className="border border-black p-1 text-right">
                    Total
                  </td>
                  <td className="border border-black p-1 text-right">
                    {expense.amount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Amount in Words */}
        {/* <div className="mb-4 border-2 border-gray-400 p-3 bg-gray-50">
          <div className="font-bold mb-1 text-xs">Amount in Words:</div>
          <div className="text-sm font-medium uppercase">
            {numberToWords(expense.amount)}
          </div>
        </div> */}

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-gray-300 text-center text-xs text-gray-600">
          This is a computer-generated document. Please verify all details before processing.
        </div>
      </div>
    </div>
  );
});

ExpenseVoucherPrint.displayName = "ExpenseVoucherPrint";
