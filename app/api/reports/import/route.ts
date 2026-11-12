import { revalidateTag } from 'next/cache';
import { withApiErrors } from '@/lib/api-errors';
import { getOperationsSession,hasValidRequestOrigin } from '@/lib/operations-auth';
import { canImportReports } from '@/lib/permissions';
import { parseExcelReports,ImportValidationError } from '@/lib/excel-reports';
import { prepareReportUpload,applyReportUpload } from '@/lib/report-upload';

export const POST=withApiErrors(async(request:Request)=>{
  const session=await getOperationsSession();
  if(!session) return Response.json({error:'Sign in before importing reports.'},{status:401});
  if(!canImportReports(session.role) || !session.cityId) return Response.json({error:'Only city-assigned City and Branch Admins can import reports.'},{status:403});
  if(!hasValidRequestOrigin(request)) return Response.json({error:'Invalid request origin.'},{status:403});
  if(Number(request.headers.get('content-length'))>6*1024*1024) return Response.json({error:'Choose a workbook smaller than 5 MB.'},{status:413});
  try {
    const form=await request.formData();const file=form.get('file');const mode=form.get('mode');
    if(!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx') || file.size>5*1024*1024 || !file.size) return Response.json({error:'Choose a nonempty .xlsx workbook smaller than 5 MB.'},{status:400});
    if(mode!=='preview' && mode!=='apply') return Response.json({error:'Preview the workbook before importing.'},{status:400});
    const bytes=Buffer.from(await file.arrayBuffer());
    const plan=await prepareReportUpload(await parseExcelReports(bytes),session,bytes);
    if(mode==='preview') return Response.json({preview:plan.preview});
    if(form.get('fingerprint')!==plan.preview.fingerprint) return Response.json({error:'The file changed. Preview it again before importing.'},{status:409});
    const result=await applyReportUpload(plan,session,file.name.replace(/[^\w .()-]/g,'_').slice(0,200));
    revalidateTag('dashboard-db-records',{expire:0});
    return Response.json(result);
  } catch(error) {
    if(error instanceof ImportValidationError) return Response.json({error:error.message},{status:422});
    if(error instanceof TypeError) return Response.json({error:'The upload was incomplete. Choose the workbook and try again.'},{status:400});
    throw error;
  }
});
