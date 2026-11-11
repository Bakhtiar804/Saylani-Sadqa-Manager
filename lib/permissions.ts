import type { AppRole } from './session';

export const creatableRoles: Record<AppRole, readonly ('admin' | 'city_manager' | 'rider')[]> = {
  super_admin: ['admin'], admin: ['city_manager', 'rider'], city_manager: ['rider'], rider: [],
};
export const deletableRoles: Record<AppRole, readonly ('admin' | 'city_manager' | 'rider')[]> = {
  super_admin: [], admin: ['city_manager', 'rider'], city_manager: ['rider'], rider: [],
};
export function canOperate(role: AppRole) { return role === 'admin' || role === 'city_manager'; }
export function canRegisterBox(role: AppRole) { return role === 'admin'; }
export function canImportReports(role: AppRole) { return role === 'admin' || role === 'city_manager'; }
