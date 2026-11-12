export type BoxCoordinates = { latitude: number | null; longitude: number | null };

// Text addresses and city centres are never substituted for a box's GPS position.
export function parseBoxCoordinates(input: Record<string, unknown>): BoxCoordinates {
  const empty = (value: unknown) => value === undefined || value === null || value === '';
  if (empty(input.latitude) && empty(input.longitude)) return { latitude: null, longitude: null };
  if (empty(input.latitude) || empty(input.longitude)) throw new Error('Enter both latitude and longitude.');
  const number = (value: unknown) => {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim() || !/^-?\d+(?:\.\d+)?$/.test(value.trim()))) return NaN;
    return Number(value);
  };
  const latitude = number(input.latitude), longitude = number(input.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Use valid GPS coordinates: latitude −90 to 90, longitude −180 to 180.');
  }
  return { latitude: Math.round(latitude * 1e6) / 1e6, longitude: Math.round(longitude * 1e6) / 1e6 };
}

export function hasBoxCoordinates(box: BoxCoordinates): box is { latitude: number; longitude: number } {
  return typeof box.latitude === 'number' && Number.isFinite(box.latitude) && Math.abs(box.latitude) <= 90 &&
    typeof box.longitude === 'number' && Number.isFinite(box.longitude) && Math.abs(box.longitude) <= 180;
}
