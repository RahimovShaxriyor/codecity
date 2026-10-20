import type { Project, Snapshot } from '../src/model.ts';

type Fetch = typeof fetch;
export class ApiError extends Error {
  status: number;
  constructor(status: number) { super(`GitHub API returned HTTP ${status}`); this.status = status; }
}
export function client(token?: string, request: Fetch = fetch) {
  return async (path: string) => {
    // No arbitrary hosts or URLs: credentials can only reach api.github.com.
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await request(`https://api.github.com${path}`, {
        headers: {
          Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(20000),
        redirect: 'error',
      });
      if (response.ok) return response.json();
      if (response.status >= 500 && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
        continue;
      }
      throw new ApiError(response.status);
    }
    throw new Error('GitHub API unavailable');
  };
}
type Api = ReturnType<typeof client>;
export async function paginate(api: Api, path: string): Promise<any[]> {
  const result: any[] = [];
  for (let page = 1; page <= 1000; page++) {
    const batch = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error('Invalid paginated response');
    result.push(...batch);
    if (batch.length < 100) return result;
  }
  throw new Error('Pagination limit exceeded; refusing incomplete data');
}
export function activity(commits: any[], since: string, until: string) {
  const start = Date.parse(since), end = Date.parse(until);
  const days = Array<number>(30).fill(0), seen = new Set<string>();
  for (const c of commits) {
    const time = Date.parse(c.commit?.committer?.date);
    if (!c.sha || !Number.isFinite(time)) throw new Error('Invalid commit data');
    if (seen.has(c.sha) || time < start || time >= end) continue;
    seen.add(c.sha);
    days[Math.floor((time - start) / 86400000)]++;
  }
  return days;
}
export async function collect(owner: string, api: Api, now = new Date()): Promise<Snapshot> {
  if (!/^[a-z\d-]{1,39}$/i.test(owner)) throw new Error('Invalid GitHub login');
  // Thirty complete UTC days, avoids misleading partially completed days.
  const until = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const since = new Date(Date.parse(until) - 30 * 86400000).toISOString();
  const repos = await paginate(api, `/users/${owner}/repos?type=owner&sort=full_name`);
  const projects: Project[] = [];
  for (const repo of repos) {
    // Fail closed even if a future endpoint change exposes private repositories.
    if (repo.private !== false || repo.visibility !== 'public' ||
        repo.owner?.login?.toLowerCase() !== owner.toLowerCase()) continue;
    const prefix = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}`;
    let days: number[] | null = null;
    try {
      const commits = await paginate(api, `${prefix}/commits?sha=${encodeURIComponent(repo.default_branch)}&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`);
      days = activity(commits, since, until);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) days = Array(30).fill(0);
      else console.warn(`Activity unavailable for public repo ${repo.name}`);
    }
    let languages: string[] | null = null;
    try { languages = Object.keys(await api(`${prefix}/languages`)); }
    catch { console.warn(`Languages unavailable for public repo ${repo.name}`); }
    let release: Project['release'] = null, releaseKnown = false;
    try {
      const releases = await paginate(api, `${prefix}/releases`);
      const latest = releases.filter(r => !r.draft && r.published_at)
        .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at))[0];
      release = latest ? { tag: latest.tag_name, publishedAt: latest.published_at } : null;
      releaseKnown = true;
    } catch { console.warn(`Releases unavailable for public repo ${repo.name}`); }
    projects.push({
      id: repo.id, name: repo.name, url: `https://github.com/${owner}/${repo.name}`,
      description: repo.description, language: repo.language, languages,
      topics: repo.topics ?? [], fork: repo.fork, archived: repo.archived,
      stars: repo.stargazers_count, days, release, releaseKnown,
    });
  }
  return { version: 1, owner, generatedAt: now.toISOString(), since, until, projects };
}
