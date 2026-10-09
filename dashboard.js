/* ============================================================
  MENTORSEDGEPRO — DASHBOARD LOGIC
============================================================ */

/* ============================================================
   SIDEBAR: collapse / mobile drawer
============================================================ */
const dashShell = document.getElementById('dashShell');
const collapseBtn = document.getElementById('collapseBtn');
collapseBtn?.addEventListener('click', ()=> dashShell.classList.toggle('collapsed'));

const mobileNavToggle = document.getElementById('mobileNavToggle');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
mobileNavToggle?.addEventListener('click', ()=> dashShell.classList.add('mobile-open'));
sidebarBackdrop?.addEventListener('click', ()=> dashShell.classList.remove('mobile-open'));

/* ============================================================
   TAB SWITCHING
============================================================ */
const navItems = document.querySelectorAll('.dash-nav-item[data-tab]');
const panels = document.querySelectorAll('.dash-panel');
const topbarTitle = document.getElementById('topbarTitle');
const topbarCrumb = document.getElementById('topbarCrumb');

const titleMap = {
  overview:'Overview', copytrading:'Copytrading', markets:'Markets',
  wallet:'Wallet', transactions:'Transactions', settings:'Settings',
  account:'Account Details', wallets:'Wallets', deposits:'Deposits',
  'mentors-pro':'Pro Mentors', 'market-calendar':'Market Calendar'
};

function activateTab(tab){
  sheet.close();
  navItems.forEach(i=> i.classList.toggle('active', i.dataset.tab === tab));
  panels.forEach(p=> p.classList.toggle('active', p.id === `panel-${tab}`));
  topbarTitle.textContent = titleMap[tab] || tab;
  topbarCrumb.textContent = `Dashboard / ${titleMap[tab] || tab}`;
  dashShell.classList.remove('mobile-open');
  window.scrollTo({ top:0, behavior:'smooth' });
}

navItems.forEach(item=>{
  item.addEventListener('click', (e)=>{
    e.preventDefault();
    activateTab(item.dataset.tab);
  });
});
document.querySelectorAll('[data-tab-link]').forEach(el=>{
  el.addEventListener('click', (e)=>{
    e.preventDefault();
    activateTab(el.dataset.tabLink);
  });
});

document.getElementById('depositMethodGrid')?.addEventListener('click', (e)=>{
  const btn = e.target.closest('.method-card');
  if(!btn) return;
  document.querySelectorAll('#depositMethodGrid .method-card').forEach(c=>c.classList.remove('selected'));
  btn.classList.add('selected');
  document.querySelectorAll('.deposit-details').forEach(p=> p.style.display = p.dataset.panel === btn.dataset.method ? '' : 'none');
});

document.querySelectorAll('.copy-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    navigator.clipboard?.writeText(btn.dataset.copy || '');
    showToast('Copied to clipboard', '');
  });
});

/* ============================================================
   CLOCK LINE
============================================================ */
const clockLine = document.getElementById('clockLine');
function updateClock(){
  if(!clockLine) return;
  const now = new Date();
  const fmt = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  clockLine.textContent = `Here's what's happening with your portfolio — ${fmt} local time`;
}
updateClock();
setInterval(updateClock, 1000);

const MARKETS = { forex:[], stocks:[], crypto:[], indices:[], commodities:[] };

function miniSpark(){ return ''; }

let marketsBody = document.getElementById('marketsBody');
const assetTabs = document.getElementById('assetTabs');
const otName = document.getElementById('otName');
const otSub = document.getElementById('otSub');
const otPrice = document.getElementById('otPrice');
const otDelta = document.getElementById('otDelta');
const otIcon = document.getElementById('otIcon');
const otUnits = document.getElementById('otUnits');
const otAmount = document.getElementById('otAmount');
const otSubmit = document.getElementById('otSubmit');
let currentAsset = 'forex';
let selectedInstrument = null;
let otSide = 'buy';

