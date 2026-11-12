import type { FeatureCollection, Point } from 'geojson';
import type { NetworkBox, NetworkCity } from './network-tree';
import { hasBoxCoordinates } from './box-coordinates';

export const PAKISTAN_BOUNDS: [[number, number], [number, number]] = [[60.5, 23.4], [77.9, 37.4]];
export type MapBox = NetworkBox & { cityId: string; cityName: string; area: string };
export type BoxPointProperties = { boxId: string; status: string };

export function getMapBoxes(cities: NetworkCity[], cityId = 'all', search = '', status = 'all'): MapBox[] {
  const needle = search.trim().toLowerCase();
  return cities.filter(city => cityId === 'all' || city.id === cityId).flatMap(city => city.areas.flatMap(area => area.boxes
    .filter(box => (status === 'all' || box.status === status) && (!needle || [city.name, area.name, box.id, box.qr, box.location, box.rider ?? ''].some(value => value.toLowerCase().includes(needle))))
    .map(box => ({ ...box, cityId: city.id, cityName: city.name, area: area.name }))));
}

export function buildBoxPoints(boxes: MapBox[]): FeatureCollection<Point, BoxPointProperties> {
  return { type: 'FeatureCollection', features: boxes.flatMap(box => hasBoxCoordinates({ latitude: box.latitude ?? null, longitude: box.longitude ?? null })
    ? [{ type: 'Feature' as const, id: box.id, geometry: { type: 'Point' as const, coordinates: [box.longitude!, box.latitude!] }, properties: { boxId: box.id, status: box.status } }] : []) };
}

// City centres control the viewport only. They never generate donation-box dots.
const cityCentres: Record<string, [number, number]> = {
  karachi: [67.01, 24.86], lahore: [74.34, 31.55], islamabad: [73.05, 33.69], rawalpindi: [73.05, 33.60],
  faisalabad: [73.08, 31.42], multan: [71.52, 30.20], peshawar: [71.58, 34.02], quetta: [66.99, 30.18],
  hyderabad: [68.37, 25.40], sukkur: [68.86, 27.71], gilgit: [74.31, 35.92], skardu: [75.63, 35.30],
};
export function cityMapBounds(city: NetworkCity | undefined, boxes: MapBox[]): [[number, number], [number, number]] {
  if (!city) return PAKISTAN_BOUNDS;
  const points = buildBoxPoints(boxes).features;
  if (points.length) {
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (const point of points) {
      const [lng, lat] = point.geometry.coordinates;
      west = Math.min(west, lng); east = Math.max(east, lng); south = Math.min(south, lat); north = Math.max(north, lat);
    }
    const padLng = Math.max((east - west) * .15, .025), padLat = Math.max((north - south) * .15, .025);
    return [[west - padLng, south - padLat], [east + padLng, north + padLat]];
  }
  const centre = city.latitude != null && city.longitude != null && hasBoxCoordinates({ latitude: city.latitude, longitude: city.longitude })
    ? [city.longitude, city.latitude] : cityCentres[city.name.trim().toLowerCase()];
  return centre ? [[centre[0] - .35, centre[1] - .22], [centre[0] + .35, centre[1] + .22]] : PAKISTAN_BOUNDS;
}
