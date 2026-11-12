import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
let session, branch, queries, exists, failAudit, released;
const client = {
  async query(sql, params) {
    queries.push({ sql, params });
    if (failAudit && sql.includes('INSERT INTO activity_audit_log')) throw new Error('Fixture audit failure');
    if (sql.includes('SELECT box.latitude')) return { rows: exists ? [{ latitude: null, longitude: null }] : [], rowCount: exists ? 1 : 0 };
    if (sql.includes('AS next_number')) return { rows: [{ next_number: 1 }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  }, release() { released = true; },
};
function load(path, imports = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => imports[name] ?? require(name), module, module.exports);
  return module.exports;
}
const imports = {
  '@/lib/api-errors': { withApiErrors: fn => fn },
  '@/lib/db': { getDatabasePool: () => ({ connect: async () => client }) },
  '@/lib/operations-auth': { getOperationsSession: async () => session, hasValidRequestOrigin: req => req.headers.get('origin') === 'http://localhost' },
  '@/lib/city-branches': { getActiveTeamBranch: async () => branch },
  '@/lib/box-coordinates': load('lib/box-coordinates.ts'),
  'next/cache': { revalidateTag() {} },
};
const { PATCH } = load('app/api/dashboard/boxes/[boxId]/location/route.ts', imports);
const { POST } = load('app/api/dashboard/boxes/route.ts', imports);
function reset() { session = { role: 'admin', userId: 'fixture-team', cityId: 'fixture-city' }; branch = { branchId: 'fixture-branch' }; queries = []; exists = true; failAudit = false; released = false; }
const call = (handler, body, origin = 'http://localhost') => handler(new Request('http://localhost/api/box', { method: handler === POST ? 'POST' : 'PATCH', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ boxId: 'fixture-box' }) });
for (const handler of [PATCH, POST]) {
  for (const [identity, status] of [[null, 401], [{ role: 'rider', cityId: 'fixture-city' }, 403], [{ role: 'super_admin', cityId: null }, 403]]) {
    if (handler === PATCH && identity?.role === 'super_admin') continue;
    reset(); session = identity; assert.equal((await call(handler, {})).status, status); assert.equal(queries.length, 0);
  }
  reset(); assert.equal((await call(handler, {}, 'https://foreign.invalid')).status, 403); assert.equal(queries.length, 0);
  reset(); assert.equal((await call(handler, { latitude: 24 })).status, 400); assert.equal(queries.length, 0);
}
reset(); session.role = 'city_manager'; branch = null;
assert.equal((await call(PATCH, { latitude: 24, longitude: 67 })).status, 403); assert.equal(queries.length, 0);
reset(); session.role = 'city_manager'; exists = false;
assert.equal((await call(PATCH, { latitude: 24, longitude: 67 })).status, 404);
assert.deepEqual(queries[1].params, ['fixture-box', 'fixture-city', 'fixture-branch', false]);
assert.ok(queries[1].sql.includes('assignment.city_id=box.city_id')); assert.ok(queries[1].sql.includes('FOR UPDATE OF box'));
assert.equal(queries.at(-1).sql, 'ROLLBACK'); assert.ok(released);
reset(); session = { role: 'super_admin', userId: 'fixture-super', cityId: null };
assert.equal((await call(PATCH, { latitude: 24.86, longitude: 67.01 })).status, 200);
assert.deepEqual(queries[1].params, ['fixture-box', null, null, true]);
assert.ok(queries[1].sql.includes('($4::boolean OR box.city_id=$2)'));
assert.equal(queries.at(-1).sql, 'COMMIT'); assert.ok(released);
reset(); assert.equal((await call(PATCH, { latitude: 24.86, longitude: 67.01 })).status, 200);
assert.deepEqual(queries.find(q => q.sql.startsWith('UPDATE donation_boxes')).params, ['fixture-box', 24.86, 67.01]);
assert.equal(queries.at(-1).sql, 'COMMIT'); assert.ok(released);
reset(); assert.equal((await call(PATCH, { latitude: '', longitude: '' })).status, 200);
assert.deepEqual(queries.find(q => q.sql.startsWith('UPDATE donation_boxes')).params, ['fixture-box', null, null]);
reset(); failAudit = true;
await assert.rejects(call(PATCH, { latitude: 24.86, longitude: 67.01 }), /audit failure/);
assert.equal(queries.at(-1).sql, 'ROLLBACK'); assert.ok(released);
reset();
const registration = { qrCode: 'FIXTURE-QR', area: 'Fixture', locationType: 'Shop', locationDescription: 'Fixture address', installationDate: '2026-11-12', securityLevel: 'Standard', latitude: '24.8607', longitude: '67.0011' };
assert.equal((await call(POST, registration)).status, 201);
const insert = queries.find(q => q.sql.includes('INSERT INTO donation_boxes'));
assert.ok(/district, latitude, longitude/.test(insert.sql)); assert.equal(insert.params.length, 14);
assert.deepEqual(insert.params.slice(-2), [24.8607, 67.0011]); assert.equal(queries.at(-1).sql, 'COMMIT'); assert.ok(released);
console.log('PASS box location API: authentication, role/origin/city/branch guards, coordinate validation, location save/clear, registration GPS persistence, audit rollback and client release.');
