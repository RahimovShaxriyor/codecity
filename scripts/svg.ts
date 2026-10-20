import { layout, type Snapshot } from '../src/model.ts';

export function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
}
export function renderPreview(snapshot: Snapshot) {
  const blocks = layout(snapshot.projects);
  const scale = Math.min(24, 560 / Math.max(12, Math.sqrt(blocks.length) * 6.8));
  const project = (x: number, y: number, z: number) => [800 + (x - z) * scale, 310 + (x + z) * scale * .45 - y * scale];
  const polygon = (pts: number[][], fill: string, stroke = '#426859') =>
    `<polygon points="${pts.map(p => p.map(n => n.toFixed(2)).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width=".7"/>`;
  let city = '';
  const span = Math.max(7, Math.ceil(Math.sqrt(blocks.length)) * 1.7 + 1);
  city += polygon([project(-span, -.3, -span), project(span, -.3, -span), project(span, -.3, span), project(-span, -.3, span)], '#10252b');
  for (let i = -span; i <= span; i += 1.7) {
    const a = project(i, 0, -span), b = project(i, 0, span), c = project(-span, 0, i), d = project(span, 0, i);
    city += `<path d="M${a}L${b}M${c}L${d}" stroke="#27433f" stroke-width=".6"/>`;
  }
  for (const b of [...blocks].sort((a, b) => a.x + a.z - b.x - b.z)) {
    const { x, z, height: h, color, project: p } = b;
    const box = (y: number, height: number, width: number) => {
      const a = x - width / 2, c = x + width / 2, d = z - width / 2, e = z + width / 2;
      return polygon([project(a, y, e), project(c, y, e), project(c, y + height, e), project(a, y + height, e)], '#23404b', color) +
        polygon([project(c, y, d), project(c, y, e), project(c, y + height, e), project(c, y + height, d)], '#142a37', color) +
        polygon([project(a, y + height, d), project(c, y + height, d), project(c, y + height, e), project(a, y + height, e)], '#335650', color);
    };
    city += `<g><title>${escapeXml(p.name)}</title>${box(0, h, 1.8)}`;
    for (let i = 0; i < 30 * b.bands; i++) {
      const u = (i % 5 - 2) * .29;
      const y = .23 + (Math.floor(i / 5) + .5) * (h - .35) / (6 * b.bands);
      const n = p.days?.[i % 30];
      const on = n !== undefined && n > Math.floor(i / 30);
      const fill = n === undefined ? '#68727d' : on ? color : '#304650';
      for (const face of [0, 1]) {
        const a = face === 0 ? project(x + u, y, z + .91) : project(x + .91, y, z + u);
        city += `<rect x="${a[0].toFixed(2)}" y="${a[1].toFixed(2)}" width="2.4" height="1.8" fill="${fill}" opacity="${on ? .55 + Math.min(8, n) / 8 * .45 : 1}"/>`;
      }
    }
    for (let k = 0; k < b.crown; k++) city += box(h + k * .24, .24, 1.35 - k * .2);
    city += '</g>';
  }
  const known = snapshot.projects.filter(p => p.days !== null);
  const count = known.reduce((sum, p) => sum + p.days!.reduce((a, b) => a + b, 0), 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520" viewBox="0 0 1200 520" role="img" aria-labelledby="title desc">
  <title id="title">CODECITY — ${escapeXml(snapshot.owner)}'s public developer universe</title>
  <desc id="desc">${snapshot.projects.length} public repository buildings. ${known.length} repositories with known activity. ${count} observed default-branch commits over thirty complete UTC days. Open the interactive site to explore.</desc>
  <defs><radialGradient id="atmosphere"><stop stop-color="#21463d" stop-opacity=".6"/><stop offset="1" stop-color="#080f17" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="520" rx="16" fill="#080f17"/><ellipse cx="820" cy="290" rx="360" ry="230" fill="url(#atmosphere)"/>
  <g font-family="Arial,sans-serif"><path d="M44 62V43h7v19m6 0V31h7v31m6 0V39h7v23" stroke="#b3f8d2" stroke-width="2" fill="none"/><text x="92" y="54" font-size="22" fill="#eaf1ef" font-weight="700" letter-spacing="1">CODECITY</text>
  <text x="44" y="142" fill="#b3f8d2" font-size="10" letter-spacing="3">A LIVING DEVELOPER UNIVERSE</text>
  <text x="40" y="207" font-size="58" fill="#eaf1ef" font-weight="700" letter-spacing="-3">Code becomes</text><text x="40" y="271" font-size="58" fill="#b3f8d2" font-weight="700" letter-spacing="-3">a city.</text>
  <text x="44" y="316" fill="#9aacae" font-size="15">Every repository, a building.</text><text x="44" y="339" fill="#9aacae" font-size="15">Every commit, a little more light.</text>
  <rect x="44" y="374" width="200" height="44" rx="5" fill="#b3f8d2"/><text x="64" y="401" fill="#10241c" font-size="13" font-weight="700">EXPLORE THE CITY ↗</text>
  ${city}
  <path d="M44 456H1156" stroke="#25353b"/><text x="44" y="486" fill="#9aacae" font-size="11">${escapeXml(snapshot.owner)} / ${snapshot.projects.length} PUBLIC BUILDINGS</text>
  <text x="1156" y="486" fill="#9aacae" font-size="10" text-anchor="end">SNAPSHOT ${escapeXml(snapshot.generatedAt.slice(0, 16).replace('T', ' '))} UTC · ${count} COMMITS${known.length < snapshot.projects.length ? ' (PARTIAL COVERAGE)' : ''}</text>
  </g></svg>`;
}
