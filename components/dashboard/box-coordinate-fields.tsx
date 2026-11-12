'use client';
import { useRef, useState } from 'react';

export default function BoxCoordinateFields({ latitude, longitude, disabled = false }: { latitude?: string | number | null; longitude?: string | number | null; disabled?: boolean }) {
  const lat = useRef<HTMLInputElement>(null), lng = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  function locate() {
    setError('');
    if (!navigator.geolocation) { setError('GPS is unavailable. Enter the coordinates manually.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position => {
      if (lat.current) lat.current.value = position.coords.latitude.toFixed(6);
      if (lng.current) lng.current.value = position.coords.longitude.toFixed(6);
      setLocating(false);
    }, () => { setLocating(false); setError('Could not get GPS. Allow location access or enter coordinates manually.'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  const field = 'h-10 w-full rounded-lg border border-[#dce8dc] bg-white px-3 text-sm font-normal text-[#203526]';
  return <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
    <legend className="mb-2 text-sm font-bold text-[#203526]">Box GPS location</legend>
    <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Latitude<input ref={lat} name="latitude" type="number" step="0.000001" min="-90" max="90" defaultValue={latitude ?? ''} placeholder="24.860700" className={field}/></label>
    <label className="grid gap-1.5 text-xs font-semibold text-[#536455]">Longitude<input ref={lng} name="longitude" type="number" step="0.000001" min="-180" max="180" defaultValue={longitude ?? ''} placeholder="67.001100" className={field}/></label>
    <div className="sm:col-span-2"><button type="button" disabled={disabled || locating} onClick={locate} className="rounded-lg border border-[#dce8dc] bg-white px-3 py-2 text-xs font-bold text-[#276431] disabled:opacity-50">{locating ? 'Getting GPS…' : 'Use my current GPS location'}</button><p className="mt-2 text-xs leading-5 text-[#718073]">Use current GPS only when you are at the box. You can also copy its latitude and longitude from a map. Leave both blank if the location has not been verified.</p></div>
    {error && <p role="alert" className="text-xs text-red-700 sm:col-span-2">{error}</p>}
  </fieldset>;
}
