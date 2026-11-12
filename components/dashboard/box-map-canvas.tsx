'use client';
import { useEffect, useRef, useState } from 'react';
import type { Map as LibreMap, GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Point } from 'geojson';
import type { BoxPointProperties } from '@/lib/box-map';

type Props = {
  points: FeatureCollection<Point, BoxPointProperties>;
  bounds: [[number, number], [number, number]];
  selectedId: string;
  onSelect: (id: string) => void;
  onPick?: (latitude: number, longitude: number) => void;
  fitKey: number;
  label: string;
};
export default function BoxMapCanvas({ points, bounds, selectedId, onSelect, onPick, fitKey, label }: Props) {
  const container = useRef<HTMLDivElement>(null), instance = useRef<LibreMap | null>(null);
  const latest = useRef({ points, bounds, onSelect, onPick });
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { latest.current = { points, bounds, onSelect, onPick }; });
  useEffect(() => {
    let cancelled = false, map: LibreMap | undefined, observer: ResizeObserver | undefined;
    void import('maplibre-gl').then(lib => {
      if (cancelled || !container.current) return;
      lib.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
      map = new lib.Map({ container: container.current, style: 'https://tiles.openfreemap.org/styles/dark',
        bounds: latest.current.bounds, fitBoundsOptions: { padding: 45, maxZoom: 13 },
        minZoom: 3, maxZoom: 19, renderWorldCopies: false, attributionControl: { compact: true } });
      instance.current = map;
      map.addControl(new lib.NavigationControl({ showCompass: true }), 'top-right');
      map.addControl(new lib.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');
      map.addControl(new lib.FullscreenControl(), 'top-right');
      map.on('load', () => {
        if (!map || cancelled) return;
        // Keep geographic detail subtle inside Pakistan; the outside mask clips it away.
        for (const layer of map.getStyle().layers) {
          const name = `${layer.id} ${'source-layer' in layer ? layer['source-layer'] : ''}`;
          if (layer.type === 'background') {
            map.setPaintProperty(layer.id, 'background-color', '#051c18');
          } else if (layer.type === 'line' && /boundary|waterway|transportation|road/i.test(name) && !/casing|outline|tunnel/i.test(layer.id)) {
            map.setLayoutProperty(layer.id, 'visibility', 'visible');
            map.setPaintProperty(layer.id, 'line-color', /waterway/i.test(name) ? '#85b9aa' : '#b0bdb5');
            map.setPaintProperty(layer.id, 'line-opacity', /boundary/i.test(name) ? .45 : .28);
            map.setPaintProperty(layer.id, 'line-width', ['interpolate', ['linear'], ['zoom'], 4, .5, 10, .9, 16, 1.6]);
          } else if (layer.type === 'fill' && /water|park|wood|forest/i.test(name)) {
            map.setLayoutProperty(layer.id, 'visibility', 'visible');
            map.setPaintProperty(layer.id, 'fill-color', /water/i.test(name) ? '#cde7df' : '#dfece1');
            map.setPaintProperty(layer.id, 'fill-opacity', /water/i.test(name) ? .35 : .12);
          } else if (layer.type === 'symbol' && layer.layout?.['text-field'] && /place|city|town|state|country|transportation_name|road_name/i.test(name)) {
            map.setPaintProperty(layer.id, 'text-color', '#475569');
            map.setPaintProperty(layer.id, 'text-halo-color', '#ffffff');
          } else {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          }
        }
        const detailLayer = map.getStyle().layers.find(layer => layer.type !== 'background')?.id;
        map.addSource('pakistan-boundary', { type: 'geojson', data: '/maps/pakistan-boundary.geojson', attribution: 'Made with Natural Earth' });
        map.addLayer({ id: 'pakistan-fill', type: 'fill', source: 'pakistan-boundary', paint: { 'fill-color': '#ffffff', 'fill-opacity': 1 } }, detailLayer);
        // A world polygon with Pakistan cut out hides neighbouring geography and labels.
        map.addSource('pakistan-outside-mask', { type: 'geojson', data: '/maps/pakistan-outside-mask.geojson' });
        map.addLayer({ id: 'pakistan-outside-mask', type: 'fill', source: 'pakistan-outside-mask', paint: { 'fill-color': '#051c18', 'fill-opacity': 1 } });
        map.addLayer({ id: 'pakistan-glow', type: 'line', source: 'pakistan-boundary', paint: { 'line-color': '#d8e5dd', 'line-width': 6, 'line-opacity': .2, 'line-blur': 4 } });
        map.addLayer({ id: 'pakistan-outline', type: 'line', source: 'pakistan-boundary', paint: { 'line-color': '#becdc2', 'line-width': 1.5, 'line-opacity': 1 } });
        map.addSource('boxes', { type: 'geojson', data: latest.current.points, cluster: false, maxzoom: 18 });
        const color = '#16a34a';
        map.addLayer({ id: 'box-glow', type: 'circle', source: 'boxes', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 7, 14, 12], 'circle-color': '#15803d', 'circle-opacity': .18, 'circle-blur': .55 } });
        map.addLayer({ id: 'box-dots', type: 'circle', source: 'boxes', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 10, 5.5, 17, 8], 'circle-color': color, 'circle-opacity': 1, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#064e3b' } });
        map.addLayer({ id: 'selected-box', type: 'circle', source: 'boxes', filter: ['==', ['get', 'boxId'], ''], paint: { 'circle-radius': 11, 'circle-color': '#ffffff', 'circle-opacity': .15, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
        setReady(true);
      });
      map.on('click', event => {
        if (!map) return;
        if (latest.current.onPick) { latest.current.onPick(event.lngLat.lat, event.lngLat.lng); return; }
        if (!map.getLayer('box-dots')) return;
        const hits = map.queryRenderedFeatures([[event.point.x - 7, event.point.y - 7], [event.point.x + 7, event.point.y + 7]], { layers: ['box-dots'] });
        if (hits[0]?.properties?.boxId) latest.current.onSelect(String(hits[0].properties.boxId));
      });
      map.on('mousemove', event => {
        if (!map) return;
        map.getCanvas().style.cursor = latest.current.onPick ? 'crosshair' : map.getLayer('box-dots') && map.queryRenderedFeatures(event.point, { layers: ['box-dots'] }).length ? 'pointer' : '';
      });
      map.on('error', () => { if (!cancelled) setError('Map tiles could not be loaded. Check your connection or use the box list below.'); });
      map.on('idle', () => { if (!cancelled && map?.isStyleLoaded()) setError(''); });
      observer = new ResizeObserver(() => map?.resize()); observer.observe(container.current);
    }).catch(() => { if (!cancelled) setError('The map could not start. Enable WebGL or use the box list below.'); });
    return () => { cancelled = true; observer?.disconnect(); map?.remove(); instance.current = null; };
  }, [attempt]);
  useEffect(() => {
    if (!ready) return;
    (instance.current?.getSource('boxes') as GeoJSONSource | undefined)?.setData(points);
  }, [points, ready]);
  useEffect(() => {
    if (!ready) return;
    instance.current?.fitBounds(bounds, { padding: 45, maxZoom: 14, duration: 650 });
  }, [bounds, fitKey, ready]);
  useEffect(() => {
    if (ready) instance.current?.setFilter('selected-box', ['==', ['get', 'boxId'], selectedId]);
  }, [selectedId, ready]);
  return <div className="relative h-[440px] bg-[#051c18] sm:h-[560px] lg:h-[640px]">
    <div ref={container} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} role="region" aria-label={`${label} donation box map. Use arrow keys to pan, plus and minus to zoom.`} className="absolute inset-0"/>
    {!ready && !error && <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-[#a1c6b6]">Loading map…</div>}
    {error && <div role="alert" className="absolute bottom-10 left-4 right-4 rounded-xl border border-amber-400/30 bg-[#09241e]/95 p-4 text-xs text-amber-100">{error}<button type="button" onClick={() => { setReady(false); setError(''); setAttempt(value => value + 1); }} className="ml-3 font-bold underline">Retry map</button></div>}
    <div className="pointer-events-none absolute bottom-12 right-4 rounded-xl border border-[#4f9b78]/35 bg-[#06241e]/95 px-4 py-3 text-right text-white"><span className="text-[10px] uppercase tracking-[.15em] text-[#b0cebd]">Located donation boxes</span><p className="text-3xl font-black tracking-tight text-[#66ff87]">{points.features.length.toLocaleString('en-PK')}</p><p className="text-[11px] text-[#b0cebd]">{label}</p></div>
  </div>;
}
