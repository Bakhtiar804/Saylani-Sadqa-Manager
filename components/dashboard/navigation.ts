import type { IconName } from './icons';
type DashboardModule = { href:string;label:string;mobileLabel:string;icon:IconName };
export const dashboardModules:DashboardModule[] = [
 {href:'/dashboard',label:'Overview',mobileLabel:'Overview',icon:'grid'},
 {href:'/dashboard/collections',label:'Collections',mobileLabel:'Collections',icon:'wallet'},
 {href:'/dashboard/boxes',label:'Network Tree',mobileLabel:'Network',icon:'box'},
 {href:'/dashboard/riders',label:'Riders',mobileLabel:'Riders',icon:'bike'},
 {href:'/dashboard/finance',label:'Operational Cost',mobileLabel:'Costs',icon:'cash'},
 {href:'/dashboard/leaderboard',label:'Leaderboard',mobileLabel:'Rankings',icon:'leaderboard'},
 {href:'/dashboard/analytics',label:'Analytics',mobileLabel:'Analytics',icon:'chart'},
];
export const adminDashboardModules:DashboardModule[] = [
 {href:'/dashboard/admin',label:'Overview',mobileLabel:'Overview',icon:'grid'},
 {href:'/dashboard/admin/collections',label:'Collections',mobileLabel:'Collections',icon:'wallet'},
 {href:'/dashboard/admin/boxes',label:'Network Tree',mobileLabel:'Network',icon:'box'},
 {href:'/dashboard/admin/donation-boxes',label:'Donation Boxes',mobileLabel:'Boxes',icon:'box'},
 {href:'/dashboard/admin/riders',label:'Riders',mobileLabel:'Riders',icon:'bike'},
 {href:'/dashboard/admin/finance',label:'Operational Cost',mobileLabel:'Costs',icon:'cash'},
 {href:'/dashboard/admin/leaderboard',label:'Leaderboard',mobileLabel:'Rankings',icon:'leaderboard'},
 {href:'/dashboard/admin/import',label:'Excel Import',mobileLabel:'Import',icon:'chart'},
 {href:'/dashboard/admin/team',label:'Team Accounts',mobileLabel:'Team',icon:'users'},
 {href:'/dashboard/admin/branches',label:'Branches',mobileLabel:'Branches',icon:'box'},
];
export const cityManagerDashboardModules:DashboardModule[] = [
 {href:'/dashboard/manager',label:'Overview',mobileLabel:'Overview',icon:'grid'},
 {href:'/dashboard/manager/collections',label:'Collections',mobileLabel:'Collections',icon:'wallet'},
 {href:'/dashboard/manager/boxes',label:'Network Tree',mobileLabel:'Network',icon:'box'},
 {href:'/dashboard/manager/donation-boxes',label:'Donation Boxes',mobileLabel:'Boxes',icon:'box'},
 {href:'/dashboard/manager/riders',label:'Riders',mobileLabel:'Riders',icon:'bike'},
 {href:'/dashboard/manager/finance',label:'Operational Cost',mobileLabel:'Costs',icon:'cash'},
 {href:'/dashboard/manager/leaderboard',label:'Leaderboard',mobileLabel:'Rankings',icon:'leaderboard'},
 {href:'/dashboard/manager/import',label:'Excel Import',mobileLabel:'Import',icon:'chart'},
 {href:'/dashboard/manager/team',label:'Team Accounts',mobileLabel:'Team',icon:'users'},
];
export const riderDashboardModules:DashboardModule[] = [
 {href:'/dashboard/rider',label:'My Overview',mobileLabel:'Overview',icon:'grid'},
 {href:'/dashboard/rider/profile',label:'My Profile',mobileLabel:'Profile',icon:'users'},
 {href:'/dashboard/rider/tasks',label:'My Tasks',mobileLabel:'Tasks',icon:'check'},
 {href:'/dashboard/rider/collections',label:'My Collections',mobileLabel:'Collections',icon:'wallet'},
];
