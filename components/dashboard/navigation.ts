import type { IconName } from "./icons";

type DashboardModule = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: IconName;
};

export const dashboardModules: DashboardModule[] = [
  { href: "/dashboard", label: "Overview", mobileLabel: "Overview", icon: "grid" },
  { href: "/dashboard/leaderboard", label: "Leaderboard", mobileLabel: "Leaderboard", icon: "leaderboard" },
  { href: "/dashboard/collections", label: "Collections", mobileLabel: "Collections", icon: "wallet" },
  { href: "/dashboard/boxes", label: "Donation Boxes", mobileLabel: "Boxes", icon: "box" },
  { href: "/dashboard/riders", label: "Riders & Tasks", mobileLabel: "Riders", icon: "bike" },
  { href: "/dashboard/finance", label: "Cash & Deposits", mobileLabel: "Deposits", icon: "cash" },
  { href: "/dashboard/operations", label: "Inspections & Incidents", mobileLabel: "Inspections", icon: "shield" },
  { href: "/dashboard/partners", label: "Partners", mobileLabel: "Partners", icon: "handshake" },
  { href: "/dashboard/users", label: "Users", mobileLabel: "Users", icon: "users" },
  { href: "/dashboard/analytics", label: "Analytics", mobileLabel: "Analytics", icon: "chart" },
];

export const adminDashboardModules: DashboardModule[] = [
  { href: "/dashboard/admin", label: "Overview", mobileLabel: "Overview", icon: "grid" },
  { href: "/dashboard/admin/collections", label: "Collections", mobileLabel: "Collections", icon: "wallet" },
  { href: "/dashboard/admin/boxes", label: "Donation Boxes", mobileLabel: "Boxes", icon: "box" },
  { href: "/dashboard/admin/riders", label: "Riders & Tasks", mobileLabel: "Riders", icon: "bike" },
  { href: "/dashboard/admin/operations", label: "Field Operations", mobileLabel: "Operations", icon: "shield" },
  { href: "/dashboard/admin/team", label: "Team Accounts", mobileLabel: "Team", icon: "users" },
];

export const cityManagerDashboardModules: DashboardModule[] = [
  { href: "/dashboard/manager", label: "Overview", mobileLabel: "Overview", icon: "grid" },
  { href: "/dashboard/manager/collections", label: "Collections", mobileLabel: "Collections", icon: "wallet" },
  { href: "/dashboard/manager/boxes", label: "Donation Boxes", mobileLabel: "Boxes", icon: "box" },
  { href: "/dashboard/manager/riders", label: "Riders & Tasks", mobileLabel: "Riders", icon: "bike" },
  { href: "/dashboard/manager/operations", label: "Field Operations", mobileLabel: "Operations", icon: "shield" },
  { href: "/dashboard/manager/team", label: "Rider Accounts", mobileLabel: "Accounts", icon: "users" },
];

export const riderDashboardModules: DashboardModule[] = [
  { href: "/dashboard/rider", label: "My Overview", mobileLabel: "Overview", icon: "grid" },
  { href: "/dashboard/rider/tasks", label: "My Tasks", mobileLabel: "Tasks", icon: "check" },
  { href: "/dashboard/rider/collections", label: "My Collections", mobileLabel: "Collections", icon: "wallet" },
];
