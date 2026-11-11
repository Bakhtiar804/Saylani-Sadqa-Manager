import type { getAllRecords } from "@/lib/dashboard-data";
import type { DataRecord } from "./dashboard-types";

type DashboardData = Awaited<ReturnType<typeof getAllRecords>>;
type LeaderboardData = Pick<DashboardData, "cities" | "partners" | "collections" | "donationBoxes">;

const collectionStatuses = ["Verified", "Pending Verification", "Flagged"] as const;
const boxStatuses = ["Active", "Inactive", "Damaged", "Under Review"] as const;
type CollectionStatus = (typeof collectionStatuses)[number];
type BoxStatus = (typeof boxStatuses)[number];

function total(records: DataRecord[], predicate: (record: DataRecord) => boolean = () => true): number {
  return records.filter(predicate).reduce((amount, record) => amount + Number(record.collection_amount_pkr || 0), 0);
}

function count(records: DataRecord[], predicate: (record: DataRecord) => boolean = () => true): number {
  return records.filter(predicate).length;
}

export function getPartnerLeaderboardData(data: LeaderboardData) {
  const cityNameById = new Map(data.cities.map((city) => [String(city.city_id), String(city.city_name)]));
  const rankedPartners = data.partners.map((partner) => {
    const partnerId = String(partner.partner_id);
    const partnerCollections = data.collections.filter((record) => record.partner_id === partnerId);
    const partnerBoxes = data.donationBoxes.filter((box) => box.partner_id === partnerId);
    const statusAmounts = Object.fromEntries(collectionStatuses.map((status) => [
      status, total(partnerCollections, (record) => record.collection_status === status),
    ])) as Record<CollectionStatus, number>;
    const statusCounts = Object.fromEntries(collectionStatuses.map((status) => [
      status, count(partnerCollections, (record) => record.collection_status === status),
    ])) as Record<CollectionStatus, number>;
    const boxCounts = Object.fromEntries(boxStatuses.map((status) => [
      status, count(partnerBoxes, (box) => box.box_status === status),
    ])) as Record<BoxStatus, number>;

    return {
      partner_id: partnerId,
      partner_name: String(partner.partner_name ?? ""),
      partner_type: String(partner.partner_type ?? ""),
      partnership_status: String(partner.partnership_status ?? ""),
      city_id: String(partner.city_id ?? ""),
      city_name: cityNameById.get(String(partner.city_id)) || "Unassigned",
      installed_boxes: partnerBoxes.length,
      active_boxes: boxCounts.Active,
      inactive_boxes: boxCounts.Inactive,
      damaged_boxes: boxCounts.Damaged,
      under_review_boxes: boxCounts["Under Review"],
      verified_count: statusCounts.Verified,
      pending_count: statusCounts["Pending Verification"],
      flagged_count: statusCounts.Flagged,
      verified_amount_pkr: statusAmounts.Verified,
      pending_amount_pkr: statusAmounts["Pending Verification"],
      flagged_amount_pkr: statusAmounts.Flagged,
      collection_count: partnerCollections.length,
    };
  }).sort((a, b) => b.verified_amount_pkr - a.verified_amount_pkr || b.installed_boxes - a.installed_boxes || a.partner_name.localeCompare(b.partner_name))
    .map((partner, index) => ({ ...partner, rank: index + 1 }));

  const partnerIds = new Set(data.partners.map((partner) => String(partner.partner_id)));
  const partnerCollections = data.collections.filter((record) => partnerIds.has(String(record.partner_id)));
  const partnerBoxes = data.donationBoxes.filter((box) => partnerIds.has(String(box.partner_id)));
  const totals = Object.fromEntries(collectionStatuses.map((status) => [
    status,
    {
      count: count(partnerCollections, (record) => record.collection_status === status),
      amount: total(partnerCollections, (record) => record.collection_status === status),
    },
  ])) as Record<CollectionStatus, { count: number; amount: number }>;
  const verifiedByCity = data.cities.map((city) => ({
    name: String(city.city_name),
    value: total(partnerCollections, (record) => record.city_id === city.city_id && record.collection_status === "Verified"),
  })).sort((a, b) => b.value - a.value);
  const boxStatusData = boxStatuses.map((status) => ({ name: status, value: count(partnerBoxes, (box) => box.box_status === status) }));
  const collectionStatusData = collectionStatuses.map((status) => ({ name: status, value: count(partnerCollections, (record) => record.collection_status === status) }));

  return {
    partners: rankedPartners,
    totals,
    totalPartners: data.partners.length,
    totalPartnerBoxes: partnerBoxes.length,
    verifiedByPartner: rankedPartners.map((partner) => ({ name: partner.partner_name, value: partner.verified_amount_pkr })),
    verifiedByCity,
    boxStatusData,
    collectionStatusData,
  };
}

export function getPublicPartnerLeaderboard(data: LeaderboardData) {
  const boxesById = new Map(data.donationBoxes.map(box => [String(box.box_id), box]));
  // Preserve the partner recorded at collection time. Legacy entries without a
  // partner can still be attributed through their registered box.
  const published = data.collections.filter(row => row.collection_status === 'Verified');
  return data.partners.map(partner => {
    const partnerId = String(partner.partner_id);
    const installedBoxes = data.donationBoxes.filter(box => String(box.partner_id ?? '') === partnerId).length;
    const verifiedFunds = published.reduce((sum, row) => {
      const recordedPartner = row.partner_id || boxesById.get(String(row.box_id))?.partner_id;
      return String(recordedPartner ?? '') === partnerId ? sum + Number(row.collection_amount_pkr || 0) : sum;
    }, 0);
    return { partnerId, partnerName: String(partner.partner_name), installedBoxes, verifiedFunds };
  }).sort((a,b) => b.verifiedFunds-a.verifiedFunds || b.installedBoxes-a.installedBoxes || a.partnerName.localeCompare(b.partnerName))
    .map((partner,index) => ({...partner,rank:index+1}));
}
