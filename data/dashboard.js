export const dashboardStats = [
  { label: "Total donations", value: "Rs 2.84M", change: "12.8%", note: "Compared to last month", icon: "wallet", tone: "green" },
  { label: "Active campaigns", value: "12", change: "2 new", note: "Across 5 categories", icon: "heart", tone: "blue" },
  { label: "Beneficiaries helped", value: "1,248", change: "8.2%", note: "This month so far", icon: "users", tone: "orange" },
  { label: "Average donation", value: "Rs 4,250", change: "5.4%", note: "Across all campaigns", icon: "chart", tone: "purple" },
];

export const donations = [
  { initials: "AK", name: "Ayesha Khan", email: "ayesha.khan@email.com", campaign: "Winter Food Drive", amount: "Rs 25,000", date: "Today, 10:42 AM", status: "Completed", tone: "green" },
  { initials: "UM", name: "Usman Malik", email: "usman.m@email.com", campaign: "Education for All", amount: "Rs 12,500", date: "Today, 09:18 AM", status: "Completed", tone: "blue" },
  { initials: "SF", name: "Sara Farooq", email: "sara.f@email.com", campaign: "Medical Emergency Fund", amount: "Rs 8,000", date: "Yesterday", status: "Pending", tone: "orange" },
  { initials: "HA", name: "Hassan Ali", email: "hassan.ali@email.com", campaign: "Winter Food Drive", amount: "Rs 5,000", date: "Yesterday", status: "Completed", tone: "purple" },
];

export const campaigns = [
  { name: "Winter Food Drive", category: "Food & essentials", raised: "Rs 1,240,000", goal: "Rs 1,500,000", percent: 83, color: "#276431", icon: "food" },
  { name: "Education for All", category: "Education", raised: "Rs 875,000", goal: "Rs 1,200,000", percent: 73, color: "#1d65d5", icon: "book" },
  { name: "Medical Emergency Fund", category: "Healthcare", raised: "Rs 620,000", goal: "Rs 1,000,000", percent: 62, color: "#d98a32", icon: "medical" },
];

export const activities = [
  { icon: "check", title: "New donation received", detail: "Ayesha Khan donated Rs 25,000", time: "12 min ago", tone: "green" },
  { icon: "campaign", title: "Campaign is nearing its goal", detail: "Winter Food Drive reached 83%", time: "1 hr ago", tone: "blue" },
  { icon: "person", title: "New beneficiary registered", detail: "A new application needs review", time: "3 hrs ago", tone: "orange" },
];
