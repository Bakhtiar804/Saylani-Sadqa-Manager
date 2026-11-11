import { randomUUID } from 'node:crypto';
import { unstable_rethrow } from 'next/navigation';
import { QueryValidationError } from './explorer-params';

export function withApiErrors<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      const response = await handler(...args);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } catch (error) {
      unstable_rethrow(error);
      if(error instanceof QueryValidationError) return Response.json({error:error.message},{status:400,headers:{'Cache-Control':'no-store'}});
      const reference = randomUUID();
      console.error(`API failure [${reference}]`, error);
      return Response.json({ error: 'The service is temporarily unavailable. Please retry shortly.', reference },
        { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  };
}
