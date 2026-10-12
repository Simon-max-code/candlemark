(() => {
if (typeof THREE === 'undefined') return;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, SM = innerWidth < 700;
const mouse = { x: 0, y: 0 };
addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; });
const B = 0x2272E6, L = 0x8FBDF5, D = 0x14378C;

function stage(id, z = 14, fov = 45) {
  const c = document.getElementById(id); if (!c) return null;
  const w = c.parentElement, s = new THREE.Scene(), cam = new THREE.PerspectiveCamera(fov, 1, .1, 100);
  const r = new THREE.WebGLRenderer({ canvas: c, antialias: !SM, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, SM ? 1.5 : 2));
  cam.position.z = z;
  s.add(new THREE.AmbientLight(0xCFE1FF, .8));
  const k = new THREE.PointLight(0xffffff, 1.4, 60); k.position.set(-6, 8, 10); s.add(k);
  const rim = new THREE.PointLight(0x7DB4FF, 1, 60); rim.position.set(8, -3, 6); s.add(rim);
  const st = { s, cam, c, on: true, fns: [], done: false, clock: new THREE.Clock() };
  const rs = () => { const W = w.clientWidth, H = w.clientHeight; r.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); };
  rs(); addEventListener('resize', rs);
  new IntersectionObserver(([e]) => st.on = e.isIntersecting).observe(c);
  (function loop() {
    requestAnimationFrame(loop);
    if (!st.on || (RM && st.done)) return;
    st.done = true;
    const t = st.clock.getElapsedTime();
    st.fns.forEach(f => f(t)); r.render(s, cam);
  })();
  return st;
}
const mat = (c, o = .35) => new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: o });
const dot = (r, c) => new THREE.Mesh(new THREE.SphereGeometry(r, 12, 12), new THREE.MeshBasicMaterial({ color: c }));

/* 1 — MARKETS GLOBE */
(() => {
  const g = stage('mkCanvas', 13); if (!g) return;
  const grp = new THREE.Group(); g.s.add(grp);
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(4, 32, 24), mat(B, .14)));
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(3.92, 32, 24), new THREE.MeshStandardMaterial({ color: 0xEEF5FF, transparent: true, opacity: .9, roughness: .6 })));
  const ll = (a, o) => new THREE.Vector3(4 * Math.cos(a) * Math.cos(o), 4 * Math.sin(a), 4 * Math.cos(a) * Math.sin(o));
  const N = [...Array(24)].map((_, i) => ll(Math.sin(i * 12.9) * .9, i * 2.4));
  N.forEach(p => { const d = dot(.07, B); d.position.copy(p); grp.add(d); });
  const pulses = [];
  for (let i = 0; i < N.length; i++) {
    const a = N[i], b = N[(i * 7 + 5) % N.length]; if (a === b) continue;
    const m = a.clone().add(b).normalize().multiplyScalar(4 + a.distanceTo(b) * .32);
    const c = new THREE.QuadraticBezierCurve3(a, m, b);
    grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(32)), new THREE.LineBasicMaterial({ color: B, transparent: true, opacity: .3 })));
    const p = dot(.06, D); grp.add(p); pulses.push([p, c, i * .17, .12 + (i % 4) * .03]);
  }
  grp.rotation.x = .35;
  g.fns.push(t => {
    grp.rotation.y = t * .12 + mouse.x * 1.2; grp.rotation.x = .35 + mouse.y * .5;
    pulses.forEach(([p, c, o, s]) => p.position.copy(c.getPoint((o + t * s) % 1)));
  });
})();

/* 2 — COPYTRADING NETWORK */
(() => {
  const g = stage('copyCanvas', 12); if (!g) return;
  const root = new THREE.Group(); g.s.add(root);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), new THREE.MeshStandardMaterial({ color: B, emissive: B, emissiveIntensity: .15, roughness: .4 }));
  root.add(core, new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), mat(L, .5)));
  [3.2, 4.1, 5].forEach((r, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(r - .01, r + .01, 96), new THREE.MeshBasicMaterial({ color: B, transparent: true, opacity: .15, side: 2 })); m.rotation.x = Math.PI / 2 + i * .08; root.add(m); });
  const F = [...Array(SM ? 10 : 16)].map((_, i) => {
    const m = dot(.2, i % 3 ? L : D), ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: B, transparent: true, opacity: .25 }));
    const p = dot(.07, B); root.add(m, ln, p);
    return { m, ln, p, r: 3.2 + (i % 3) * .9, o: i * 2.4, sp: .15 + (i % 4) * .04, y: Math.sin(i * 3) * 1.2 };
  });
  root.rotation.x = .4;
  g.fns.push(t => {
    core.rotation.y = t * .5; core.scale.setScalar(1 + Math.sin(t * 2) * .05);
    root.rotation.y = mouse.x * .8; root.rotation.x = .4 + mouse.y * .4;
    F.forEach((f, i) => {
      const a = f.o + t * f.sp;
      f.m.position.set(Math.cos(a) * f.r, f.y, Math.sin(a) * f.r);
      const pos = f.ln.geometry.attributes.position; pos.setXYZ(1, f.m.position.x, f.m.position.y, f.m.position.z); pos.needsUpdate = true;
      f.p.position.copy(f.m.position).multiplyScalar(((t * .5 + i * .13) % 1));
    });
  });
})();

