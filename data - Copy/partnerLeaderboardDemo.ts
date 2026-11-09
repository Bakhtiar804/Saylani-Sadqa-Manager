import { cities } from "./cities";
import { collections } from "./collections";
import { donationBoxes } from "./donationBoxes";
import { riders } from "./riders";

const cityAreas: Record<string, string[]> = {
  C001: ["Saddar", "Gulshan", "Korangi", "North Nazimabad"],
  C002: ["Madina Town", "D Ground", "People's Colony"],
  C003: ["Gulberg", "Model Town", "Johar Town"],
  C004: ["Qasimabad", "Hirabad", "Latifabad"],
  C005: ["Gulgasht", "Cantt", "Shah Rukn-e-Alam"],
};
const locationTypes = ["Shop", "Mosque", "Public Place"];
const months = Array.from({ length: 11 }, (_, index) => index + 1);
const riderById = new Map(riders.map((rider) => [rider.rider_id, rider]));

export const partnerLeaderboardBoxes = Array.from({ length: 72 }, (_, index) => {
  const boxNumber = 501 + index;
  const city = cities[index % cities.length];
  const area = cityAreas[city.city_id][index % cityAreas[city.city_id].length];
  const template = donationBoxes[index % donationBoxes.length];

  return {
    ...template,
    box_id: `BOX${String(boxNumber).padStart(5, "0")}`,
    qr_code: `SBX-DEMO-${String(boxNumber).padStart(5, "0")}`,
    city_id: city.city_id,
    city_name: city.city_name,
    area,
    location_type: locationTypes[index % locationTypes.length],
    location_description: `${area} demo partner location ${index + 1}`,
    partner_id: "PAR009",
    installation_date: `2026-${String(months[index % months.length]).padStart(2, "0")}-${String((index % 26) + 1).padStart(2, "0")}`,
    box_status: "Active",
    last_verified_date: "2026-11-07",
    is_demo_record: true,
  };
});

export const partnerLeaderboardCollections = Array.from({ length: 100 }, (_, index) => {
  const collectionNumber = 1501 + index;
  const box = partnerLeaderboardBoxes[index % partnerLeaderboardBoxes.length];
  const template = collections[index % collections.length];
  const rider = riderById.get(box.assigned_rider_id);
  const month = months[index % months.length];
  const day = (index % 26) + 1;
  const date = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return {
    ...template,
    collection_id: `COL${String(collectionNumber).padStart(6, "0")}`,
    box_id: box.box_id,
    rider_id: box.assigned_rider_id,
    city_id: box.city_id,
    partner_id: "PAR009",
    collection_date: date,
    collection_amount_pkr: 6500,
    collection_status: "Verified",
    verification_reference: `VER-DEMO-${String(collectionNumber).padStart(6, "0")}`,
    notes: "Synthetic leaderboard demo record; not an actual donation.",
    is_demo_record: true,
    box_qr_code: box.qr_code,
    location_type: box.location_type,
    location_description: box.location_description,
    custodian_user_id: box.custodian_user_id,
    custodian_name: box.custodian_name,
    assigned_rider_name: rider?.rider_name || template.assigned_rider_name,
    cash_total_counted_pkr: 6500,
    cash_notes_pkr: 5200,
    cash_coins_pkr: 1000,
    other_cash_pkr: 300,
    cash_handover_status: "Handed Over",
    handover_reference: `HND-DEMO-${String(collectionNumber).padStart(6, "0")}`,
    deposit_status: "Deposited",
    deposit_date: date,
    deposit_reference: `DEP-DEMO-${String(collectionNumber).padStart(6, "0")}`,
    deposit_amount_pkr: 6500,
    discrepancy_amount_pkr: 0,
    verification_method: "Supervisor Review",
    verified_by_user_id: "USR0001",
    verified_at: `${date} 19:00:00`,
    supporting_document_reference: `DOC-DEMO-${String(collectionNumber).padStart(6, "0")}`,
  };
});
