export async function fetchResponse(url: string, init: RequestInit = {}): Promise<Response> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('You are offline. Reconnect and try again.');
  try {
    const timeout = AbortSignal.timeout(30000);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    const response = await fetch(url, { ...init, signal });
    if(response.status>=500) throw new Error('The service is temporarily unavailable. Please try again.');
    if(!response.headers.get('content-type')?.includes('application/json')) throw new Error('The server returned an incomplete response. Please try again.');
    await response.clone().json().catch(()=>{throw new Error('The server returned an incomplete response. Please try again.');});
    return response;
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Unable to reach the server. Check your connection and try again.');
    if (error instanceof DOMException && error.name === 'TimeoutError') throw new Error('The request timed out. Please try again.');
    throw error;
  }
}
export async function requestJson<T>(url:string,init:RequestInit={}):Promise<T> {
  const response=await fetchResponse(url,init);
  const body=await response.json().catch(()=>null) as (T & {error?:string})|null;
  if(!response.ok) throw new Error(body?.error || 'This request could not be completed.');
  if(body===null) throw new Error('The server returned an incomplete response. Please try again.');
  return body;
}
