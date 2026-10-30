import { downloadCsv } from '../../utils/csvExport.js';
import { exportPdfReport } from '../../utils/pdfExport.js';

export default function ExportControls({ reportData, disabled = false }) {
  const hasData = reportData && reportData.transactions && reportData.transactions.length > 0;

  function handleExportCsv() {
    if (!hasData) return;
    downloadCsv(reportData.rows, reportData.startDate, reportData.endDate);
  }

  function handleExportPdf() {
    if (!hasData) return;
    exportPdfReport(reportData);
  }

  return (
    <div className="report-export-controls">
      <button
        type="button"
        className="button button--secondary"
        onClick={handleExportCsv}
        disabled={disabled || !hasData}
        title={!hasData ? 'No transaction data to export' : 'Export CSV'}
      >
        Export CSV
      </button>

      <button
        type="button"
        className="button"
        onClick={handleExportPdf}
        disabled={disabled || !hasData}
        title={!hasData ? 'No transaction data to export' : 'Export PDF'}
      >
        Export PDF
      </button>
    </div>
  );
}
