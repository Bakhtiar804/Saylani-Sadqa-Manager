import {
  boxInspectionLog,
  boxStatusHistory,
  cashHandoverDeposit,
  cities,
  collections,
  donationBoxes,
  fieldCollectionLog,
  operationalCosts,
  partners,
  riderTasks,
  riders,
  securityIncidents,
  users,
} from "@/data/index";

const cityById = new Map(cities.map((city) => [city.city_id, city.city_name]));
const boxById = new Map(donationBoxes.map((box) => [box.box_id, box]));
const maxCollectionDate = collections
  .map((record) => record.collection_date)
  .sort()
  .at(-1);
const minCollectionDate = collections
  .map((record) => record.collection_date)
  .sort()[0];

export function formatPKR(value) {
  return `Rs ${Math.round(value || 0).toLocaleString("en-PK")}`;
}

export function getCityName(cityId) {
  return cityById.get(cityId) || "Unassigned";
}

export function getRangeBounds(range = "30") {
  const selectedRange = ["7", "30", "90", "all"].includes(String(range))
    ? String(range)
    : "30";
  const end = new Date(`${maxCollectionDate}T00:00:00Z`);
  const days = selectedRange === "all" ? null : Number(selectedRange);
  const start = new Date(end);
  if (days) start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
  else start.setTime(new Date(`${minCollectionDate}T00:00:00Z`).getTime());
  const firstAvailable = new Date(`${minCollectionDate}T00:00:00Z`);
  if (start < firstAvailable) start.setTime(firstAvailable.getTime());
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: maxCollectionDate,
  };
}

