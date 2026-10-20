import test from 'node:test';
import assert from 'node:assert/strict';
import { activity, collect, paginate, client, ApiError } from '../scripts/github.ts';
import { building, parseSnapshot, layout, type Project, type Snapshot } from '../src/model.ts';
import { renderPreview } from '../scripts/svg.ts';

const project: Project = { id: 1, name: 'city', url: 'https://github.com/test/city', description: null,
  language: 'TypeScript', languages: ['TypeScript'], topics: [], fork: false, archived: false,
  stars: 0, days: Array(30).fill(0), release: null, releaseKnown: true };
const snapshot: Snapshot = { version: 1, owner: 'test', generatedAt: '2026-01-31T05:00:00Z',
  since: '2026-01-01T00:00:00Z', until: '2026-01-31T00:00:00Z', projects: [project] };
test('UTC buckets exclude upper boundary and deduplicate SHAs', () => {
  const c = (sha: string, date: string) => ({ sha, commit: { committer: { date } } });
  const days = activity([c('a', snapshot.since), c('a', snapshot.since), c('b', '2026-01-30T23:59:59Z'),
    c('c', snapshot.until), c('d', '2025-12-31T23:59:59Z')], snapshot.since, snapshot.until);
  assert.equal(days[0], 1); assert.equal(days[29], 1); assert.equal(days.reduce((a, b) => a + b), 2);
});
test('pagination does not silently truncate at 100 repositories', async () => {
  const calls: string[] = [];
  const result = await paginate(async path => { calls.push(path); return calls.length === 1 ? Array(100).fill({}) : [{ last: true }]; }, '/repos?sort=full_name');
  assert.equal(result.length, 101); assert.match(calls[1], /&per_page=100&page=2$/);
});
test('collector excludes private, unknown-visibility and foreign-owned records', async () => {
  const base = { id: 1, name: 'city', private: false, visibility: 'public', owner: { login: 'test' },
    description: null, language: null, topics: [], fork: false, archived: false, stargazers_count: 0, default_branch: 'main' };
  const calls: string[] = [];
  const s = await collect('test', async path => {
    calls.push(path);
    if (path.startsWith('/users/')) return [base, { ...base, id: 2, name: 'secret', private: true },
      { ...base, id: 3, visibility: undefined }, { ...base, id: 4, owner: { login: 'elsewhere' } }];
    if (path.includes('/languages')) return { Java: 42 };
    return [];
  }, new Date(snapshot.generatedAt));
  assert.equal(s.projects.length, 1); assert(!calls.some(p => p.includes('secret')));
  assert.equal(s.since, '2026-01-01T00:00:00.000Z');
});
test('API failure is unknown, while an empty Git repository has zero activity', async () => {
  const repo = { id: 1, name: 'city', private: false, visibility: 'public', owner: { login: 'test' }, default_branch: 'main' };
  const withError = async (status: number) => collect('test', async path => {
    if (path.startsWith('/users/')) return [repo];
    throw new ApiError(status);
  }, new Date(snapshot.generatedAt));
  assert.equal((await withError(403)).projects[0].days, null);
  assert.deepEqual((await withError(409)).projects[0].days, Array(30).fill(0));
  assert.equal((await withError(404)).projects[0].releaseKnown, false);
});
test('listing failure aborts rather than publishing an empty city', async () => {
  await assert.rejects(collect('test', async () => { throw new ApiError(403); }));
});
test('snapshot validation rejects off-site links, duplicate IDs and invalid activity', () => {
  assert.equal(parseSnapshot(snapshot).projects.length, 1);
  for (const change of [{ url: 'javascript:alert(1)' }, { days: [-1] }, { stars: -1 }]) {
    assert.throws(() => parseSnapshot({ ...snapshot, projects: [{ ...project, ...change }] }));
  }
  assert.throws(() => parseSnapshot({ ...snapshot, projects: [project, project] }));
});
test('unknown activity remains distinct from zero; heights are bounded', () => {
  assert.equal(building({ ...project, days: null }).commits, null);
  assert.equal(building(project).commits, 0);
  assert.equal(building({ ...project, days: Array(30).fill(100000) }).floors, 15);
  assert.equal(building(project).crown, 0);
  assert(building({ ...project, release: { tag: 'v1', publishedAt: snapshot.until } }).crown > 0);
});
test('layout is deterministic independent of API ordering', () => {
  const p2 = { ...project, id: 2, name: 'other' };
  assert.deepEqual(layout([p2, project]), layout([project, p2]));
});
test('SVG escapes untrusted repository names and has no executable content', () => {
  const svg = renderPreview({ ...snapshot, projects: [{ ...project, name: '<script>&"' }] });
  assert(svg.includes('&lt;script&gt;&amp;&quot;')); assert(!svg.includes('<script>'));
  assert(!svg.includes('foreignObject')); assert(!svg.includes('href='));
});
test('API credentials only use fixed GitHub host and reject redirects', async () => {
  let options: RequestInit | undefined;
  const api = client('test-secret', (async (url, init) => {
    assert.equal(url, 'https://api.github.com/test'); options = init;
    return new Response('[]', { status: 200 });
  }) as typeof fetch);
  await api('/test'); assert.equal(options?.redirect, 'error');
  await assert.rejects(api('//evil.example/path'));
});
