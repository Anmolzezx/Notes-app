/**
 * End-to-end smoke test for the Notes API.
 *
 * Usage:
 *   npx tsx tests/smoke.ts                          # localhost:3000
 *   BASE_URL=http://localhost:3000 npx tsx tests/smoke.ts
 *   BASE_URL=https://your-app.onrender.com npx tsx tests/smoke.ts
 *
 * Exits 0 if every assertion passes, 1 otherwise.
 */

const BASE = (process.env.BASE_URL ?? process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label: string, detail: string) {
  console.error(`  ✗ ${label} — ${detail}`);
  failed++;
}

function assert(cond: boolean, label: string, detail = '') {
  cond ? ok(label) : fail(label, detail);
}

async function request(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string } = {}
): Promise<{ status: number; headers: Headers; body: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: unknown = text;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // keep as text
    }
  }
  return { status: res.status, headers: res.headers, body };
}

function tag(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function main() {
  console.log(`Target: ${BASE}\n`);

  const t = tag();
  const aliceEmail = `smoke-alice-${t}@example.com`;
  const bobEmail = `smoke-bob-${t}@example.com`;
  const password = 'hunter2hunter';

  console.log('Meta endpoints:');
  {
    const r = await request('GET', '/health');
    assert(r.status === 200, 'GET /health -> 200', `got ${r.status}`);
    assert(
      typeof r.body === 'object' && r.body !== null && (r.body as Record<string, unknown>).status === 'ok',
      'health body { status: "ok" }'
    );
  }
  {
    const r = await request('GET', '/about');
    assert(r.status === 200, 'GET /about -> 200', `got ${r.status}`);
    const b = r.body as Record<string, unknown>;
    assert(typeof b?.name === 'string' && typeof b?.email === 'string', '/about has name + email');
    assert(typeof b?.['my features'] === 'object' && b['my features'] !== null, '/about has "my features" object');
  }
  {
    const r = await request('GET', '/openapi.json');
    assert(r.status === 200, 'GET /openapi.json -> 200', `got ${r.status}`);
    const b = r.body as Record<string, unknown>;
    assert(typeof b?.openapi === 'string' && (b.openapi as string).startsWith('3.'), 'openapi version is 3.x');
    assert(typeof b?.paths === 'object', 'openapi has paths');
  }

  console.log('\nAuth:');
  {
    const r = await request('POST', '/register', { body: { email: aliceEmail, password } });
    assert(r.status === 201, 'POST /register alice -> 201', `got ${r.status}: ${JSON.stringify(r.body)}`);
  }
  {
    const r = await request('POST', '/register', { body: { email: bobEmail, password } });
    assert(r.status === 201, 'POST /register bob -> 201', `got ${r.status}: ${JSON.stringify(r.body)}`);
  }
  {
    const r = await request('POST', '/register', { body: { email: aliceEmail, password } });
    assert(r.status === 409, 'duplicate register -> 409', `got ${r.status}`);
  }
  {
    const r = await request('POST', '/register', { body: { email: 'foo@bar.com', password: 'short' } });
    assert(r.status === 400, 'short password -> 400', `got ${r.status}`);
  }
  {
    const r = await request('POST', '/login', { body: { email: aliceEmail, password: 'WRONG' } });
    assert(r.status === 401, 'wrong password -> 401', `got ${r.status}`);
  }

  const aliceToken = await (async () => {
    const r = await request('POST', '/login', { body: { email: aliceEmail, password } });
    assert(r.status === 200, 'login alice -> 200', `got ${r.status}`);
    return (r.body as { access_token: string }).access_token;
  })();
  const bobToken = await (async () => {
    const r = await request('POST', '/login', { body: { email: bobEmail, password } });
    assert(r.status === 200, 'login bob -> 200', `got ${r.status}`);
    return (r.body as { access_token: string }).access_token;
  })();

  {
    const r = await request('GET', '/notes');
    assert(r.status === 401, 'GET /notes without token -> 401', `got ${r.status}`);
  }
  {
    const r = await request('GET', '/notes', { token: 'junk.token.here' });
    assert(r.status === 401, 'GET /notes with junk token -> 401', `got ${r.status}`);
  }

  console.log('\nNotes CRUD:');
  let noteId = '';
  {
    const r = await request('POST', '/notes', {
      token: aliceToken,
      body: { title: 'Smoke note', content: 'hello world' },
    });
    assert(r.status === 201, 'POST /notes -> 201', `got ${r.status}`);
    noteId = (r.body as { id: string }).id;
    assert(typeof noteId === 'string' && noteId.length > 0, 'response has id');
  }
  {
    const r = await request('POST', '/notes', {
      token: aliceToken,
      body: { title: '   ', content: 'x' },
    });
    assert(r.status === 400, 'empty title -> 400', `got ${r.status}`);
  }
  {
    const r = await request('GET', `/notes/${noteId}`, { token: aliceToken });
    assert(r.status === 200, 'GET /notes/:id (owner) -> 200');
  }
  {
    const r = await request('GET', '/notes/not-a-uuid', { token: aliceToken });
    assert(r.status === 400, 'GET /notes/<bad-uuid> -> 400');
  }
  {
    const r = await request('GET', '/notes/00000000-0000-0000-0000-000000000000', { token: aliceToken });
    assert(r.status === 404, 'GET unknown UUID -> 404');
  }
  {
    const r = await request('PUT', `/notes/${noteId}`, {
      token: aliceToken,
      body: { content: 'updated content' },
    });
    assert(r.status === 200, 'PUT (owner) -> 200');
  }
  {
    const r = await request('PUT', `/notes/${noteId}`, {
      token: aliceToken,
      body: {},
    });
    assert(r.status === 400, 'PUT empty body -> 400');
  }
  {
    const r = await request('PUT', `/notes/${noteId}`, {
      token: bobToken,
      body: { title: 'hijack' },
    });
    assert(r.status === 404, 'PUT non-owner -> 404');
  }
  {
    const r = await request('DELETE', `/notes/${noteId}`, { token: bobToken });
    assert(r.status === 404, 'DELETE non-owner -> 404');
  }

  console.log('\nSharing:');
  {
    const r = await request('POST', `/notes/${noteId}/share`, {
      token: aliceToken,
      body: { share_with_email: aliceEmail },
    });
    assert(r.status === 400, 'share with self -> 400');
  }
  {
    const r = await request('POST', `/notes/${noteId}/share`, {
      token: aliceToken,
      body: { share_with_email: `does-not-exist-${t}@example.com` },
    });
    assert(r.status === 404, 'share with unknown user -> 404');
  }
  {
    const r = await request('POST', `/notes/${noteId}/share`, {
      token: bobToken,
      body: { share_with_email: aliceEmail },
    });
    assert(r.status === 404, 'share as non-owner -> 404');
  }
  {
    const r = await request('POST', `/notes/${noteId}/share`, {
      token: aliceToken,
      body: { share_with_email: bobEmail.toUpperCase() },
    });
    assert(r.status === 200, 'share with bob (uppercase email) -> 200');
  }
  {
    const r = await request('GET', `/notes/${noteId}`, { token: bobToken });
    assert(r.status === 200, 'bob can GET shared note -> 200');
  }
  {
    const r = await request('PUT', `/notes/${noteId}`, {
      token: bobToken,
      body: { title: 'still cannot edit' },
    });
    assert(r.status === 404, 'bob cannot edit shared note -> 404');
  }
  {
    const r = await request('POST', `/notes/${noteId}/share`, {
      token: aliceToken,
      body: { share_with_email: bobEmail },
    });
    assert(r.status === 200, 'reshare is idempotent -> 200');
  }

  console.log('\nPin + reorder:');
  let n1 = '';
  let n2 = '';
  let n3 = '';
  for (const [label, ref] of [['n1', () => (n1 = '')], ['n2', () => (n2 = '')], ['n3', () => (n3 = '')]] as const) {
    void ref;
    const r = await request('POST', '/notes', {
      token: aliceToken,
      body: { title: `pin-${label}-${t}`, content: `body for ${label}` },
    });
    if (label === 'n1') n1 = (r.body as { id: string }).id;
    if (label === 'n2') n2 = (r.body as { id: string }).id;
    if (label === 'n3') n3 = (r.body as { id: string }).id;
  }
  {
    const r = await request('PUT', `/notes/${n2}/pin`, {
      token: aliceToken,
      body: { pinned: true },
    });
    assert(r.status === 200, 'pin n2 -> 200');
    assert((r.body as { pinned: boolean }).pinned === true, 'response shows pinned:true');
  }
  {
    const r = await request('PUT', `/notes/${n2}/pin`, { token: aliceToken, body: { pinned: 'yes' } });
    assert(r.status === 400, 'pin with non-boolean -> 400');
  }
  {
    const r = await request('PUT', `/notes/${n2}/pin`, { token: bobToken, body: { pinned: true } });
    assert(r.status === 404, 'pin non-owner -> 404');
  }
  {
    const r = await request('PUT', '/notes/reorder', {
      token: aliceToken,
      body: { note_ids: [n3, n1, n2] },
    });
    assert(r.status === 200, 'reorder -> 200');
    assert((r.body as { count: number }).count === 3, 'reorder count == 3');
  }
  {
    const r = await request('PUT', '/notes/reorder', {
      token: aliceToken,
      body: { note_ids: [n1, '00000000-0000-0000-0000-000000000000', n2] },
    });
    assert(r.status === 200, 'reorder with non-owned UUID -> 200');
    assert((r.body as { count: number }).count === 2, 'reorder count == 2 (non-owned skipped)');
  }
  {
    const r = await request('PUT', '/notes/reorder', {
      token: aliceToken,
      body: { note_ids: [] },
    });
    assert(r.status === 400, 'reorder empty array -> 400');
  }

  console.log('\nPagination + search:');
  {
    const r = await request('GET', '/notes?limit=2', { token: aliceToken });
    assert(r.status === 200, 'GET /notes?limit=2 -> 200');
    assert((r.body as unknown[]).length <= 2, 'returns at most 2 items');
    assert(r.headers.get('x-total-count') !== null, 'X-Total-Count header present');
  }
  {
    const r = await request('GET', '/notes?limit=200', { token: aliceToken });
    assert(r.status === 400, 'GET /notes?limit=200 -> 400');
  }
  {
    const r = await request('GET', `/search?q=pin-n1-${t}`, { token: aliceToken });
    assert(r.status === 200, 'search hit -> 200');
    assert((r.body as unknown[]).length === 1, 'search returns 1 result');
  }
  {
    const r = await request('GET', '/search?q=ZZZ-no-match-here-ZZZ', { token: aliceToken });
    assert(r.status === 200, 'search miss -> 200');
    assert((r.body as unknown[]).length === 0, 'search returns 0 results');
  }
  {
    const r = await request('GET', '/search', { token: aliceToken });
    assert(r.status === 400, 'search without q -> 400');
  }

  console.log('\nDelete + cleanup:');
  for (const id of [noteId, n1, n2, n3]) {
    const r = await request('DELETE', `/notes/${id}`, { token: aliceToken });
    assert(r.status === 204, `DELETE /notes/${id.slice(0, 8)} -> 204`);
  }
  {
    const r = await request('GET', `/notes/${noteId}`, { token: aliceToken });
    assert(r.status === 404, 'deleted note now 404');
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
