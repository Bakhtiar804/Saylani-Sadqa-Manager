const colors = [
  "#276431",
  "#61bb46",
  "#1d65d5",
  "#d98a32",
  "#9675c7",
  "#b94b42",
  "#86a889",
];

export const sum = (records, key, predicate = () => true) =>
  records
    .filter(predicate)
    .reduce((total, item) => total + (Number(item[key]) || 0), 0);

export function countBy(records, key, order) {
  const counts = new Map();
  records.forEach((record) => {
    const label = record[key] || "Unspecified";
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  const entries = [...counts.entries()].map(([name, value]) => ({
    name,
    value,
  }));
  if (order)
    entries.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  else
    entries.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  return entries.map((entry, index) => ({
    ...entry,
    color: colors[index % colors.length],
  }));
}

export function sumBy(records, groupKey, valueKey, labelMap = {}) {
  const totals = new Map();
  records.forEach((record) => {
    const id = record[groupKey] || "unassigned";
    const name =
      labelMap[id] || record[`${groupKey.replace(/_id$/, "")}_name`] || id;
    totals.set(name, (totals.get(name) || 0) + (Number(record[valueKey]) || 0));
  });
  return [...totals.entries()]
    .map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value);
}

export function monthlySum(
  records,
  dateKey,
  amountKey,
  predicate = () => true,
) {
  const months = new Map();
  records.filter(predicate).forEach((record) => {
    const date = String(record[dateKey] || "");
    const month = date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    months.set(
      month,
      (months.get(month) || 0) + (Number(record[amountKey]) || 0),
    );
  });
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({
      month,
      label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-PK", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      collections: value,
    }));
}

export function percent(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}
