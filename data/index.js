import { collections as sourceCollections } from "./collections.js";
import { donationBoxes as sourceDonationBoxes } from "./donationBoxes.js";
import {
  partnerLeaderboardBoxes,
  partnerLeaderboardCollections,
} from "./partnerLeaderboardDemo.js";

export { readme } from "./README.js";
export { cities } from "./cities.js";
export { users } from "./users.js";
export { partners } from "./partners.js";
export { riders } from "./riders.js";
export const donationBoxes = [...sourceDonationBoxes, ...partnerLeaderboardBoxes];
export const collections = [...sourceCollections, ...partnerLeaderboardCollections];
export { riderTasks } from "./riderTasks.js";
export { securityIncidents } from "./securityIncidents.js";
export { boxStatusHistory } from "./boxStatusHistory.js";
export { operationalCosts } from "./operationalCosts.js";
export { kpiDefinitions } from "./kpiDefinitions.js";
export { fieldCollectionLog } from "./fieldCollectionLog.js";
export { boxInspectionLog } from "./boxInspectionLog.js";
export { cashHandoverDeposit } from "./cashHandoverDeposit.js";
export { proposedFieldDictionary } from "./proposedFieldDictionary.js";
export { researchAndAssumptions } from "./researchAndAssumptions.js";

