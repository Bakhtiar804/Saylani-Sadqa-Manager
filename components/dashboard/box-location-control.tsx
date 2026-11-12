'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { requestJson } from '@/lib/client-request';
import BoxCoordinateFields from './box-coordinate-fields';

export default function BoxLocationControl({ boxId, latitude, longitude, onSaved }: { boxId: string; latitude?: string | number | null; longitude?: string | number | null; onSaved?: () => void }) {
  const router = useRouter(), inFlight = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    inFlight.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await requestJson(`/api/dashboard/boxes/${encodeURIComponent(boxId)}/location`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude: data.get('latitude'), longitude: data.get('longitude') }) });
      setMessage('Location saved. The map is being refreshed.'); onSaved?.(); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save location.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-4 rounded-xl border border-[#dce8dc] bg-white p-4 text-[#203526]">
    <BoxCoordinateFields latitude={latitude} longitude={longitude} disabled={busy}/>
    <button disabled={busy} className="mt-3 rounded-lg bg-[#276431] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save box location'}</button>
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}{message && <p role="status" className="mt-2 text-xs text-[#276431]">{message}</p>}
  </form>;
}
