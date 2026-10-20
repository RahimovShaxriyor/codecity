import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { layout, type Project } from './model.ts';

type Props = {
  projects: Project[]; selected: number | null; day: boolean; lite: boolean;
  reset: number; onSelect: (id: number) => void;
};
export default function City({ projects, selected, day, lite, reset, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const focus = useRef<(id: number | null) => void>(() => {});
  const [error, setError] = useState(false);
  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true, powerPreference: lite ? 'low-power' : 'high-performance' }); }
    catch { setError(true); return; }
    setError(false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1 : 1.75));
    renderer.setClearColor(day ? '#dce8e6' : '#080f17', 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Interactive repository city. Use the project list for keyboard navigation.');
    const scene = new THREE.Scene();
    const blocks = layout(projects);
    const span = Math.max(13, Math.ceil(Math.sqrt(projects.length)) * 3.4 + 3);
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, span * 20);
    const home = new THREE.Vector3(span * .95, span * .85, span * 1.05);
    camera.position.copy(home);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .065;
    controls.minDistance = 5;
    controls.maxDistance = span * 3;
    controls.maxPolarAngle = Math.PI * .46;
    controls.enablePan = false;
    controls.target.set(0, 1, 0);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    scene.add(new THREE.HemisphereLight(day ? '#eaffff' : '#b9d6ed', day ? '#66858e' : '#112033', day ? 2.4 : 1.5));
    const key = new THREE.DirectionalLight('#c0ffe3', day ? 2.5 : 2);
    key.position.set(7, 16, 10); scene.add(key);
    const rim = new THREE.DirectionalLight('#8a8cff', 1.4);
    rim.position.set(-12, 8, -10); scene.add(rim);
    const baseMat = new THREE.MeshStandardMaterial({ color: day ? '#9bb5b5' : '#15232d', roughness: .8, metalness: .35 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(span, .35, span), baseMat);
    base.position.y = -.3; scene.add(base);
    const grid = new THREE.GridHelper(span, Math.round(span / .85), day ? '#6e9b95' : '#315149', day ? '#acc3bf' : '#203731');
    grid.position.y = -.115; scene.add(grid);
    const cube = new THREE.BoxGeometry(1, 1, 1);
    const padMat = new THREE.MeshStandardMaterial({ color: day ? '#b1c8c2' : '#1a3339', metalness: .5, roughness: .6 });
    const picks: THREE.Object3D[] = [];
    const targets = new Map<number, THREE.Vector3>();
    const outlines = new Map<number, THREE.LineSegments>();
    for (const b of blocks) {
      const { project: p, height: h, x, z, color, crown } = b;
      const group = new THREE.Group(); group.position.set(x, 0, z);
      scene.add(group); targets.set(p.id, new THREE.Vector3(x, h * .45, z));
      const pad = new THREE.Mesh(cube, padMat); pad.scale.set(2.7, .16, 2.7); group.add(pad);
      const material = new THREE.MeshStandardMaterial({ color: day ? '#70928c' : '#203944', metalness: .7, roughness: .4 });
      const tower = new THREE.Mesh(cube, material);
      tower.scale.set(1.8, h, 1.8); tower.position.y = h / 2 + .12;
      tower.userData.id = p.id; group.add(tower); picks.push(tower);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.82, h, 1.82)),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: .48 }));
      edges.position.copy(tower.position); group.add(edges); outlines.set(p.id, edges);
      const trimMat = new THREE.MeshBasicMaterial({ color });
      const trim = new THREE.Mesh(cube, trimMat); trim.position.y = h + .15; trim.scale.set(1.88, .035, 1.88); group.add(trim);
      // A band has thirty days; band k lights only when a day has >= k commits.
      const windowCount = 30 * b.bands;
      const windows = new THREE.InstancedMesh(cube, new THREE.MeshBasicMaterial({ color: '#ffffff' }), windowCount * 4);
      const dummy = new THREE.Object3D();
      const off = new THREE.Color(day ? '#5f7a7c' : '#283d47');
      const unknown = new THREE.Color('#68727d');
      const lit = new THREE.Color(color);
      for (let face = 0; face < 4; face++) {
        for (let i = 0; i < windowCount; i++) {
          const col = i % 5, row = Math.floor(i / 5);
          const u = (col - 2) * .29, y = .35 + (row + .5) * (h - .45) / (6 * b.bands);
          dummy.position.set(face === 0 ? u : face === 1 ? .912 : face === 2 ? -u : -.912, y,
            face === 0 ? .912 : face === 1 ? -u : face === 2 ? -.912 : u);
          dummy.rotation.set(0, face * Math.PI / 2, 0);
          dummy.scale.set(.12, Math.min(.17, (h - .45) / (8 * b.bands)), .015); dummy.updateMatrix();
          windows.setMatrixAt(face * windowCount + i, dummy.matrix);
          const n = p.days?.[i % 30];
          windows.setColorAt(face * windowCount + i, n === undefined ? unknown : n <= Math.floor(i / 30) ? off : lit.clone().multiplyScalar(.55 + Math.min(8, n) / 8 * .45));
        }
      }
      group.add(windows);
      if (crown) {
        for (let k = 0; k < crown; k++) {
          const tier = new THREE.Mesh(cube, material);
          tier.scale.set(1.35 - k * .2, .22, 1.35 - k * .2);
          tier.position.y = h + .3 + k * .23; group.add(tier);
          const cap = new THREE.Mesh(cube, trimMat);
          cap.scale.set(1.37 - k * .2, .025, 1.37 - k * .2); cap.position.y = h + .42 + k * .23; group.add(cap);
        }
      }
      // Structural fins are architectural detail, not statistics.
      if (!lite) for (const side of [-1, 1]) {
        const fin = new THREE.Mesh(cube, padMat); fin.scale.set(.08, h, .1);
        fin.position.set(side * .72, h / 2 + .12, .94); group.add(fin);
      }
    }
    const target = new THREE.Vector3(0, 1, 0), position = home.clone();
    let flying = false;
    focus.current = id => {
      const dest = id === null ? undefined : targets.get(id);
      target.copy(dest ?? new THREE.Vector3(0, 1, 0));
      position.copy(dest ? dest.clone().add(new THREE.Vector3(8, 6, 9)) : home);
      for (const [key, outline] of outlines) (outline.material as THREE.LineBasicMaterial).opacity = key === id ? 1 : .48;
      flying = true;
    };
    const cancelFlight = () => { flying = false; };
    controls.addEventListener('start', cancelFlight);
    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    const pointerDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const pointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(picks)[0];
      if (hit) select.current(hit.object.userData.id);
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    const lost = (e: Event) => { e.preventDefault(); setError(true); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const resize = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
    });
    resize.observe(container);
    let frame = 0, previous = 0, visible = true;
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
    observer.observe(container);
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate);
      if (!visible || document.hidden || time - previous < (lite ? 32 : 15)) return;
      const delta = Math.min((time - previous) / 1000, .1); previous = time;
      if (flying) {
        const alpha = reduce.matches ? 1 : 1 - Math.exp(-delta * 5);
        controls.target.lerp(target, alpha); camera.position.lerp(position, alpha);
        if (camera.position.distanceTo(position) < .02) flying = false;
      }
      controls.update(); renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m));
        if (obj instanceof THREE.InstancedMesh) obj.dispose();
      });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      renderer.dispose(); renderer.domElement.remove(); focus.current = () => {};
    };
  }, [projects, day, lite]);
  useEffect(() => { focus.current(selected); }, [selected, projects, day, lite]);
  useEffect(() => { focus.current(null); }, [reset]);
  return <div className="city-canvas" ref={host}>
    {error && <div className="canvas-fallback" role="status"><strong>The city is still here.</strong><p>3D rendering is unavailable on this device. Explore every repository in the project directory below.</p><a href="#projects">Open project directory ↗</a></div>}
  </div>;
}
