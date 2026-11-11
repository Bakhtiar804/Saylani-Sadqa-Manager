'use client';
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return <html lang="en"><body style={{fontFamily:'sans-serif',padding:40,textAlign:'center'}}><h1>We could not load the application</h1><p>Please check your connection and try again.</p><button onClick={()=>retry()}>Try again</button></body></html>;
}
