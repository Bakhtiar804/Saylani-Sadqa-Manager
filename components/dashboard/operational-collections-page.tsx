import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import { getOperationsSession } from '@/lib/operations-auth';
import { getCityOptions,getCollectionExplorerPage,getFieldCollectionExplorerPage } from '@/lib/dashboard-data';
import PageHeading from './page-heading';
import RecordExplorer from './record-explorer';

export default async function OperationalCollectionsPage() {
  await connection();const session=await getOperationsSession();if(!session) redirect('/sign-in');if(session.role==='rider') redirect('/dashboard/rider/collections');
  if(session.role!=='super_admin' && !session.cityId) return <PageHeading eyebrow="Collections" title="City assignment required" description="An operating city is required to view collection records."/>;
  const city=session.role==='super_admin'?'all':session.cityId!;
  const [collections,logs,allCities]=await Promise.all([getCollectionExplorerPage({city}),getFieldCollectionExplorerPage({city}),getCityOptions()]);
  const cities=session.role==='super_admin'?allCities:allCities.filter(row=>row.city_id===session.cityId);
  const endpoint=session.role==='super_admin'?'/api/dashboard/collections':'/api/dashboard/admin/collections';
  return <><PageHeading eyebrow="Field records" title="Individual Collections" description="Recorded collections, field visits and cash handovers."/>
    <div className="mb-6"><RecordExplorer title="Collection register" description="Individual entries, separate from monthly Excel summaries. Open Details to review an entry." records={collections.records} totalRecords={collections.totalRecords} remoteEndpoint={endpoint} cities={cities} dateKey="collection_date" allowCollectionReview={session.role==='admin' || session.role==='city_manager'} columns={[{key:'collection_id',label:'Collection'},{key:'collection_date',label:'Date'},{key:'city_id',label:'City'},{key:'rider_name',label:'Rider'},{key:'box_id',label:'Box'},{key:'collection_amount_pkr',label:'Amount'}]}/></div>
    <RecordExplorer title="Field visits" description="Cash count and visit details." records={logs.records} totalRecords={logs.totalRecords} remoteEndpoint={`${endpoint}/field-logs`} cities={cities} dateKey="collection_date" columns={[{key:'field_collection_id',label:'Visit'},{key:'collection_date',label:'Date'},{key:'city_id',label:'City'},{key:'rider_name',label:'Rider'},{key:'total_cash_counted_pkr',label:'Amount'}]}/>
  </>;
}