function renderMarkets(asset){
  marketsBody.innerHTML = '';
  if(!MARKETS[asset].length){
    selectedInstrument = null;
    otSubmit.disabled = true;
    marketsBody.innerHTML = `<tr><td colspan="5" style="color:var(--text-tertiary)">${window.__mkLoaded ? 'No live prices for this market right now.' : '<span class="sk" style="width:100%">&nbsp;</span>'}</td></tr>`;
    return;
  }
  otSubmit.disabled = false;
  MARKETS[asset].forEach((inst)=>{
    const up = inst.chg >= 0;
    const color = up ? '#00E6A0' : '#FF5C6C';
    const tr = document.createElement('tr');
    tr.className = `instrument-row ${up ? 'up' : 'down'}`;
    tr.dataset.sym = inst.sym;
    tr.innerHTML = `<td class="cell-instrument"><div class="instr-icon" style="background:${up?'var(--bull-dim)':'var(--bear-dim)'};color:${color}">${inst.sym.slice(0,2)}</div><div><strong>${inst.sym}</strong><small>${inst.name}</small></div></td>
      <td style="font-family:var(--font-mono)">${inst.price.toLocaleString(undefined,{maximumFractionDigits:4})}</td>
      <td class="pnl ${up?'up':'down'}">${up?'▲':'▼'} ${Math.abs(inst.chg).toFixed(2)}%</td><td>${miniSpark()}</td>
      <td><button class="buy-btn" data-sym="${inst.sym}" data-side="buy">Buy</button> <button class="sell-btn" data-sym="${inst.sym}" data-side="sell">Sell</button></td>`;
    marketsBody.appendChild(tr);
  });
  selectInstrument(MARKETS[asset][0]);
}

function selectInstrument(inst){
  if(!inst) return;
  selectedInstrument = inst;
  document.querySelectorAll('.instrument-row').forEach(r=> r.classList.toggle('selected', r.dataset.sym === inst.sym));
  otName.textContent = inst.sym;
  otSub.textContent = inst.name;
  otPrice.textContent = inst.price.toLocaleString(undefined,{maximumFractionDigits:4});
  const up = inst.chg >= 0;
  otDelta.textContent = `${up?'▲':'▼'} ${Math.abs(inst.chg).toFixed(2)}% today`;
  otDelta.className = `delta ${up?'up':'down'}`;
  otIcon.textContent = inst.sym.slice(0,2);
  otIcon.style.background = up ? 'var(--bull)' : 'var(--bear)';
  updateUnits();
}

function updateUnits(){
  if(!selectedInstrument) return;
  const amt = parseFloat(otAmount.value) || 0;
  otUnits.textContent = (amt / selectedInstrument.price).toLocaleString(undefined,{maximumFractionDigits:4});
  otSubmit.querySelector('span').textContent = `${otSide === 'buy' ? 'Buy' : 'Sell'} ${selectedInstrument.sym}`;
}
otAmount?.addEventListener('input', updateUnits);
document.querySelectorAll('.ot-quick button').forEach(btn=> btn.addEventListener('click', ()=>{ otAmount.value = btn.dataset.amt; updateUnits(); }));

document.getElementById('otBuyToggle').addEventListener('click', function(){
  otSide = 'buy';
  this.classList.add('buy-active'); this.classList.remove('sell-active');
  document.getElementById('otSellToggle').classList.remove('sell-active');
  updateUnits();
});
document.getElementById('otSellToggle').addEventListener('click', function(){
  otSide = 'sell';
  this.classList.add('sell-active'); this.classList.remove('buy-active');
  document.getElementById('otBuyToggle').classList.remove('buy-active');
  updateUnits();
});

marketsBody.addEventListener('click', (e)=>{
  const row = e.target.closest('.instrument-row');
  if(!row) return;
  selectInstrument(MARKETS[currentAsset].find(m=>m.sym===row.dataset.sym));
});

assetTabs.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-asset]');
  if(!btn) return;
  assetTabs.querySelectorAll('button').forEach(b=> b.classList.remove('active'));
  btn.classList.add('active');
  currentAsset = btn.dataset.asset;
  renderMarkets(currentAsset);
});

renderMarkets('forex');

