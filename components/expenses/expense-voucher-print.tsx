"use client";

import React from "react";

type ExpenseVoucherPrintProps = {
  expense: {
    id: string;
    expenseType: string;
    amount: number;
    details: string | null;
    updatedAt: string | Date;
    location?: {
      name: string;
      city: string;
    };
  };
};

export const ExpenseVoucherPrint = React.forwardRef<
  HTMLDivElement,
  ExpenseVoucherPrintProps
>(({ expense }, ref) => {
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
              size: A4 landscape;
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
            <h2 className="text-lg font-bold tracking-wide">CASH PAYMENT VOUCHER</h2>
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
        </div>

        {/* Payment Details Table */}
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

        {/* Amount in Words */}
        <div className="mb-4 border-2 border-gray-400 p-3 bg-gray-50">
          <div className="font-bold mb-1 text-xs">Amount in Words:</div>
          <div className="text-sm font-medium uppercase">
            {numberToWords(expense.amount)}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-gray-300 text-center text-xs text-gray-600">
          This is a computer-generated document. Please verify all details before processing.
        </div>
      </div>
    </div>
  );
});

ExpenseVoucherPrint.displayName = "ExpenseVoucherPrint";
