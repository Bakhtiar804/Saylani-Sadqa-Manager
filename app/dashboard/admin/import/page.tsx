import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { getOperationsSession } from '@/lib/operations-auth';
import { canImportReports } from '@/lib/permissions';
import { getDatabasePool } from '@/lib/db';
import ReportImport from '@/components/dashboard/report-import';
import PageHeading from '@/components/dashboard/page-heading';

export default async function ImportPage() {
  await connection();const session=await getOperationsSession();
  if(!session) redirect('/sign-in');
  if(!canImportReports(session.role)) redirect('/dashboard');
  if(!session.cityId) return <PageHeading eyebrow="Excel import" title="City assignment required" description="An operating city must be assigned before reports can be imported."/>;
  const city=(await getDatabasePool().query<{city_name:string}>('SELECT city_name FROM cities WHERE city_id=$1',[session.cityId])).rows[0];
  return <><PageHeading eyebrow="Reports" title="Excel Import" description="Preview and import monthly records for your assigned city."/><ReportImport city={city?.city_name || 'your assigned city'}/></>;
}
