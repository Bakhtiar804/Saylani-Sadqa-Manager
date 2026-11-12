'use client';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { NetworkCity } from '@/lib/network-tree';
import { buildBoxPoints, cityMapBounds, getMapBoxes, type MapBox } from '@/lib/box-map';
import { hasBoxCoordinates } from '@/lib/box-coordinates';
import { useNetworkCity } from './network-city-selection';
import BoxLocationControl from './box-location-control';

const Canvas = dynamic(() => import('./box-map-canvas'), { ssr: false, loading: () => <div className="grid h-[440px] place-items-center bg-[#051c18] text-sm text-[#a1c6b6] sm:h-[560px] lg:h-[640px]">Loading map…</div> });
const number = (value: number) => value.toLocaleString('en-PK');
const located = (box: MapBox) => hasBoxCoordinates({ latitude: box.latitude ?? null, longitude: box.longitude ?? null });
const field = 'h-10 rounded-lg border border-[#dce8dc] bg-white px-3 text-xs text-[#203526]';

export default function NetworkMap({ cities, inventoryHref, canEdit = false, syncCityFilter = false, initialCity = 'all' }: { cities: NetworkCity[]; inventoryHref?: string; canEdit?: boolean; syncCityFilter?: boolean; initialCity?: string }) {
  const router = useRouter(), selection = useNetworkCity();
  const listRef = useRef<HTMLDivElement>(null), mapRef = useRef<HTMLDivElement>(null), detailsRef = useRef<HTMLDivElement>(null);
  const [gpsHelp, setGpsHelp] = useState(false);
  const [localCity, setLocalCity] = useState(initialCity), [pending, startTransition] = useTransition();
  const cityId = selection?.cityId ?? localCity, city = cities.find(item => item.id === cityId), label = city?.name || 'Pakistan';
  const [search, setSearch] = useState(''), [status, setStatus] = useState('all'), [gps, setGps] = useState('all');
  const [selectedId, setSelectedId] = useState(''), [page, setPage] = useState(0), [fitKey, setFitKey] = useState(0);
  const [focus, setFocus] = useState<[[number, number], [number, number]] | null>(null);
  const [picking, setPicking] = useState(false), [picked, setPicked] = useState<{ latitude: number; longitude: number } | null>(null);
  const allBoxes = useMemo(() => getMapBoxes(cities, cityId), [cities, cityId]);
  const boxes = useMemo(() => getMapBoxes(cities, cityId, search, status), [cities, cityId, search, status]);
  const points = useMemo(() => buildBoxPoints(boxes), [boxes]);
  const list = useMemo(() => boxes.filter(box => gps === 'all' || (gps === 'located' ? located(box) : !located(box))), [boxes, gps]);
  const pages = Math.max(1, Math.ceil(list.length / 20)), currentPage = Math.min(page, pages - 1);
  const selected = boxes.find(box => box.id === selectedId);
  const bounds = useMemo(() => cityMapBounds(city, allBoxes), [city, allBoxes]);
  const locatedCount = useMemo(() => allBoxes.filter(located).length, [allBoxes]);
  const params = new URLSearchParams(inventoryHref?.split('?')[1] || ''); params.set('city', cityId);
  const inventoryLink = inventoryHref ? `${inventoryHref.split('?')[0]}?${params}` : undefined;
  useEffect(() => {
    let last = 0;
    const refresh = () => { if (document.visibilityState === 'visible' && Date.now() - last > 30000) { last = Date.now(); router.refresh(); } };
    window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh);
  }, [router]);
  function chooseCity(id: string) {
    if (selection) selection.setCityId(id); else setLocalCity(id);
    setSelectedId(''); setPicked(null); setPicking(false); setFocus(null); setPage(0); setFitKey(value => value + 1);
    if (syncCityFilter) {
      const url = new URL(window.location.href); url.searchParams.set('city', id);
      startTransition(() => router.replace(`${url.pathname}?${url.searchParams}`, { scroll: false }));
    }
  }
  function addGps() {
    if (selected) { setPicking(true); mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    setGps(boxes.some(box => !located(box)) ? 'pending' : 'all'); setPage(0); setGpsHelp(true);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function chooseBox(box: MapBox, fly = false) {
    setSelectedId(box.id); setPicked(null); setPicking(false); setGpsHelp(false);
    if (fly) { setFocus(located(box) ? [[box.longitude! - .005, box.latitude! - .005], [box.longitude! + .005, box.latitude! + .005]] : cityMapBounds(cities.find(city => city.id === box.cityId), getMapBoxes(cities, box.cityId))); setFitKey(value => value + 1); }
  }
  return <section aria-label="Donation box location network" aria-busy={pending} className="mb-6 overflow-hidden rounded-3xl border border-[#dfe9d9] bg-white">
    <div className="flex flex-wrap items-start justify-between gap-5 bg-[#06241e] px-6 py-6 text-white sm:px-8">
      <div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#86bb9f]">Live donation network</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Boxes across <span className="text-[#65ff83]">{label}</span></h2><p className="mt-2 text-xs leading-5 text-[#b0cebd]">Every dot is a registered box at its saved GPS location.</p></div>
      <div className="flex gap-6">{[[allBoxes.length, 'Registered boxes'], [locatedCount, 'GPS located']].map(([value, title]) => <div key={title}><p className="text-3xl font-black text-[#65ff83]">{number(Number(value))}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#b0cebd]">{title}</p></div>)}</div>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-b border-[#e8efe3] p-4" aria-label="Choose map city">
      <button type="button" onClick={() => chooseCity('all')} aria-pressed={cityId === 'all'} className={`rounded-xl border px-4 py-2 text-xs font-bold ${cityId === 'all' ? 'border-[#276431] bg-[#276431] text-white' : 'border-[#dce8dc] text-[#276431]'}`}>Pakistan</button>
      {city && <button type="button" aria-label={`Clear ${city.name} and show Pakistan`} onClick={() => chooseCity('all')} className="rounded-xl bg-[#edf5e8] px-3 py-2 text-xs font-bold text-[#276431]">{city.name} <span aria-hidden="true" className="ml-2">×</span></button>}
      <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-[#536455]">City<select aria-label="Map city" value={cityId} onChange={event => chooseCity(event.target.value)} className={`${field} max-w-56`}><option value="all">Pakistan · accessible cities</option>{cities.map(item => <option key={item.id} value={item.id}>{item.name} · {number(item.registeredBoxes)}</option>)}</select></label>
      <button type="button" onClick={() => { setFocus(null); setFitKey(value => value + 1); }} className="rounded-lg border border-[#dce8dc] px-3 py-2 text-xs font-bold text-[#276431]">Fit {label}</button>
      {canEdit && <button type="button" disabled={!boxes.length} onClick={addGps} className="rounded-lg bg-[#276431] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{selected ? 'Pick GPS on map' : 'Add GPS location'}</button>}
      <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="rounded-lg border border-[#dce8dc] px-3 py-2 text-xs font-bold text-[#276431] disabled:opacity-50">{pending ? 'Refreshing…' : 'Refresh data'}</button>
    </div>
    <div className="flex flex-wrap items-center gap-3 border-b border-[#e8efe3] bg-[#f8fbf6] px-5 py-3">
      <label className="min-w-44 flex-1"><span className="sr-only">Find city, area, box, address or rider</span><input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Find box ID, area, QR code, address…" className={`${field} w-full`}/></label>
      <label className="flex items-center gap-2 text-xs text-[#536455]">Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }} className={field}><option value="all">All statuses</option>{[...new Set(allBoxes.map(box => box.status))].sort().map(value => <option key={value}>{value}</option>)}</select></label>
      <span role="status" className="text-xs text-[#536455]">{number(points.features.length)} dots · {number(boxes.length - points.features.length)} GPS pending</span>
    </div>
    {picking && selected && <div role="status" className="flex items-center justify-between gap-3 bg-[#fff4db] px-5 py-3 text-xs text-[#76561a]">Click the exact box location, then review and save its GPS coordinates.<button type="button" onClick={() => setPicking(false)} className="font-bold underline">Cancel</button></div>}
    <div ref={mapRef} className="scroll-mt-6"><Canvas points={points} bounds={focus ?? bounds} fitKey={fitKey} selectedId={selected?.id || ''} label={label} onSelect={id => { const box = boxes.find(item => item.id === id); if (box) chooseBox(box); }} onPick={picking && selected && canEdit ? (latitude, longitude) => { setPicked({ latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) }); setPicking(false); requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); } : undefined}/></div>
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[#06241e] px-5 py-3 text-[11px] text-[#b0cebd]"><div className="flex flex-wrap gap-4">{[['#16a34a', 'Donation boxes']].map(([color, title]) => <span key={title}><i className="mr-2 inline-block size-3 rounded-full border-2 border-white" style={{ background: color, boxShadow: `0 0 8px ${color}` }}/>{title}</span>)}</div><span>Drag to explore · Zoom to inspect overlapping boxes · Select a dot for details</span></div>
    {allBoxes.length - locatedCount > 0 && <p className="border-b border-[#e8efe3] bg-[#fff9eb] px-5 py-4 text-xs leading-5 text-[#76561a]"><b>{number(allBoxes.length - locatedCount)} boxes need GPS coordinates.</b> Their addresses are listed below. {canEdit ? 'Select a box to save its location.' : 'Ask your City or Branch Admin to save their locations.'} Monthly box totals do not contain individual GPS locations.</p>}
    <div className="grid gap-5 p-5 lg:grid-cols-2"><div ref={listRef} className="scroll-mt-6">{gpsHelp && <p role="status" className="mb-3 rounded-xl bg-[#e7f7e8] p-3 text-xs font-semibold text-[#276431]">Select a box below to add its GPS location. You can enter coordinates, use your current GPS, or choose the location on the map.</p>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-[#203526]">Box locations ({number(list.length)})</h3><label><span className="sr-only">GPS status</span><select value={gps} onChange={event => { setGps(event.target.value); setPage(0); }} className={field}><option value="all">All box locations</option><option value="pending">GPS pending</option><option value="located">GPS located</option></select></label></div>
      <div className="max-h-80 overflow-y-auto rounded-xl border border-[#e3ebe0]">{list.slice(currentPage * 20, (currentPage + 1) * 20).map(box => <button type="button" key={box.id} aria-pressed={selectedId === box.id} onClick={() => chooseBox(box, true)} className={`flex w-full items-start justify-between gap-3 border-b border-[#e9efe7] p-3 text-left last:border-0 ${selectedId === box.id ? 'bg-[#edf6e9]' : 'hover:bg-[#f8fbf6]'}`}><span><b className="text-xs text-[#203526]">{box.id}</b><span className="mt-1 block text-[11px] text-[#718073]">{box.area} · {box.cityName}</span></span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${located(box) ? 'bg-[#e8f4e5] text-[#276431]' : 'bg-[#fff4db] text-[#91661c]'}`}>{located(box) ? 'Located' : canEdit ? 'Add GPS' : 'GPS pending'}</span></button>)}{!list.length && <p className="p-6 text-center text-xs text-[#718073]">{allBoxes.length ? 'No boxes match these filters.' : 'No registered boxes in this access scope.'}</p>}</div>
      {pages > 1 && <div className="mt-3 flex items-center justify-between text-xs text-[#536455]"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><span>Page {number(currentPage + 1)} of {number(pages)}</span><button disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div>}
    </div><div ref={detailsRef} aria-live="polite" aria-label="Selected box details" className="rounded-2xl border border-[#e3ebe0] bg-[#f8fbf6] p-4">
      {selected ? <><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-[#718073]">Donation box</p><h3 className="mt-1 text-lg font-bold text-[#203526]">{selected.id}</h3></div><button type="button" aria-label="Close box details" onClick={() => { setSelectedId(''); setPicking(false); setPicked(null); }} className="rounded-lg px-3 py-1 text-[#536455]">×</button></div><dl className="mt-4 grid grid-cols-2 gap-4 text-xs">{[['City', selected.cityName], ['Area', selected.area], ['Status', selected.status], ['Rider', selected.rider || 'Not assigned'], ['Address', selected.location || 'Not supplied'], ['QR code', selected.qr], ['Latitude', selected.latitude ?? 'Not saved'], ['Longitude', selected.longitude ?? 'Not saved']].map(([title, value]) => <div key={title}><dt className="text-[#718073]">{title}</dt><dd className="mt-1 break-words font-semibold text-[#344639]">{value}</dd></div>)}</dl>{located(selected) && <a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=18/${selected.latitude}/${selected.longitude}`} className="mt-4 inline-block text-xs font-bold text-[#276431]">Open location in OpenStreetMap ↗</a>}{canEdit && <><button type="button" onClick={() => { if (picking) setPicking(false); else addGps(); }} className="mt-4 block rounded-lg border border-[#dce8dc] bg-white px-3 py-2 text-xs font-bold text-[#276431]">{picking ? 'Cancel location picking' : 'Choose location on this map'}</button><BoxLocationControl key={`${selected.id}:${picked?.latitude ?? selected.latitude}:${picked?.longitude ?? selected.longitude}`} boxId={selected.id} latitude={picked?.latitude ?? selected.latitude} longitude={picked?.longitude ?? selected.longitude} onSaved={() => { setPicking(false); setPicked(null); }}/></>}</> : <div className="grid min-h-44 content-center gap-2 text-center"><p className="text-sm font-bold text-[#203526]">Explore your donation network</p><p className="mx-auto max-w-xs text-xs leading-5 text-[#718073]">Select a dot or box from the list to see its address, rider and location details.</p></div>}
      {inventoryLink && <Link href={inventoryLink} className="mt-5 inline-block rounded-lg bg-[#276431] px-4 py-2 text-xs font-bold text-white">Open {city?.name || 'accessible'} box inventory →</Link>}
    </div></div>
    <p className="border-t border-[#e8efe3] px-5 py-3 text-[11px] leading-5 text-[#718073]">Dots show current registered boxes. Year and channel filters apply to monthly reports below. Boxes at the same coordinates overlap; every record remains available in the list.</p>
  </section>;
}
