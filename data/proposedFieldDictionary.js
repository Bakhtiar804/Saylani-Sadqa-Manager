export const proposedFieldDictionary = [
  {
    field_name: "Field Collection ID",
    meaning: "Unique ID for each field collection visit/transaction",
    source_or_owner: "System-generated",
    basis: "Proposed"
  },
  {
    field_name: "Collection Date",
    meaning: "Date the box was collected/opened",
    source_or_owner: "Field staff/rider",
    basis: "PRD-aligned"
  },
  {
    field_name: "Collection Time",
    meaning: "Time of collection visit",
    source_or_owner: "Field staff/rider",
    basis: "Proposed"
  },
  {
    field_name: "Box ID",
    meaning: "Unique registered box identifier",
    source_or_owner: "System",
    basis: "PRD-required"
  },
  {
    field_name: "QR / Box Code",
    meaning: "Scannable or printed box identifier",
    source_or_owner: "System / field scan",
    basis: "PRD future option"
  },
  {
    field_name: "City / Area / Full Location",
    meaning: "Geographic location of the box",
    source_or_owner: "Box master record",
    basis: "PRD-required"
  },
  {
    field_name: "Location Type",
    meaning: "Mosque, shop, house, public place, etc.",
    source_or_owner: "Box master record",
    basis: "PRD-aligned"
  },
  {
    field_name: "Custodian / Ameen",
    meaning: "Responsible person for the box",
    source_or_owner: "Box master record",
    basis: "PRD-aligned"
  },
  {
    field_name: "Rider / Collector ID",
    meaning: "Person responsible for collection",
    source_or_owner: "Assignment record",
    basis: "PRD-required"
  },
  {
    field_name: "Team ID",
    meaning: "Operational team reference",
    source_or_owner: "Admin setup",
    basis: "Proposed"
  },
  {
    field_name: "Seal Number Before / After",
    meaning: "Seal references before and after visit",
    source_or_owner: "Field staff",
    basis: "Proposed; approve security SOP"
  },
  {
    field_name: "Seal / Box Condition",
    meaning: "Condition observed during visit",
    source_or_owner: "Field staff",
    basis: "Proposed"
  },
  {
    field_name: "Cash Notes / Coins / Other",
    meaning: "Breakdown of counted cash",
    source_or_owner: "Authorized counters",
    basis: "Proposed"
  },
  {
    field_name: "Total Cash Counted",
    meaning: "Total amount counted in PKR",
    source_or_owner: "Authorized counters",
    basis: "PRD-required"
  },
  {
    field_name: "Counted By / Witness",
    meaning: "People participating in count",
    source_or_owner: "Authorized staff",
    basis: "Proposed"
  },
  {
    field_name: "Collection Status",
    meaning: "Verified, pending verification, flagged",
    source_or_owner: "Supervisor workflow",
    basis: "PRD-aligned"
  },
  {
    field_name: "Cash Handover Status / Reference",
    meaning: "Custody transfer tracking",
    source_or_owner: "Receiving staff",
    basis: "Proposed"
  },
  {
    field_name: "Deposit Status / Date / Reference",
    meaning: "Deposit and reconciliation tracking",
    source_or_owner: "Finance staff",
    basis: "Proposed"
  },
  {
    field_name: "Discrepancy Amount / Reason",
    meaning: "Difference requiring investigation",
    source_or_owner: "Supervisor/Finance",
    basis: "Proposed"
  },
  {
    field_name: "Verification Method / Verifier",
    meaning: "How and by whom record was verified",
    source_or_owner: "Supervisor",
    basis: "PRD-aligned"
  },
  {
    field_name: "Donation Purpose Designation",
    meaning: "Only record a purpose if the box is formally designated",
    source_or_owner: "Approved box setup",
    basis: "Needs management confirmation"
  },
  {
    field_name: "Supporting Document Reference",
    meaning: "Reference to approved supporting evidence",
    source_or_owner: "Authorized staff",
    basis: "Proposed"
  },
  {
    field_name: "Remarks / Created At",
    meaning: "Operational notes and audit timestamp",
    source_or_owner: "System/user",
    basis: "PRD-aligned"
  },
  {
    field_name: "Donor Name / CNIC / Personal Contact",
    meaning: "Not included for anonymous box collections by default",
    source_or_owner: "N/A",
    basis: "Privacy-by-design; add only if a lawful, approved need exists"
  }
];