/* ============================================================
   WALLET: method select
============================================================ */
document.querySelectorAll('.method-card').forEach(card=>{
  card.addEventListener('click', ()=>{
    document.querySelectorAll('.method-card').forEach(c=> c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

/* ============================================================
   TOASTS
============================================================ */
const toastStack = document.getElementById('toastStack');
function showToast(title, sub){
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="t-icon"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <div><strong>${title}</strong><p>${sub||''}</p></div>
  `;
  toastStack.appendChild(el);
  requestAnimationFrame(()=> el.classList.add('show'));
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=> el.remove(), 500);
  }, 3800);
}
document.addEventListener('click', (e)=>{
  const trigger = e.target.closest('[data-toast]');
  if(trigger) showToast(trigger.dataset.toast, trigger.dataset.toastSub);
});

const pmBackdrop = document.getElementById('pmBackdrop');
document.getElementById('pmClose').addEventListener('click', ()=> pmBackdrop.classList.remove('show'));
pmBackdrop.addEventListener('click', (e)=>{ if(e.target === pmBackdrop) pmBackdrop.classList.remove('show'); });

/* magnetic buttons (desktop only) */
if(window.matchMedia('(hover: hover)').matches){
  document.querySelectorAll('.magnetic').forEach(btn=>{
    btn.addEventListener('mousemove', (e)=>{
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width/2;
      const y = e.clientY - rect.top - rect.height/2;
      btn.style.transform = `translate(${x*0.15}px, ${y*0.3}px)`;
    });
    btn.addEventListener('mouseleave', ()=>{ btn.style.transform = 'translate(0,0)'; });
  });
}

/* ============================================================
   AMBIENT THREE.JS — balance hero
============================================================ */
(function balanceScene(){
  const canvas = document.getElementById('balanceCanvas');
  if(!canvas || typeof THREE === 'undefined') return;
  const wrap = canvas.parentElement;
  let W = wrap.clientWidth, H = wrap.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 60);
  camera.position.set(0, 0, 14);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);

  scene.add(new THREE.AmbientLight(0x445566, 1.2));
  const key = new THREE.PointLight(0x00E6A0, 1.6, 30);
  key.position.set(-5,3,6); scene.add(key);

  const pCount = 70;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(pCount*3);
  for(let i=0;i<pCount;i++){
    pos[i*3] = (Math.random()-0.5) * 22;
    pos[i*3+1] = (Math.random()-0.5) * 10;
    pos[i*3+2] = (Math.random()-0.5) * 10 - 2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const mat = new THREE.PointsMaterial({ color:0x2C3444, size:0.07, transparent:true, opacity:0.6 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  function resize(){
    W = wrap.clientWidth; H = wrap.clientHeight;
    camera.aspect = W/H; camera.updateProjectionMatrix();
    renderer.setSize(W,H);
  }
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  function animate(){
    const t = clock.getElapsedTime();
    points.rotation.y = t * 0.02;
    points.position.y = Math.sin(t*0.2) * 0.2;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();

document.getElementById('marketsDropdown')?.querySelector('.dd-trigger')
  .addEventListener('click', function(){ this.parentElement.classList.toggle('open'); });

/* drawer: reset state across breakpoints + lock body scroll while open */
const mq = matchMedia('(max-width:980px)');
const syncShell = () => dashShell.classList.remove(mq.matches ? 'collapsed' : 'mobile-open');
mq.addEventListener('change', syncShell); syncShell();
new MutationObserver(() => document.body.classList.toggle('no-scroll', dashShell.classList.contains('mobile-open')))
  .observe(dashShell, { attributes:true, attributeFilter:['class'] });

/* order ticket bottom sheet (mobile) */
const ticket = document.querySelector('.order-ticket');
const otBackdrop = Object.assign(document.createElement('div'), { className:'ot-backdrop' });
document.body.appendChild(otBackdrop);
ticket.insertAdjacentHTML('afterbegin', '<div class="ot-grab"></div>');
const sheet = {
  open(){ if(innerWidth <= 1100){ ticket.classList.add('open'); otBackdrop.classList.add('show'); } },
  close(){ ticket.classList.remove('open'); otBackdrop.classList.remove('show'); }
};
marketsBody.addEventListener('click', e => { if(e.target.closest('.instrument-row')) sheet.open(); });
otBackdrop.addEventListener('click', sheet.close);
ticket.querySelector('.ot-grab').addEventListener('click', sheet.close);
otSubmit.addEventListener('click', sheet.close);