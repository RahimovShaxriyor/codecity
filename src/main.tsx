import { StrictMode, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { building, colorFor, parseSnapshot, type Snapshot } from './model.ts';
import './style.css';

const City = lazy(() => import('./City.tsx'));
function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [day, setDay] = useState(false);
  const [lite, setLite] = useState(() => matchMedia('(max-width: 760px), (prefers-reduced-motion: reduce)').matches);
  const [reset, setReset] = useState(0);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('All');
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    fetch(`${import.meta.env.BASE_URL}city.json`, { signal: controller.signal, cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error('Snapshot unavailable'); return r.json(); })
      .then(parseSnapshot).then(setData)
      .catch(e => { if (e.name !== 'AbortError') setError('The public city snapshot could not be loaded. Please retry.'); });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelected(null); setHelp(false); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  const projects = data?.projects ?? [];
  const project = projects.find(p => p.id === selected);
  const languages = [...new Set(projects.map(p => p.language).filter((l): l is string => !!l))].sort();
  const visible = projects.filter(p => (language === 'All' || p.language === language) && `${p.name} ${p.description ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const known = projects.filter(p => p.days !== null);
  const commits = known.reduce((sum, p) => sum + (building(p).commits ?? 0), 0);
  const stale = data && Date.now() - Date.parse(data.generatedAt) > 48 * 3600000;
  const detail = project && building(project);
  return <div className={`app ${day ? 'day' : ''}`}>
    <a className="skip" href="#projects">Skip to projects</a>
    <header>
      <a className="brand" href="#" aria-label="CODECITY home"><svg width="27" height="28" viewBox="0 0 27 28" aria-hidden="true"><path d="M2 26V12h6v14m4 0V2h6v24m4 0V9h4v17" fill="none" stroke="currentColor" strokeWidth="2"/></svg>CODECITY<span className="brand-dot">®</span></a>
      <nav aria-label="Main navigation"><a className="active" href="#city">The city</a><a href="#projects">Projects</a><a href="#architect">The architect</a></nav>
      <a className="github-link" href="https://github.com/RahimovShaxriyor" target="_blank" rel="noreferrer">GitHub <span>↗</span></a>
    </header>
    <main>
      <section className="intro" id="city">
        <div><p className="eyebrow"><span className="status-dot" /> A LIVING DEVELOPER UNIVERSE</p><h1>Code becomes<span> a city.</span></h1></div>
        <div className="intro-note"><p>Every repository, a building.<br/>Every commit, a little more light.</p><span>THE PUBLIC WORLD OF SHAXRIYOR RAKHIMOV</span></div>
      </section>
      <section className="observatory" aria-label="Interactive city explorer">
        <div className="scene-top"><div><span className="micro">DISTRICT 01 / PUBLIC REPOSITORIES</span><h2>Rakhimov City <span>↗</span></h2></div><span className="snapshot-label"><i />{data ? (stale ? 'OLDER SNAPSHOT' : 'GITHUB SNAPSHOT') : 'CONNECTING'}</span></div>
        {data && projects.length > 0 ? <Suspense fallback={<div className="loading">Constructing your city…</div>}><City projects={data.projects} selected={selected} onSelect={setSelected} day={day} lite={lite} reset={reset}/></Suspense> :
          <div className="loading" role="status">{error ? <><p>{error}</p><button onClick={() => setAttempt(n => n + 1)}>Retry</button></> : data ? 'No public repositories yet. Your first building starts with your first public repository.' : 'Reading the public GitHub snapshot…'}</div>}
        <div className="compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 60 60"><path d="M30 7L38 36L30 30L22 36Z" fill="currentColor"/><circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeOpacity=".3"/></svg><span>PUBLIC / OPEN SOURCE</span></div>
        {project && detail && <aside className="project-panel" aria-label={`Project ${project.name}`}>
          <div className="panel-top"><span className="micro">BUILDING / {String(projects.indexOf(project) + 1).padStart(2, '0')}</span><button aria-label="Close project details" onClick={() => setSelected(null)}>×</button></div>
          <span className="project-language" style={{ color: colorFor(project.language) }}>{project.language ?? 'Unspecified language'}</span>
          <h3>{project.name}</h3><p>{project.description || 'This repository has no public description yet.'}</p>
          <div className="tags">{(project.languages ?? []).map(l => <span key={l}>{l}</span>)}{project.topics.map(t => <span key={`t-${t}`}>{t}</span>)}</div>
          <dl><div><dt>Commits / 30 days</dt><dd>{detail.commits ?? 'Unavailable'}</dd></div><div><dt>Active days</dt><dd>{detail.litDays ?? 'Unavailable'}</dd></div><div><dt>Latest release</dt><dd>{project.release?.tag ?? (project.releaseKnown ? 'No releases' : 'Unavailable')}</dd></div></dl>
          <a className="solid-button" href={project.url} target="_blank" rel="noreferrer">Explore repository <span>↗</span></a>
        </aside>}
        <div className="scene-bottom"><div className="gesture-hint"><span className="crosshair">⌖</span><span>Drag to orbit · Scroll to zoom<br/><b>Select a building to explore</b></span></div>
          <div className="scene-controls">
            <button aria-pressed={day} onClick={() => setDay(v => !v)}>{day ? '☀ Day' : '☾ Night'}</button>
            <button aria-pressed={lite} onClick={() => setLite(v => !v)}>Lite {lite ? 'on' : 'off'}</button>
            <button onClick={() => { setSelected(null); setReset(n => n + 1); }} aria-label="Reset camera">↺ <span className="reset-label">Reset</span></button>
          </div>
        </div>
      </section>
      <div className="city-meta">
        <div className="legend"><span className="micro">CITY PALETTE</span>{languages.map(l => <span key={l}><i style={{ background: colorFor(l) }}/>{l}</span>)}</div>
        <button className="text-button" aria-expanded={help} onClick={() => setHelp(v => !v)}>How to read the city <span>{help ? '−' : '+'}</span></button>
      </div>
      {help && <div className="explanation"><p><strong>One building, one public repository.</strong> Height grows logarithmically with 30-day commits, capped at 15 floors. Every three floors add a band of 30 windows per facade: one per complete UTC day. The first band lights at 1 commit/day, the second at 2, up to 5. Days read left to right, bottom to top within each band. Brightness increases up to 8 commits/day. Gray means unknown.</p><p>A release adds a tiered crown; its tag determines the number of tiers. Languages determine accent colors. Counts cover all authors on the default branch, including merge commits and fork history. They are not personal contribution totals. Data refreshes daily, not live.</p></div>}
      <section className="summary" aria-label="Verified snapshot metrics">
        <div><span className="micro">PUBLIC BUILDINGS</span><strong>{data ? projects.length.toString().padStart(2, '0') : '—'}<small>repositories</small></strong></div>
        <div><span className="micro">CITY ACTIVITY / 30 DAYS</span><strong>{data && known.length ? commits : '—'}<small>{known.length === projects.length ? 'commits' : `commits · ${known.length}/${projects.length} known`}</small></strong></div>
        <div><span className="micro">LANGUAGE DISTRICTS</span><strong>{data ? languages.length.toString().padStart(2, '0') : '—'}<small>primary languages</small></strong></div>
        <div className="update"><span className="micro">{stale ? 'SNAPSHOT MAY BE OUTDATED' : 'LAST SYNCHRONIZED'}</span><p>{data ? new Date(data.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : 'Awaiting data'}</p><a href={`${import.meta.env.BASE_URL}city.json`}>Inspect public data ↗</a></div>
      </section>
      <section id="projects" className="directory">
        <div className="section-heading"><div><p className="eyebrow">THE BUILDING DIRECTORY</p><h2>Behind every skyline,<br/><span>something being built.</span></h2></div><p>Explore the source.<br/>Follow the ideas.</p></div>
        <div className="filters"><label><span className="sr-only">Search projects</span><input type="search" placeholder="Search the city…" value={query} onChange={e => setQuery(e.target.value)}/></label><label><span className="sr-only">Filter by language</span><select value={language} onChange={e => setLanguage(e.target.value)}><option>All</option>{languages.map(l => <option key={l}>{l}</option>)}</select></label><span className="micro" aria-live="polite">{visible.length} BUILDINGS</span></div>
        <div className="project-grid">{visible.map((p, i) => <article className={selected === p.id ? 'project-card chosen' : 'project-card'} key={p.id}>
          <div className="card-kicker"><span>{String(i + 1).padStart(2, '0')} / <i style={{ background: colorFor(p.language) }}/>{p.language ?? 'Other'}</span><span>{p.archived ? 'ARCHIVED' : p.fork ? 'FORK' : 'PUBLIC'}</span></div>
          <h3>{p.name}</h3><p>{p.description || 'An open-source building in the city. Explore the repository to discover the project.'}</p>
          <div className="card-bottom"><button onClick={() => { setSelected(p.id); document.getElementById('city')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}>Locate in city ↗</button><a href={p.url} target="_blank" rel="noreferrer" aria-label={`Open ${p.name} on GitHub`}>Source ↗</a></div>
        </article>)}</div>
        {data && !visible.length && <p className="empty" role="status">No buildings match this search.</p>}
      </section>
      <section className="architect" id="architect"><div><p className="eyebrow">MEET THE ARCHITECT</p><h2>Shaxriyor<br/><span>Rakhimov.</span></h2></div><div><p className="bio">Backend-focused software engineer.<br/>Building systems that make things happen.</p><p>Java & Spring Boot · React & TypeScript<br/>Python · PostgreSQL · Docker</p><div className="contact"><a href="mailto:rahimov55shah@gmail.com">Let’s build something ↗</a><a href="https://t.me/raximovshaxriyor" target="_blank" rel="noreferrer">Telegram ↗</a></div></div></section>
    </main>
    <footer><span>CODECITY <span className="muted">/ A living developer universe</span></span><span>Built from public code. Made to be explored.</span><a href="#city">Back to the skyline ↑</a></footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
