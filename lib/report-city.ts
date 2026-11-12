const aliases: Record<string,string> = {
  'sukkur city':'sukkur','umerkot city':'umerkot','tando alahyar':'tando allahyar',
  'nawab shah':'nawabshah (shaheed benazirabad)',
};
export function canonicalCity(value:string) {
  const key=value.trim().toLowerCase().replace(/\s+/g,' ');
  return aliases[key] || key;
}
