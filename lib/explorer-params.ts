export class QueryValidationError extends Error {}
export function validateExplorerParams(params:URLSearchParams):URLSearchParams {
  const page=params.get('page');
  if(page!==null && (!/^[1-9]\d{0,5}$/.test(page) || Number(page)>100000)) throw new QueryValidationError('Choose a valid page number.');
  for(const key of ['from','to']) {
    const value=params.get(key);if(!value) continue;
    const parsed=new Date(`${value}T00:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0,4))<1 || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10)!==value) throw new QueryValidationError('Choose a valid calendar date.');
  }
  const from=params.get('from'),to=params.get('to');
  if(from && to && from>to) throw new QueryValidationError('The start date must be on or before the end date.');
  return params;
}
