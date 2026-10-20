import { mkdir, writeFile, rename } from 'node:fs/promises';
import { collect, client } from './github.ts';
import { parseSnapshot } from '../src/model.ts';

const owner = process.env.GITHUB_USER || 'RahimovShaxriyor';
const snapshot = parseSnapshot(await collect(owner, client(process.env.GITHUB_TOKEN)));
await mkdir('public', { recursive: true });
await writeFile('public/city.json.tmp', JSON.stringify(snapshot, null, 2) + '\n');
await rename('public/city.json.tmp', 'public/city.json');
console.log(`Collected ${snapshot.projects.length} public repositories; ${snapshot.projects.filter(p => p.days !== null).length} with activity data.`);
