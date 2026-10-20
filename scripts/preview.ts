import { readFile, writeFile } from 'node:fs/promises';
import { parseSnapshot } from '../src/model.ts';
import { renderPreview } from './svg.ts';

const snapshot = parseSnapshot(JSON.parse(await readFile('public/city.json', 'utf8')));
await writeFile('public/city-preview.svg', renderPreview(snapshot));
const site = new URL(process.env.SITE_URL || `https://${snapshot.owner.toLowerCase()}.github.io/codecity/`);
if (site.protocol !== 'https:') throw new Error('SITE_URL must use HTTPS');
if (!site.pathname.endsWith('/')) site.pathname += '/';
const profile = `<!-- CODECITY profile README. Copy to ${snapshot.owner}/${snapshot.owner}/README.md after Pages deployment. -->

[![CODECITY — a living city built from my public repositories](${site.href}city-preview.svg)](${site.href})

### Shaxriyor Rakhimov

Backend-focused software engineer. I build across the stack, from the database to the interface.

**Java / Spring Boot · React / TypeScript · Python · PostgreSQL · Docker**

My public code has an address. Each building in **CODECITY** is a repository. Its windows light up with real default-branch activity; releases reshape the skyline.

**[Enter the city ↗](${site.href})** · [Explore the source](https://github.com/${snapshot.owner}) · [Telegram](https://t.me/raximovshaxriyor) · [Email](mailto:rahimov55shah@gmail.com)

<details>
<summary>How this city stays alive</summary>

GitHub Actions rebuilds the city daily from public repositories only. Height reflects commits over the last 30 complete UTC days. Each facade maps those days to windows; brightness reflects daily activity. Release tags shape roof crowns.

Counts include all authors and merges on default branches, including fork history. Unknown data is marked unavailable. This is a dated snapshot, not a live contribution counter. GitHub may cache this preview.

</details>
`;
await writeFile('PROFILE.md', profile);
// Also available at the deployed site for downloading the correctly configured README.
await writeFile('public/PROFILE.md', profile);
console.log('Generated SVG preview and profile README.');
