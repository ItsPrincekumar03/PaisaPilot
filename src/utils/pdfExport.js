import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildPdfReportModel } from './reportCalculations.js';
import { isValidIsoDate } from './transactionFilters.js';

export function buildPdfFilename(startDate, endDate) {
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    throw new Error('Export dates must be valid YYYY-MM-DD values.');
  }
  return `paisapilot-report-${startDate}-to-${endDate}.pdf`;
}

/**
 * Generates and downloads a branded, professional PDF report from reportData.
 */
export function exportPdfReport(reportData) {
  const generatedLabel = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const model = buildPdfReportModel(reportData, generatedLabel);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const primaryColor = [118, 87, 232]; // #7657E8
  const textColor = [37, 36, 58]; // #25243A
  const mutedColor = [92, 89, 117]; // #5C5975

  // Header
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(model.title, 40, 50);

  doc.setFontSize(10);
  doc.setTextColor(...mutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${model.periodLabel}`, 40, 68);
  doc.text(`Generated: ${model.generatedLabel}`, 40, 82);

  if (model.note) {
    doc.setTextColor(241, 109, 101); // warning / red
    doc.text(model.note, 40, 96);
  }

  // Summary Table
  doc.setFontSize(13);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary', 40, model.note ? 118 : 108);

  autoTable(doc, {
    startY: model.note ? 124 : 114,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    head: [['Metric', 'Value']],
    body: model.summaryRows,
  });

  let currentY = doc.lastAutoTable.finalY + 25;

  // Category Breakdown Table
  if (model.categoryRows.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Expense Breakdown by Category', 40, currentY);

    autoTable(doc, {
      startY: currentY + 6,
      margin: { left: 40, right: 40 },
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
      head: [['Category', 'Total Spent', '% of Expenses']],
      body: model.categoryRows,
    });

    currentY = doc.lastAutoTable.finalY + 25;
  }

  // Transaction Records Table
  if (model.transactionRows.length > 0) {
    if (currentY > 650) {
      doc.addPage();
      currentY = 50;
    }

    doc.setFontSize(13);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction Records', 40, currentY);

    autoTable(doc, {
      startY: currentY + 6,
      margin: { left: 40, right: 40 },
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 4 },
      head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
      body: model.transactionRows,
    });
  }

  const filename = buildPdfFilename(reportData.startDate, reportData.endDate);
  doc.save(filename);
}
