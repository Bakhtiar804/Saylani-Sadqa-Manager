import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Exercise the real handlers with an isolated database double; never connect to a database.
const require = createRequire(import.meta.url);
let session, row, queries, released, failInsert;
const client = {
  async query(sql, params) {
    queries.push({ sql, params });
    if (failInsert && sql.includes('INSERT INTO collections')) throw new Error('fixture failure');
    return { rows: sql.includes('SELECT task.task_id') && row ? [row] : [] };
  },
  release() { released = true; },
};
function load(path) {
  const source = fs.readFileSync(path, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const imports = {
    '@/lib/api-errors': { withApiErrors: handler => handler },
    '@/lib/db': { getDatabasePool: () => ({ connect: async () => client }) },
    '@/lib/operations-auth': { getOperationsSession: async () => session, hasValidRequestOrigin: request => request.headers.get('origin') === 'http://localhost' },
    'next/cache': { revalidateTag() {} },
    '@/lib/rider-workflow': loadWorkflow(),
  };
  new Function('require', 'module', 'exports', code)(name => imports[name] ?? require(name), module, module.exports);
  return module.exports;
}
function loadWorkflow() {
  const code = ts.transpileModule(fs.readFileSync('lib/rider-workflow.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', code)(module, module.exports);
  return module.exports;
}
const { PATCH } = load('app/api/dashboard/tasks/[taskId]/route.ts');
const { POST } = load('app/api/dashboard/tasks/[taskId]/collection/route.ts');
function reset() {
  session = { role: 'rider', userId: 'fixture-rider' };
  row = { task_id: 'fixture-task', task_status: 'In Progress', task_type: 'Scheduled Collection', workflow_stage: 'counting', box_status: 'Active' };
  queries = []; released = false; failInsert = false;
}
async function call(handler, body, origin = 'http://localhost') {
  return handler(new Request('http://localhost/api/task', { method: handler === POST ? 'POST' : 'PATCH', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ taskId: 'fixture-task' }) });
}
for (const handler of [PATCH, POST]) {
  for (const [identity, expected] of [[null, 401], [{ role: 'admin' }, 403]]) {
    reset(); session = identity;
    assert.equal((await call(handler, {})).status, expected); assert.equal(queries.length, 0);
  }
  reset(); assert.equal((await call(handler, {}, 'http://foreign')).status, 403); assert.equal(queries.length, 0);
  reset(); row = null;
  assert.equal((await call(handler, handler === POST ? { counts: { note_100: 1 } } : { status: 'Skipped', notes: 'reason' })).status, 404);
  assert.equal(queries.at(-1).sql, 'ROLLBACK'); assert.ok(released);
  assert.ok(queries[1].sql.includes("rider.employment_status='Active'")); assert.ok(queries[1].sql.includes('FOR UPDATE'));
  assert.equal(queries[1].params[1], 'fixture-rider');
}
for (const stage of ['assigned', 'departed', 'arrived']) {
  reset(); row.workflow_stage = stage;
  assert.equal((await call(POST, { counts: { note_100: 1 } })).status, 409);
  assert.equal(queries.at(-1).sql, 'ROLLBACK'); assert.ok(released);
}
reset(); assert.equal((await call(POST, { amount: 100 })).status, 400);
reset(); const response = await call(POST, { counts: { note_100: 2, coin_5: 1 }, amount: 999 });
assert.equal(response.status, 201); assert.equal((await response.json()).amount, 205);
assert.equal(queries.at(-1).sql, 'COMMIT'); assert.ok(released);
assert.ok(queries.some(q => q.sql.includes('INSERT INTO field_collection_logs')));
assert.ok(queries.some(q => q.sql.includes('completed_at = CURRENT_TIMESTAMP') && q.sql.includes('collection_submitted') && q.sql.includes("workflow_stage='submitted'")));
reset(); failInsert = true;
const originalError = console.error; console.error = () => {};
try { assert.equal((await call(POST, { counts: { note_100: 1 } })).status, 503); } finally { console.error = originalError; }
assert.equal(queries.at(-1).sql, 'ROLLBACK'); assert.ok(released);
reset(); row.workflow_stage = 'assigned'; row.task_status = 'Assigned';
assert.equal((await call(PATCH, { stage: 'arrived' })).status, 409);
reset(); row.task_status = 'Skipped';
assert.equal((await call(PATCH, { status: 'Completed' })).status, 409);
reset(); row.task_type = 'Follow-up Visit';
assert.equal((await call(PATCH, { status: 'Completed' })).status, 200);
assert.ok(queries.some(q => q.sql.includes('completed_at = CASE'))); assert.equal(queries.at(-1).sql, 'COMMIT'); assert.ok(released);
console.log('PASS reconciled task handlers: authorization, origin, ownership, active rider, workflow guards, cash totals, completion metadata, atomic commit/rollback and release.');
