export type Project = {
  id: number;
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  languages: string[] | null;
  topics: string[];
  fork: boolean;
  archived: boolean;
  stars: number;
  days: number[] | null;
  release: { tag: string; publishedAt: string } | null;
  releaseKnown: boolean;
};
export type Snapshot = {
  version: 1;
  owner: string;
  generatedAt: string;
  since: string;
  until: string;
  projects: Project[];
};
export const palette: Record<string, string> = {
  Java: '#efb783', TypeScript: '#8dbaff', JavaScript: '#e8db8a',
  Python: '#b49ded', HTML: '#f697a6', CSS: '#91e6e3',
};
export function colorFor(language: string | null) {
  return palette[language ?? ''] ?? '#a6f6cb';
}
export function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function building(p: Project) {
  const commits = p.days?.reduce((a, b) => a + b, 0) ?? null;
  const floors = commits === null ? 3 : 3 + Math.min(12, Math.floor(Math.log2(commits + 1) * 2));
  return {
    commits, floors, height: floors * 0.38 + 0.35,
    // Each band maps thirty UTC days. Additional bands represent daily commit thresholds.
    bands: Math.ceil(floors / 3),
    litDays: p.days?.filter(n => n > 0).length ?? null,
    crown: p.release ? 1 + hash(p.release.tag) % 4 : 0,
    color: colorFor(p.language),
  };
}
export function layout(projects: Project[]) {
  const sorted = [...projects].sort((a, b) => a.id - b.id);
  const columns = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  const rows = Math.ceil(sorted.length / columns);
  return sorted.map((project, i) => ({
    project, ...building(project),
    x: (i % columns - (columns - 1) / 2) * 3.4,
    z: (Math.floor(i / columns) - (rows - 1) / 2) * 3.4,
  }));
}
export function parseSnapshot(value: unknown): Snapshot {
  const s = value as Snapshot;
  if (!s || s.version !== 1 || !/^[a-z\d-]{1,39}$/i.test(s.owner) ||
      ![s.generatedAt, s.since, s.until].every(d => typeof d === 'string' && Number.isFinite(Date.parse(d))) ||
      !Array.isArray(s.projects)) throw new Error('Invalid city snapshot');
  const ids = new Set<number>();
  for (const p of s.projects) {
    if (!Number.isSafeInteger(p.id) || ids.has(p.id) || typeof p.name !== 'string' ||
        !p.name || !/^[\w.-]+$/.test(p.name) ||
        p.url !== `https://github.com/${s.owner}/${p.name}` ||
        !Number.isSafeInteger(p.stars) || p.stars < 0 ||
        !(p.description === null || typeof p.description === 'string') ||
        !(p.language === null || typeof p.language === 'string') ||
        !(p.languages === null || Array.isArray(p.languages) && p.languages.every(v => typeof v === 'string')) ||
        !Array.isArray(p.topics) || !p.topics.every(v => typeof v === 'string') ||
        typeof p.fork !== 'boolean' || typeof p.archived !== 'boolean' ||
        typeof p.releaseKnown !== 'boolean' ||
        !(p.release === null || typeof p.release.tag === 'string' && Number.isFinite(Date.parse(p.release.publishedAt))) ||
        !(p.days === null || Array.isArray(p.days) && p.days.length === 30 &&
          p.days.every(n => Number.isSafeInteger(n) && n >= 0))) {
      throw new Error('Invalid project data');
    }
    ids.add(p.id);
  }
  return s;
}
