import { cities, collections, donationBoxes, partners } from "@/data/index";
import type { DataRecord } from "./dashboard-types";

const collectionStatuses = ["Verified", "Pending Verification", "Flagged"] as const;
const boxStatuses = ["Active", "Inactive", "Damaged", "Under Review"] as const;
type CollectionStatus = (typeof collectionStatuses)[number];
type BoxStatus = (typeof boxStatuses)[number];

function total<T extends DataRecord>(
  records: readonly T[],
  predicate: (record: T) => boolean = () => true,
): number {
  return records
    .filter(predicate)
    .reduce((amount, record) => amount + Number(record.collection_amount_pkr || 0), 0);
}

function count<T>(
  records: readonly T[],
  predicate: (record: T) => boolean = () => true,
): number {
  return records.filter(predicate).length;
}

export function getPartnerLeaderboardData() {
  const cityNameById = new Map(cities.map((city) => [city.city_id, city.city_name]));
  const rankedPartners = partners
    .map((partner) => {
      const partnerCollections = collections.filter(
        (record) => record.partner_id === partner.partner_id,
      );
      const partnerBoxes = donationBoxes.filter(
        (box) => box.partner_id === partner.partner_id,
      );
      const statusAmounts = Object.fromEntries(
        collectionStatuses.map((status) => [
          status,
          total(partnerCollections, (record) => record.collection_status === status),
        ]),
      ) as Record<CollectionStatus, number>;
      const statusCounts = Object.fromEntries(
        collectionStatuses.map((status) => [
          status,
          count(partnerCollections, (record) => record.collection_status === status),
        ]),
      ) as Record<CollectionStatus, number>;
      const boxCounts = Object.fromEntries(
        boxStatuses.map((status) => [
          status,
          count(partnerBoxes, (box) => box.box_status === status),
        ]),
      ) as Record<BoxStatus, number>;

      return {
        partner_id: partner.partner_id,
        partner_name: partner.partner_name,
        partner_type: partner.partner_type,
        partnership_status: partner.partnership_status,
        city_id: partner.city_id,
        city_name: cityNameById.get(partner.city_id) || "Unassigned",
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
    })
    .sort(
      (a, b) =>
        b.verified_amount_pkr - a.verified_amount_pkr ||
        b.installed_boxes - a.installed_boxes ||
        a.partner_name.localeCompare(b.partner_name),
    )
    .map((partner, index) => ({ ...partner, rank: index + 1 }));

  const partnerCollections = collections.filter((record) =>
    partners.some((partner) => partner.partner_id === record.partner_id),
  );
  const partnerBoxes = donationBoxes.filter((box) =>
    partners.some((partner) => partner.partner_id === box.partner_id),
  );
  const totals = Object.fromEntries(
    collectionStatuses.map((status) => [
      status,
      {
        count: count(partnerCollections, (record) => record.collection_status === status),
        amount: total(partnerCollections, (record) => record.collection_status === status),
      },
    ]),
  ) as Record<CollectionStatus, { count: number; amount: number }>;

  const verifiedByCity = cities
    .map((city) => ({
      name: city.city_name,
      value: total(
        partnerCollections,
        (record) =>
          record.city_id === city.city_id && record.collection_status === "Verified",
      ),
    }))
    .sort((a, b) => b.value - a.value);

  const boxStatusData = boxStatuses.map((status) => ({
    name: status,
    value: count(partnerBoxes, (box) => box.box_status === status),
  }));
  const collectionStatusData = collectionStatuses.map((status) => ({
    name: status,
    value: count(partnerCollections, (record) => record.collection_status === status),
  }));

  return {
    partners: rankedPartners,
    totals,
    totalPartners: partners.length,
    totalPartnerBoxes: partnerBoxes.length,
    verifiedByPartner: rankedPartners.map((partner) => ({
      name: partner.partner_name,
      value: partner.verified_amount_pkr,
    })),
    verifiedByCity,
    boxStatusData,
    collectionStatusData,
  };
}

export function getPublicPartnerLeaderboard() {
  return getPartnerLeaderboardData().partners.map((partner: {
    rank: number;
    partner_name: string;
    installed_boxes: number;
    verified_amount_pkr: number;
  }) => ({
    rank: partner.rank,
    partnerName: partner.partner_name,
    installedBoxes: partner.installed_boxes,
    verifiedFunds: partner.verified_amount_pkr,
  }));
}
