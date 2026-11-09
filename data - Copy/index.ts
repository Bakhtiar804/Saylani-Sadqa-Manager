import { collections as sourceCollections } from "./collections";
import { donationBoxes as sourceDonationBoxes } from "./donationBoxes";
import {
  partnerLeaderboardBoxes,
  partnerLeaderboardCollections,
} from "./partnerLeaderboardDemo";

export { readme } from "./README";
export { cities } from "./cities";
export { users } from "./users";
export { partners } from "./partners";
export { riders } from "./riders";
export const donationBoxes = [...sourceDonationBoxes, ...partnerLeaderboardBoxes];
export const collections = [...sourceCollections, ...partnerLeaderboardCollections];
export { riderTasks } from "./riderTasks";
export { securityIncidents } from "./securityIncidents";
export { boxStatusHistory } from "./boxStatusHistory";
export { operationalCosts } from "./operationalCosts";
export { kpiDefinitions } from "./kpiDefinitions";
export { fieldCollectionLog } from "./fieldCollectionLog";
export { boxInspectionLog } from "./boxInspectionLog";
export { cashHandoverDeposit } from "./cashHandoverDeposit";
export { proposedFieldDictionary } from "./proposedFieldDictionary";
export { researchAndAssumptions } from "./researchAndAssumptions";