export function getOverviewData({ range = "30", city = "all" } = {}) {
  range = ["7", "30", "90", "all"].includes(String(range))
    ? String(range)
    : "30";
  city = cities.some((item) => item.city_id === city) ? city : "all";
  const { startDate, endDate } = getRangeBounds(range);
  const periodCollections = collections.filter(
    (record) =>
      record.collection_date >= startDate &&
      record.collection_date <= endDate &&
      (city === "all" || record.city_id === city),
  );
  const cityBoxes = donationBoxes.filter(
    (box) => city === "all" || box.city_id === city,
  );
  const cityTasks = riderTasks.filter((task) => {
    if (city === "all") return true;
    return boxById.get(task.box_id)?.city_id === city;
  });
  const verifiedTotal = periodCollections
    .filter((record) => record.collection_status === "Verified")
    .reduce((total, record) => total + record.collection_amount_pkr, 0);
  const pendingTotal = periodCollections
    .filter((record) => record.collection_status === "Pending Verification")
    .reduce((total, record) => total + record.collection_amount_pkr, 0);

  const dailyTotals = new Map();
  periodCollections
    .filter((record) => record.collection_status === "Verified")
    .forEach((record) =>
      dailyTotals.set(
        record.collection_date,
        (dailyTotals.get(record.collection_date) || 0) +
          record.collection_amount_pkr,
      ),
    );
  const { startDate: periodStart } = getRangeBounds(range);
  const chartData = [];
  const cursor = new Date(`${periodStart}T00:00:00Z`);
  const last = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= last) {
    const day = cursor.toISOString().slice(0, 10);
    chartData.push({
      date: day,
      label: day.slice(5),
      collections: dailyTotals.get(day) || 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const cityTotals = new Map();
  periodCollections
    .filter((record) => record.collection_status === "Verified")
    .forEach((record) =>
      cityTotals.set(
        record.city_id,
        (cityTotals.get(record.city_id) || 0) + record.collection_amount_pkr,
      ),
    );

  const statusCounts = ["Verified", "Pending Verification", "Flagged"].map(
    (status) => ({
      name: status,
      value: periodCollections.filter(
        (record) => record.collection_status === status,
      ).length,
    }),
  );

  const activity = [
    ...periodCollections.map((record) => ({
      id: record.collection_id,
      city_id: record.city_id,
      date: record.collection_date,
      title: `${record.collection_status} collection recorded`,
      detail: `${record.collection_id} · ${getCityName(record.city_id)} · ${formatPKR(record.collection_amount_pkr)}`,
      icon: "wallet",
      tone:
        record.collection_status === "Verified"
          ? "green"
          : record.collection_status === "Flagged"
            ? "red"
            : "orange",
    })),
    ...securityIncidents.map((record) => ({
      id: record.incident_id,
      city_id: record.city_id,
      date: record.incident_date,
      title: `${record.severity} security incident ${record.incident_status.toLowerCase()}`,
      detail: `${record.incident_type} · ${getCityName(record.city_id)} · ${record.box_id}`,
      icon: "shield",
      tone: record.incident_status === "Resolved" ? "green" : "orange",
    })),
    ...boxInspectionLog
      .filter((record) => record.follow_up_required === "Yes")
      .map((record) => ({
        id: record.inspection_id,
        city_id: record.city_id,
        date: record.inspection_date,
        title: "Box inspection needs follow-up",
        detail: `${record.box_id} · ${record.box_condition} · ${getCityName(record.city_id)}`,
        icon: "box",
        tone: "blue",
      })),
  ]
    .filter(
      (item) =>
        item.date <= endDate && (city === "all" || item.city_id === city),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return {
    range,
    city,
    startDate,
    endDate,
    cities,
    totals: {
      verifiedPKR: verifiedTotal,
      pendingPKR: pendingTotal,
      records: periodCollections.length,
      pendingCount: periodCollections.filter(
        (record) => record.collection_status === "Pending Verification",
      ).length,
      flaggedCount: periodCollections.filter(
        (record) => record.collection_status === "Flagged",
      ).length,
      boxes: cityBoxes.length,
      activeBoxes: cityBoxes.filter((box) => box.box_status === "Active")
        .length,
      needsAttentionBoxes: cityBoxes.filter(
        (box) =>
          box.box_status === "Damaged" || box.box_status === "Under Review",
      ).length,
      tasks: cityTasks.length,
      completedTasks: cityTasks.filter(
        (task) => task.task_status === "Completed",
      ).length,
    },
    chartData,
    cityData: cities
      .filter((item) => city === "all" || item.city_id === city)
      .map((item) => ({
        name: item.city_name,
        collection: cityTotals.get(item.city_id) || 0,
      }))
      .sort((a, b) => b.collection - a.collection),
    statusCounts,
    activity,
    recentCollections: periodCollections
      .slice()
      .sort((a, b) => b.collection_date.localeCompare(a.collection_date))
      .slice(0, 8),
  };
}

export function getCityOptions() {
  return cities;
}

export function getAllRecords() {
  return {
    collections,
    donationBoxes,
    users,
    riders,
    riderTasks,
    cities,
    partners,
    fieldCollectionLog,
    boxInspectionLog,
    cashHandoverDeposit,
    boxStatusHistory,
    securityIncidents,
    operationalCosts,
  };
}

export function getCollectionByCity() {
  const totals = new Map(cities.map((city) => [city.city_id, 0]));
  collections
    .filter((record) => record.collection_status === "Verified")
    .forEach((record) =>
      totals.set(
        record.city_id,
        (totals.get(record.city_id) || 0) + record.collection_amount_pkr,
      ),
    );
  return cities.map((city) => ({
    name: city.city_name,
    value: totals.get(city.city_id) || 0,
  }));
}

export function sanitizeUsers() {
  return users.map((user) =>
    Object.fromEntries(
      Object.entries(user).filter(([key]) => key !== "demo_password"),
    ),
  );
}

export function getOperationalSummary() {
  return {
    boxes: donationBoxes,
    boxStatusHistory,
    collections,
    fieldCollectionLog,
    users: sanitizeUsers(),
    riders,
    riderTasks,
    cities,
    partners,
    inspections: boxInspectionLog,
    handovers: cashHandoverDeposit,
    incidents: securityIncidents,
    costs: operationalCosts,
  };
}
