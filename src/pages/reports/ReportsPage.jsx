import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import DateRangeSelector from '../../components/reports/DateRangeSelector.jsx';
import ExportControls from '../../components/reports/ExportControls.jsx';
import ReportSummary from '../../components/reports/ReportSummary.jsx';
import MonthlyTrendChart from '../../components/reports/MonthlyTrendChart.jsx';
import CategoryReportChart from '../../components/reports/CategoryReportChart.jsx';
import TransactionReportTable from '../../components/reports/TransactionReportTable.jsx';
import useReports from '../../hooks/useReports.js';
import '../../styles/reports.css';

export default function ReportsPage() {
  const {
    preset,
    startDate,
    endDate,
    rangeErrors,
    isLoading,
    isError,
    reportData,
    error,
    selectPreset,
    changeStartDate,
    changeEndDate,
    refetch,
  } = useReports();

  return (
    <div className="reports-page page-stack">
      <section className="reports-header-panel" aria-label="Report settings and export">
        <div className="reports-header-panel__top">
          <DateRangeSelector
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            errors={rangeErrors}
            onSelectPreset={selectPreset}
            onChangeStartDate={changeStartDate}
            onChangeEndDate={changeEndDate}
            disabled={isLoading}
          />

          <ExportControls reportData={reportData} disabled={isLoading || isError} />
        </div>
      </section>

      {isLoading && (
        <section className="panel" aria-busy="true">
          <LoadingState label="Calculating report data…" />
        </section>
      )}

      {isError && (
        <section className="panel">
          <ErrorState
            title="Unable to load report"
            message={error || 'An error occurred while compiling report analytics.'}
            onRetry={refetch}
          />
        </section>
      )}

      {!isLoading && !isError && reportData && (
        <>
          <ReportSummary summary={reportData.summary} />

          <div className="grid-two">
            <section className="panel" aria-labelledby="monthly-trend-heading">
              <div className="panel__header">
                <h2 id="monthly-trend-heading">Monthly Comparison</h2>
                <p className="panel__subtitle">Income vs Expenses over selected range</p>
              </div>
              <MonthlyTrendChart monthly={reportData.monthly} />
            </section>

            <section className="panel" aria-labelledby="category-breakdown-heading">
              <div className="panel__header">
                <h2 id="category-breakdown-heading">Spending by Category</h2>
                <p className="panel__subtitle">Category share across chosen period</p>
              </div>
              <CategoryReportChart categoryBreakdown={reportData.categoryBreakdown} />
            </section>
          </div>

          <section className="panel" aria-labelledby="report-transactions-heading">
            <div className="panel__header">
              <h2 id="report-transactions-heading">Transaction Records</h2>
              <p className="panel__subtitle">
                {reportData.rows.length} transaction{reportData.rows.length === 1 ? '' : 's'} included in report
              </p>
            </div>
            <TransactionReportTable rows={reportData.rows} />
          </section>
        </>
      )}
    </div>
  );
}
