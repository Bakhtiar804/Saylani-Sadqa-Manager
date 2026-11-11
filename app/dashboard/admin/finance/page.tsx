import MonthlyReportPage, { type ReportPageProps } from '@/components/dashboard/monthly-report-page';

export default function Page(props: ReportPageProps) {
  return <MonthlyReportPage {...props} view="expenses"/>;
}
