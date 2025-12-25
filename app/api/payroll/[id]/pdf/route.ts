import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const payroll = await prisma.payroll.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!payroll) {
    return NextResponse.json({ error: "Payroll not found" }, { status: 404 });
  }

  try {
    const ReactModule = await import("react");
    const React = (ReactModule && (ReactModule.default || ReactModule)) as any;

    const pdfModule = await import("@react-pdf/renderer");
    const pdfLib = (pdfModule && (pdfModule.default || pdfModule)) as any;

    const { Document, Page, Text, View, StyleSheet, pdf } = pdfLib;

    if (!React || !React.createElement) {
      throw new Error("React import failed or createElement not available");
    }
    if (!pdf || typeof pdf !== "function") {
      throw new Error("`pdf` export not found on @react-pdf/renderer");
    }

    const styles = StyleSheet.create({
      page: { padding: 40, fontSize: 12, fontFamily: "Helvetica" },
      header: { textAlign: "center", marginBottom: 10, fontSize: 18 },
      row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
      },
      label: { color: "#444" },
      value: { fontWeight: "bold" },
      notes: { marginTop: 10 },
    });

    const element = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        React.createElement(Text, { style: styles.header }, "Salary Slip"),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Employee:"),
          React.createElement(
            Text,
            { style: styles.value },
            payroll.employee?.employeeName ?? payroll.employeeId
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Payroll ID:"),
          React.createElement(Text, { style: styles.value }, payroll.id)
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Amount:"),
          React.createElement(
            Text,
            { style: styles.value },
            String(payroll.amount)
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Paid At:"),
          React.createElement(
            Text,
            { style: styles.value },
            payroll.paidAt ? new Date(payroll.paidAt).toLocaleString() : "-"
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Status:"),
          React.createElement(
            Text,
            { style: styles.value },
            payroll.status ?? "-"
          )
        ),
        payroll.notes
          ? React.createElement(
              View,
              { style: styles.notes },
              React.createElement(Text, { style: styles.label }, "Notes:"),
              React.createElement(Text, null, payroll.notes)
            )
          : null,
        React.createElement(
          View,
          { style: { marginTop: 20 } },
          React.createElement(
            Text,
            { style: { fontSize: 10, textAlign: "center" } },
            "This is a computer generated salary slip."
          )
        )
      )
    );

    const pdfDoc = pdf(element as any);
    const buffer: Buffer = await pdfDoc.toBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="salary-slip-${payroll.id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF generation error", err);
    return NextResponse.json(
      {
        error:
          "PDF generation failed. Ensure @react-pdf/renderer is installed.",
      },
      { status: 500 }
    );
  }
}
