import type { ChartDatum } from './dashboard-types';

// Keep every rupee when reducing a long city legend to the largest contributors.
export function contributionShares(cities: ChartDatum[], limit = 5): ChartDatum[] {
  const ranked = cities.filter(city => Number(city.value) > 0).sort((a,b) => Number(b.value)-Number(a.value));
  const others = ranked.slice(limit).reduce((sum,city) => sum+Number(city.value),0);
  return [...ranked.slice(0,limit), ...(others > 0 ? [{name:'Other cities',value:others}] : [])];
}