/* 3 — PRICE SURFACE */
(() => {
  const g = stage('terrCanvas', 15, 50); if (!g) return;
  g.cam.position.set(0, 7, 15); g.cam.lookAt(0, 0, 0);
  const geo = new THREE.PlaneGeometry(36, 22, SM ? 36 : 70, SM ? 24 : 44); geo.rotateX(-Math.PI / 2);
  g.s.add(new THREE.Mesh(geo, mat(B, .35)), new THREE.Points(geo, new THREE.PointsMaterial({ color: D, size: .07 })));
  const pos = geo.attributes.position;
  g.fns.push(t => {
    const mx = mouse.x * 30, mz = mouse.y * 18;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x - mx, z - mz);
      pos.setY(i, Math.sin(x * .4 + t) * .8 + Math.cos(z * .5 + t * .8) * .7 + Math.sin((x + z) * .2 + t * .5) * 1.1 + Math.exp(-d * .15) * Math.sin(d - t * 3) * .9);
    }
    pos.needsUpdate = true; g.cam.position.x = mouse.x * 3; g.cam.lookAt(0, 0, 0);
  });
})();

/* 4 — TIER TOWERS */
(() => {
  const g = stage('tierCanvas', 11, 40); if (!g) return;
  g.cam.position.set(0, 4, 11); g.cam.lookAt(0, 2, 0);
  const T = [[1, '$0 + approved KYC', 10, 1], [2, '$10,000', 20, 1], [3, '$25,000', 30, 50], [4, '$35,000', 50, 50], [5, '$50,000', 70, 50]];
  const grp = new THREE.Group(); g.s.add(grp);
  const floor = new THREE.GridHelper(14, 14, 0xA9C8F2, 0xD3E3F8); grp.add(floor);
  const bars = T.map((_, i) => {
    const h = 1.2 + i * 1.1, m = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.3), new THREE.MeshStandardMaterial({ color: L, roughness: .5 }));
    m.position.x = (i - 2) * 2.1; m.userData = { h, i }; m.scale.y = .001; grp.add(m); return m;
  });
  let act = 0; const info = document.getElementById('tierInfo'), btns = [...document.querySelectorAll('#tierBtns button')];
  const set = i => {
    act = i; const [n, dep, wd, mo] = T[i];
    info.innerHTML = `<b>Tier ${n}</b><span>Approved deposits: ${dep}</span><span>Withdraw up to ${wd}% of balance / 30 days</span><span>Max open trades: ${mo}</span>`;
    btns.forEach((b, k) => b.classList.toggle('on', k === i));
  };
  btns.forEach((b, i) => b.onclick = () => set(i)); set(0);
  const ray = new THREE.Raycaster(), v = new THREE.Vector2();
  g.c.addEventListener('pointermove', e => {
    const r = g.c.getBoundingClientRect(); v.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v, g.cam); const h = ray.intersectObjects(bars)[0]; if (h) set(h.object.userData.i);
  });
  g.fns.push(t => {
    grp.rotation.y = Math.sin(t * .3) * .25 + mouse.x * .6;
    bars.forEach((b, i) => {
      const k = b.userData, on = i === act;
      b.scale.y += (k.h * (on ? 1.08 : 1) - b.scale.y) * .06; b.position.y = b.scale.y / 2;
      b.material.color.setHex(on ? B : i < act ? 0x5B9BF0 : L);
    });
  });
})();

/* 5 — LEDGER FLOW */
(() => {
  const g = stage('ledgerCanvas', 13); if (!g) return;
  const P = [...Array(120)].map((_, i) => { const a = i / 120 * Math.PI * 2; return new THREE.Vector3(Math.sin(a) + 2 * Math.sin(2 * a), Math.cos(a) - 2 * Math.cos(2 * a), -Math.sin(3 * a)).multiplyScalar(1.5); });
  const C = new THREE.CatmullRomCurve3(P, true), grp = new THREE.Group(); g.s.add(grp);
  const tg = new THREE.TubeGeometry(C, 200, .14, 8, true);
  grp.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0xBFDBFF, transparent: true, opacity: .8, roughness: .4 })), new THREE.Mesh(tg, mat(B, .25)));
  const n = SM ? 90 : 170, arr = new Float32Array(n * 3);
  const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(arr, 3)), new THREE.PointsMaterial({ color: D, size: .14 }));
  grp.add(pts);
  [0, .25, .5, .75].forEach(u => { const s = dot(.38, B); s.position.copy(C.getPoint(u)); grp.add(s); });
  g.fns.push(t => {
    for (let i = 0; i < n; i++) { const p = C.getPoint((i / n + t * .05) % 1); arr.set([p.x, p.y, p.z], i * 3); }
    pts.geometry.attributes.position.needsUpdate = true;
    grp.rotation.y = t * .15 + mouse.x; grp.rotation.x = mouse.y * .6;
  });
})();
})();
