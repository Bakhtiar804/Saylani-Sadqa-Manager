import 'server-only';
import { getDatabasePool } from './db';
import { getActiveTeamBranch } from './city-branches';
import type { UserSession } from './session';
import type { DataRecord } from './dashboard-types';

export function currentReportingMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === 'year')!.value);
  const month = Number(parts.find((part) => part.type === 'month')!.value);

  return `${year}-${String(month).padStart(2, '0')}`;
}

export function previousReportingMonth(now = new Date()) {
  const current = currentReportingMonth(now);

  return new Date(
    Date.UTC(
      Number(current.slice(0, 4)),
      Number(current.slice(5, 7)) - 2,
      1,
    ),
  )
    .toISOString()
    .slice(0, 7);
}

export async function getRiderDetails(
  session: UserSession,
  requestedMonth?: string,
  now = new Date(),
) {
  const currentMonth = currentReportingMonth(now);
  const month =
    requestedMonth && /^20\d{2}-(0[1-9]|1[0-2])$/.test(requestedMonth)
      ? requestedMonth
      : currentMonth;

  const start = `${month}-01`;
  const end = new Date(
    Date.UTC(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)),
      1,
    ),
  )
    .toISOString()
    .slice(0, 10);

  const ownProfile = session.role === 'rider';
  const branch =
    session.role === 'city_manager' && session.cityId
      ? await getActiveTeamBranch(session.userId, session.cityId)
      : null;

  if (session.role === 'city_manager' && !branch) {
    return {
      month,
      currentMonth,
      profiles: [],
      history: [],
      boxes: [],
      tasks: [],
    };
  }

  // Rider scope is always the authenticated account's team.
  // City managers are restricted to their active branch.
  // Super admins have global access; other city-scoped roles stay in their city.
  const personJoin =
    session.role === 'city_manager'
      ? 'LEFT JOIN team_member_branch_assignments branch_assignment ON branch_assignment.team_id = person.team_id'
      : '';

  const personScope = ownProfile
    ? 'person.team_id = $1::text'
    : session.role === 'super_admin'
      ? 'TRUE'
      : session.role === 'city_manager'
        ? 'person.city_id = $1::text AND COALESCE(person.branch_id, branch_assignment.branch_id) = $2::text'
        : 'person.city_id = $1::text';

  const personParams = ownProfile
    ? [session.userId]
    : session.role === 'super_admin'
      ? []
      : session.role === 'city_manager'
        ? [session.cityId, branch!.branchId]
        : [session.cityId];
