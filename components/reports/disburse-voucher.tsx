"use client";

import React from "react";

type DisburseVoucherProps = {
  record: {
    id: string;
    principalAmount: number;
    notes: string | null;
    issuedAt: string | null;
    status?: string;
    type: "Loan" | "Advance";
    employee: {
        employeeId: string;
        employeeName: string;
        position: string | null;
        location?: {
            name: string;
            city: string;
        }
    }
  } | null;
};

export const DisburseVoucher = React.forwardRef<HTMLDivElement, DisburseVoucherProps>(
  ({ record }, ref) => {
    if (!record) return <div ref={ref} />;

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

    const formattedDate = record.issuedAt ? new Date(record.issuedAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");

    return (
      <div ref={ref} className="p-6 pt-0 bg-white text-black font-sans min-h-[500px]">
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
        <div className="border-4 border-double border-black p-6 mt-1">
          
          {/* Header with Company Name */}
          <div className="text-center mb-4 pb-3 border-b-2 border-black">
            <h1 className="text-3xl font-bold tracking-wider mb-1">SADIQ TRADERS</h1>
            {/* <div className="text-xs text-gray-700">Trading & Distribution Company</div> */}
          </div>

          {/* Document Title */}
          <div className="text-center mb-4">
            <div className="inline-block border-2 border-black px-6 py-2">
              <h2 className="text-lg font-bold tracking-wide">{record.type.toUpperCase()} PAYMENT VOUCHER</h2>
            </div>
          </div>

          {/* Voucher Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 border border-gray-400 p-3 bg-gray-50 text-sm">
            <div className="flex">
              <span className="font-bold w-28">Voucher #:</span>
              <span className="font-mono font-semibold text-base">{record.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24">Date:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-28">Employee:</span>
              <span>{record.employee.employeeName} ({record.employee.employeeId})</span>
            </div>
            <div className="flex">
              <span className="font-bold w-24">Location:</span>
              <span>{record.employee.location?.name || "N/A"}</span>
            </div>
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
                  <td className="border-2 border-black py-2 px-3 text-center align-top">1</td>
                  <td className="border-2 border-black py-2 px-3 min-h-[100px]">
                    <p className="font-semibold mb-2">{record.type} Disbursement</p>
                    <p className="text-gray-600 italic">Reason: {record.notes || "No additional notes provided"}</p>
                    <p className="mt-4 text-[11px] text-gray-500 uppercase tracking-tighter">
                       Designation: {record.employee.position || "N/A"}
                    </p>
                  </td>
                  <td className="border-2 border-black py-2 px-3 text-right font-bold align-top">
                    {record.principalAmount.toLocaleString("en-PK", {
                      style: "currency",
                      currency: "PKR",
                    })}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan={2} className="border-2 border-black py-2 px-3 text-right font-bold uppercase tracking-wider">
                    Total Disbursed Amount
                  </td>
                  <td className="border-2 border-black py-2 px-3 text-right font-bold text-lg">
                    {record.principalAmount.toLocaleString("en-PK", {
                      style: "currency",
                      currency: "PKR",
                    })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          {/* <div className="mb-6 border-2 border-gray-400 p-3 bg-gray-50">
            <div className="font-bold mb-1 text-xs text-gray-500 uppercase">Amount in Words:</div>
            <div className="text-sm font-medium uppercase italic">
              {numberToWords(record.principalAmount)}
            </div>
          </div> */}

          {/* Signature Section */}
          {/* <div className="mt-16 grid grid-cols-3 gap-8 px-4">
            <div className="text-center">
              <div className="border-t-2 border-black pt-2">
                <p className="font-bold uppercase tracking-widest text-[10px]">Employee Signature</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-black pt-2">
                <p className="font-bold uppercase tracking-widest text-[10px]">Cashier Signature</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-black pt-2">
                <p className="font-bold uppercase tracking-widest text-[10px]">Manager Signature</p>
              </div>
            </div>
          </div> */}

          {/* Company Stamp Space */}
          {/* <div className="mt-12 flex justify-end">
            <div className="w-32 h-32 border-2 border-dotted border-gray-300 rounded-full flex items-center justify-center text-gray-300 text-[10px] text-center p-4 transform rotate-12">
              COMPANY STAMP
            </div>
          </div> */}

          {/* Footer Note */}
          <div className="text-center text-[9px] text-gray-400 uppercase tracking-widest">
            Official Payment Document • Sadiq Traders • Internal Use Only
          </div>
        </div>
      </div>
    );
  }
);

DisburseVoucher.displayName = "DisburseVoucher";
