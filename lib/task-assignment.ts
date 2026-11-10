export const taskTypes = ["Scheduled Collection", "Box Verification", "Follow-up Visit"] as const;

export function getPakistanDate(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Karachi",
  }).format(now);
}
