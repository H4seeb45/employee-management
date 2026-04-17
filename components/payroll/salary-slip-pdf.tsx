import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontSize: 10,
    color: '#333333',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0A192F',
    paddingBottom: 20,
    marginBottom: 20,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A192F',
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 10,
    color: '#666666',
  },
  paySlipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  period: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'right',
  },
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoCol: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    color: '#666666',
    width: 80,
  },
  infoValue: {
    fontWeight: 'bold',
  },
  tablesContainer: {
    flexDirection: 'row',
    gap: 30,
  },
  tableSection: {
    flex: 1,
  },
  tableTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    paddingBottom: 4,
    marginBottom: 10,
  },
  earningsTitle: {
    color: '#0A192F',
    borderBottomColor: '#0A192F',
  },
  deductionsTitle: {
    color: '#991b1b',
    borderBottomColor: '#991b1b',
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    marginTop: 10,
    fontWeight: 'bold',
  },
  netAmountBox: {
    marginTop: 30,
    backgroundColor: '#0A192F',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netAmountText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'black',
  },
  netAmountLabel: {
    color: '#ffffff',
    opacity: 0.8,
    fontSize: 8,
    textTransform: 'uppercase',
  },
  signatureSection: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 100,
  },
  signatureLine: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
    paddingTop: 8,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
  }
});

interface SalarySlipPDFProps {
  payroll: any;
  monthName: string;
  year: string;
}

export const SalarySlipPDF = ({ payroll, monthName, year }: SalarySlipPDFProps) => {
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)}`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>Sadiq Traders</Text>
          </View>
          <View>
            <Text style={styles.paySlipTitle}>PAY SLIP</Text>
            <Text style={styles.period}>For the month of {monthName} {year}</Text>
          </View>
        </View>

        {/* Employee Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{payroll.employeeName || payroll.employee?.employeeName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Emp ID:</Text>
              <Text style={styles.infoValue}>{payroll.empId || payroll.employee?.employeeId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Designation:</Text>
              <Text style={styles.infoValue}>{payroll.designation || payroll.employee?.position}</Text>
            </View>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{payroll.locationName || payroll.employee?.location?.name || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Days Worked:</Text>
              <Text style={styles.infoValue}>{payroll.daysWorked} / {payroll.workingDays}</Text>
            </View>
          </View>
        </View>

        {/* Finance Content */}
        <View style={styles.tablesContainer}>
          {/* Earnings */}
          <View style={styles.tableSection}>
            <Text style={[styles.tableTitle, styles.earningsTitle]}>Earnings</Text>
            {[
              { label: 'Basic Payable', value: payroll.basicPayable },
              { label: 'Attendance Allowance', value: payroll.attendanceAllowance },
              { label: 'Daily Allowance', value: payroll.dailyAllowance },
              { label: 'Fuel Allowance', value: payroll.fuelAllowance },
              { label: 'Conveyance Allowance', value: payroll.conveyanceAllowance },
              { label: 'Maintenance', value: payroll.maintainence },
              { label: 'Commission', value: payroll.comission },
              { label: 'Incentives', value: payroll.incentives },
              ...(payroll.loadersAllowance > 0 ? [{ label: 'Loaders Allowance', value: payroll.loadersAllowance }] : []),
            ].map((item, idx) => (
              <View key={idx} style={styles.financeRow}>
                <Text>{item.label}</Text>
                <Text>{formatCurrency(item.value)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={{ color: '#0A192F' }}>Gross Salary</Text>
              <Text style={{ color: '#0A192F' }}>{formatCurrency(payroll.grossSalary)}</Text>
            </View>
          </View>

          {/* Deductions */}
          <View style={styles.tableSection}>
            <Text style={[styles.tableTitle, styles.deductionsTitle]}>Deductions</Text>
            {[
              { label: 'EOBI', value: payroll.eobi },
              { label: 'Social Security', value: payroll.socialSecurity },
              { label: 'Income Tax', value: payroll.incomeTax },
              { label: 'Advance Deduction', value: payroll.advance },
              { label: 'Loan Installment', value: payroll.loan },
            ].map((item, idx) => (
              <View key={idx} style={styles.financeRow}>
                <Text>{item.label}</Text>
                <Text>{formatCurrency(item.value)}</Text>
              </View>
            ))}
            <View style={[styles.totalRow, { color: '#991b1b', borderTopColor: '#fecaca' }]}>
              <Text>Total Deductions</Text>
              <Text>{formatCurrency(payroll.totalDeduction)}</Text>
            </View>
          </View>
        </View>

        {/* Net Amount */}
        <View style={[styles.netAmountBox, { backgroundColor: '#f8fafc', border: '1pt solid #0A192F' }]}>
          <View>
            <Text style={[styles.netAmountLabel, { color: '#64748b' }]}>Net Payable Amount</Text>
            <Text style={[styles.netAmountText, { color: '#0A192F' }]}>{formatCurrency(payroll.netSalary)}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={[styles.netAmountLabel, { fontSize: 6, color: '#64748b' }]}>Generated for Sadiq Traders</Text>
            <Text style={{ color: '#0A192F', fontSize: 8, fontStyle: 'italic' }}>Computer Generated Document</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureLine}>Employee Signature</Text>
          <Text style={styles.signatureLine}>Authorized Signature</Text>
        </View>

        <Text style={styles.footer}>
          This document is generated by Sadiq Traders HRMS. All rights reserved © 2026.
        </Text>
      </Page>
    </Document>
  );
};
