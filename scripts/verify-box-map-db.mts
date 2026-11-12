import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import nextEnv from '@next/env';
import { getDatabasePool } from '../lib/db';
import { getNetworkTree } from '../lib/network-tree';
import { getMapBoxes, buildBoxPoints } from '../lib/box-map';
nextEnv.loadEnvConfig(process.cwd());
const pool = getDatabasePool();
try {
  const cities = await getNetworkTree({ network: true, cityId: null }, { cityId: null, month: null, channel: 'all' });
  const boxes = getMapBoxes(cities), points = buildBoxPoints(boxes);
  const expected = (await pool.query('SELECT count(*)::int AS total FROM donation_boxes')).rows[0].total;
  assert.equal(boxes.length, expected);
  assert.equal(points.features.length, (await pool.query('SELECT count(*)::int AS total FROM donation_boxes WHERE latitude IS NOT NULL AND longitude IS NOT NULL')).rows[0].total);
  if (cities.length) {
    const restricted = await getNetworkTree({ network: false, cityId: cities[0].id }, { cityId: 'foreign-city', month: null, channel: 'all', branchId: '' });
    assert.equal(getMapBoxes(restricted).length, 0);
  }
  console.log(`PASS live database read: ${cities.length} cities, ${boxes.length} registered boxes, ${points.features.length} saved GPS dots; missing branch cannot widen box access.`);
  const base = process.argv.find(value => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(value));
  if (base) {
    const account = (await pool.query(`SELECT member.team_id, member.email, member.full_name, member.city_id
      FROM team_members member JOIN roles USING(role_id)
      WHERE roles.role_key='super_admin' AND member.identity_type='login_account'
      AND member.account_status='active' AND member.deleted_at IS NULL LIMIT 1`)).rows[0];
    assert.ok(account, 'An active local-test account is required.');
    const payload = Buffer.from(JSON.stringify({ userId: account.team_id, email: account.email, name: account.full_name,
      role: 'super_admin', cityId: account.city_id, expiresAt: Math.floor(Date.now() / 1000) + 300 })).toString('base64url');
    const cookie = `${payload}.${createHmac('sha256', process.env.AUTH_SECRET!.trim()).update(payload).digest('base64url')}`;
    for (const city of ['all', boxes[0]?.cityId ?? cities[0].id]) {
      const response: Response = await fetch(`${base}/dashboard/boxes?city=${encodeURIComponent(city)}`, { headers: { Cookie: `saylani_admin_session=${cookie}` }, redirect: 'manual', signal: AbortSignal.timeout(90000) });
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes('Donation box location network'));
      assert.ok(html.includes('Add GPS location'), 'Super Admin must see the GPS action without selecting a box first.');
      assert.ok(!html.includes('Collection network tree'));
    }
    console.log('PASS authenticated live HTTP: Pakistan and selected-city coverage pages render the database map.');
  }
} finally { await pool.end(); }
