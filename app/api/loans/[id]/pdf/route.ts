import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
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
        React.createElement(Text, { style: styles.header }, "Loan Detail"),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Employee:"),
          React.createElement(
            Text,
            { style: styles.value },
            loan.employee?.employeeName ?? loan.employeeId
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Loan ID:"),
          React.createElement(Text, { style: styles.value }, loan.id)
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Principal:"),
          React.createElement(
            Text,
            { style: styles.value },
            String(loan.principalAmount)
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Balance:"),
          React.createElement(
            Text,
            { style: styles.value },
            String(loan.balance)
          )
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Due At:"),
          React.createElement(
            Text,
            { style: styles.value },
            loan.dueAt ? new Date(loan.dueAt).toLocaleDateString() : "-"
          )
        ),
        loan.notes
          ? React.createElement(
              View,
              { style: styles.notes },
              React.createElement(Text, { style: styles.label }, "Notes:"),
              React.createElement(Text, null, loan.notes)
            )
          : null,
        React.createElement(
          View,
          { style: { marginTop: 20 } },
          React.createElement(
            Text,
            { style: { fontSize: 10, textAlign: "center" } },
            "This is a computer generated loan detail."
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
        "Content-Disposition": `attachment; filename="loan-${loan.id}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("Loan PDF generation error", err);
    return NextResponse.json(
      {
        error:
          "PDF generation failed. Ensure @react-pdf/renderer is installed.",
      },
      { status: 500 }
    );
  }
}
