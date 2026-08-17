/* ============================================================
   CANDLEMARK — DASHBOARD LOGIC
============================================================ */

/* ---------- tiny seeded RNG so charts look the same every load ---------- */
function mulberry32(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function walkSeries(n, seed, drift=0.52, vol=1){
  const rnd = mulberry32(seed);
  let v = 50;
  const out = [v];
  for(let i=1;i<n;i++){
    v += (rnd() - (1-drift)) * vol * 6;
    v = Math.max(8, Math.min(92, v));
    out.push(v);
  }
  return out;
}

function pathFromSeries(series, w, h, closeArea=false){
  const n = series.length;
  const step = w / (n-1);
  let d = '';
  series.forEach((val, i)=>{
    const x = i * step;
    const y = h - (val/100)*h;
    d += (i===0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : ` L${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if(closeArea){
    d += ` L${w},${h} L0,${h} Z`;
  }
  return d;
}

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
  wallet:'Wallet', transactions:'Transactions', settings:'Settings'
};

function activateTab(tab){
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

/* ============================================================
   ANIMATED COUNT-UP
============================================================ */
function animateValue(el, target, opts={}){
  const { prefix='$', decimals=2, duration=1400 } = opts;
  const start = performance.now();
  function tick(now){
    const p = Math.min((now-start)/duration, 1);
    const eased = 1 - Math.pow(1-p, 3);
    const val = target * eased;
    el.textContent = prefix + val.toLocaleString('en-US', { minimumFractionDigits:decimals, maximumFractionDigits:decimals });
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const TOTAL_BALANCE = 16698.60;
animateValue(document.getElementById('totalBalance'), TOTAL_BALANCE);
animateValue(document.getElementById('topbarBalanceVal'), 4218.60);
animateValue(document.getElementById('statAvailable'), 4218.60, { decimals:0 });
animateValue(document.getElementById('statInvested'), 12480, { decimals:0 });
animateValue(document.getElementById('statPnl'), 342.18, { prefix:'+$', decimals:2 });

/* ============================================================
   EQUITY CHARTS (hero spark + big chart)
============================================================ */
const heroSeries = walkSeries(24, 7, 0.58, 1.1);
document.getElementById('heroSparkArea').setAttribute('d', pathFromSeries(heroSeries, 320, 120, true));
document.getElementById('heroSparkLine').setAttribute('d', pathFromSeries(heroSeries, 320, 120, false));

const bigSeries = walkSeries(30, 11, 0.56, 1.3);
document.getElementById('bigChartArea').setAttribute('d', pathFromSeries(bigSeries, 600, 260, true));
document.getElementById('bigChartLine').setAttribute('d', pathFromSeries(bigSeries, 600, 260, false));

const revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('in-view');
      const area = entry.target.querySelector('#bigChartArea, .equity-area');
      if(area) area.style.opacity = '1';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold:0.2 });
document.querySelectorAll('.equity-svg, .big-chart-svg').forEach(el=> revealObserver.observe(el));

/* Timeframe tab UI only (visual state) */
document.querySelectorAll('.tf-tabs').forEach(group=>{
  group.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      group.querySelectorAll('button').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

/* ============================================================
   DONUT CHART (allocation)
============================================================ */
(function donut(){
  const segs = document.querySelectorAll('.donut-seg');
  const values = [46, 27, 18, 9]; // must sum ~100
  const C = 2 * Math.PI * 40; // circumference
  let offsetAcc = 0;
  segs.forEach((seg, i)=>{
    const frac = values[i] / 100;
    const dash = frac * C;
    seg.setAttribute('stroke-dasharray', `${dash} ${C-dash}`);
    seg.style.transformOrigin = '50px 50px';
    seg.setAttribute('transform', `rotate(${-90 + (offsetAcc/100)*360} 50 50)`);
    offsetAcc += values[i];
    // animate reveal
    seg.style.strokeDashoffset = dash;
    requestAnimationFrame(()=>{
      setTimeout(()=>{ seg.style.strokeDashoffset = '0'; }, 120*i);
    });
  });
})();

/* ============================================================
   MOCK DATA
============================================================ */
const MENTORS = [
  { name:'M. Okafor', tag:'FX Momentum · 3.2y', hue:158, win:68, ret:184.2, risk:'med', copying:true, alloc:1200 },
  { name:'S. Lindqvist', tag:'Index Swing · 5.1y', hue:38, win:74, ret:96.7, risk:'low', copying:true, alloc:800 },
  { name:'A. Reyes', tag:'Crypto Breakout · 2.4y', hue:210, win:61, ret:212.4, risk:'high', copying:true, alloc:500 },
  { name:'D. Marchetti', tag:'Gold Scalper · 4y', hue:280, win:71, ret:88.1, risk:'low', copying:false },
  { name:'K. Fujimoto', tag:'BTC Trend · 3.6y', hue:340, win:65, ret:143.9, risk:'high', copying:false },
  { name:'J. Adeyemi', tag:'Forex Carry · 6y', hue:20, win:77, ret:64.3, risk:'low', copying:false },
];

const POSITIONS = [
  { sym:'XAU/USD', kind:'GOLD · copied', dir:'long', entry:2378.4, cur:2384.6, seed:1 },
  { sym:'BTC/USD', kind:'BTC · copied', dir:'long', entry:65890, cur:67214, seed:2 },
  { sym:'EUR/USD', kind:'FX · self', dir:'short', entry:1.0861, cur:1.0842, seed:3 },
  { sym:'NAS100', kind:'Index · copied', dir:'long', entry:19042, cur:19208, seed:4 },
  { sym:'AAPL', kind:'Stock · self', dir:'long', entry:172.10, cur:169.44, seed:5 },
  { sym:'ETH/USD', kind:'ETH · copied', dir:'long', entry:3401, cur:3481, seed:6 },
  { sym:'US30', kind:'Index · self', dir:'short', entry:40012, cur:39872, seed:7 },
];

const MARKETS = {
  forex: [
    { sym:'EUR/USD', name:'Euro / US Dollar', price:1.0842, chg:0.18 },
    { sym:'GBP/USD', name:'Pound / US Dollar', price:1.2716, chg:-0.09 },
    { sym:'USD/JPY', name:'Dollar / Yen', price:151.62, chg:-0.31 },
    { sym:'AUD/USD', name:'Aussie / Dollar', price:0.6512, chg:0.24 },
    { sym:'USD/CAD', name:'Dollar / Loonie', price:1.3688, chg:0.11 },
  ],
  stocks: [
    { sym:'AAPL', name:'Apple Inc.', price:169.44, chg:-0.62 },
    { sym:'TSLA', name:'Tesla Inc.', price:342.27, chg:0.68 },
    { sym:'NVDA', name:'NVIDIA Corp.', price:1108.30, chg:1.42 },
    { sym:'MSFT', name:'Microsoft Corp.', price:495.40, chg:0.30 },
    { sym:'AMZN', name:'Amazon.com Inc.', price:262.65, chg:-0.94 },
  ],
  crypto: [
    { sym:'BTC/USD', name:'Bitcoin', price:67214, chg:-1.24 },
    { sym:'ETH/USD', name:'Ethereum', price:3481, chg:2.03 },
    { sym:'SOL/USD', name:'Solana', price:178.20, chg:3.41 },
    { sym:'XRP/USD', name:'Ripple', price:0.612, chg:-0.55 },
  ],
  indices: [
    { sym:'US500', name:'S&P 500', price:5614.2, chg:0.42 },
    { sym:'NAS100', name:'Nasdaq 100', price:19208, chg:0.66 },
    { sym:'US30', name:'Dow Jones', price:39872, chg:0.15 },
    { sym:'UK100', name:'FTSE 100', price:8194.5, chg:-0.22 },
  ],
  commodities: [
    { sym:'XAU/USD', name:'Gold', price:2384.6, chg:0.71 },
    { sym:'XAG/USD', name:'Silver', price:28.44, chg:0.38 },
    { sym:'WTI', name:'Crude Oil WTI', price:78.44, chg:0.58 },
    { sym:'NATGAS', name:'Natural Gas', price:2.31, chg:-1.12 },
  ],
};

/* ============================================================
   RENDER: mentor mini strip (overview)
============================================================ */
function miniSpark(seed, color){
  const s = walkSeries(14, seed, 0.55, 1.4);
  const d = pathFromSeries(s, 240, 60, false);
  return `<svg viewBox="0 0 240 60" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const mentorStrip = document.getElementById('mentorStrip');
MENTORS.filter(m=>m.copying).forEach((m,i)=>{
  const el = document.createElement('div');
  el.className = 'mentor-mini';
  el.innerHTML = `
    <div class="mm-head">
      <div class="mm-avatar" style="background:conic-gradient(from 180deg, hsl(${m.hue} 70% 55%), hsl(${m.hue+60} 70% 50%), hsl(${m.hue} 70% 55%))"></div>
      <div><strong>${m.name}</strong><small>${m.tag}</small></div>
      <span class="mm-risk ${m.risk}">${m.risk} risk</span>
    </div>
    <div class="mm-stats">
      <div><strong style="color:var(--bull)">+${m.ret}%</strong><span>12mo return</span></div>
      <div><strong>${m.win}%</strong><span>win rate</span></div>
      <div><strong>$${m.alloc}</strong><span>your allocation</span></div>
    </div>
    <button class="mm-btn" data-toast="Viewing ${m.name}" data-toast-sub="Opens full mentor profile in the live build.">Manage copy</button>
  `;
  mentorStrip.appendChild(el);
});

/* ============================================================
   RENDER: mentor grid (copytrading tab)
============================================================ */
const mentorGrid = document.getElementById('mentorGrid');
MENTORS.forEach((m,i)=>{
  const el = document.createElement('div');
  el.className = 'mentor-card tilt';
  const color = m.ret > 0 ? '#00E6A0' : '#FF5C6C';
  el.innerHTML = `
    <div class="mc-head">
      <div class="mc-avatar" style="background:conic-gradient(from 180deg, hsl(${m.hue} 70% 55%), hsl(${m.hue+60} 70% 50%), hsl(${m.hue} 70% 55%))"></div>
      <div><strong>${m.name}</strong><small>${m.tag}</small></div>
    </div>
    <div class="mc-spark">${miniSpark(i*13+2, color)}</div>
    <div class="mc-row">
      <div><strong style="color:var(--bull)">+${m.ret}%</strong><span>12mo return</span></div>
      <div><strong>${m.win}%</strong><span>win rate</span></div>
      <div><strong class="mm-risk ${m.risk}" style="padding:2px 8px;">${m.risk}</strong><span>risk level</span></div>
    </div>
    <button class="mm-btn" data-toast="${m.copying ? 'Already copying '+m.name : 'Now copying '+m.name}" data-toast-sub="${m.copying ? 'Manage this copy from Active copies below.' : 'Allocate an amount to start mirroring trades.'}">
      ${m.copying ? 'Copying · Manage' : 'Copy this mentor'}
    </button>
  `;
  mentorGrid.appendChild(el);
});

if(window.matchMedia('(hover: hover)').matches){
  document.querySelectorAll('.tilt').forEach(card=>{
    card.addEventListener('mousemove', (e)=>{
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(700px) rotateX(${(-y*4).toFixed(2)}deg) rotateY(${(x*4).toFixed(2)}deg) translateY(-3px)`;
    });
    card.addEventListener('mouseleave', ()=>{ card.style.transform = ''; });
  });
}

/* ============================================================
   RENDER: active copies (copytrading tab)
============================================================ */
const activeCopies = document.getElementById('activeCopies');
MENTORS.filter(m=>m.copying).forEach(m=>{
  const el = document.createElement('div');
  el.className = 'ac-row';
  el.innerHTML = `
    <div class="mm-avatar" style="background:conic-gradient(from 180deg, hsl(${m.hue} 70% 55%), hsl(${m.hue+60} 70% 50%), hsl(${m.hue} 70% 55%))"></div>
    <div class="ac-info"><strong>${m.name}</strong><small>${m.tag}</small></div>
    <div class="ac-alloc"><strong style="font-family:var(--font-mono)">$${m.alloc.toLocaleString()}</strong><span>allocated</span></div>
    <div class="ac-actions">
      <button class="pill-toggle pause" data-toast="Copying paused" data-toast-sub="${m.name} won't open new trades until resumed.">Pause</button>
      <button class="pill-toggle stop" data-toast="Copying stopped" data-toast-sub="Open positions from ${m.name} remain until closed.">Stop</button>
    </div>
  `;
  activeCopies.appendChild(el);
});

/* ============================================================
   RENDER: positions table (overview)
============================================================ */
const positionsBody = document.getElementById('positionsBody');
function renderPositions(){
  positionsBody.innerHTML = '';
  POSITIONS.forEach(p=>{
    const pnl = ((p.cur - p.entry) / p.entry) * 100 * (p.dir==='short' ? -1 : 1);
    const up = pnl >= 0;
    const color = up ? '#00E6A0' : '#FF5C6C';
    const tr = document.createElement('tr');
    tr.dataset.sym = p.sym;
    tr.innerHTML = `
      <td class="cell-instrument">
        <div class="instr-icon" style="background:${up?'var(--bull-dim)':'var(--bear-dim)'};color:${color}">${p.sym.slice(0,2)}</div>
        <div><strong>${p.sym}</strong><small>${p.kind}</small></div>
      </td>
      <td><span class="tag-dir ${p.dir}">${p.dir}</span></td>
      <td style="font-family:var(--font-mono)">${p.entry.toLocaleString(undefined,{maximumFractionDigits:4})}</td>
      <td style="font-family:var(--font-mono)" class="cur-cell">${p.cur.toLocaleString(undefined,{maximumFractionDigits:4})}</td>
      <td class="pnl ${up?'up':'down'} pnl-cell">${up?'+':''}${pnl.toFixed(2)}%</td>
      <td>${miniSpark(p.seed, color).replace('<svg ', '<svg class="mini-spark" ')}</td>
      <td><button class="row-close-btn" data-toast="Position closed" data-toast-sub="${p.sym} settled at market — proceeds added to balance.">Close</button></td>
    `;
    positionsBody.appendChild(tr);
  });
}
renderPositions();

/* Live-ish price flicker on positions every few seconds */
setInterval(()=>{
  POSITIONS.forEach(p=>{
    const drift = (Math.random()-0.5) * (p.cur * 0.0016);
    p.cur = Math.max(0.0001, p.cur + drift);
  });
  document.querySelectorAll('#positionsBody tr').forEach((tr, i)=>{
    const p = POSITIONS[i];
    const pnl = ((p.cur - p.entry) / p.entry) * 100 * (p.dir==='short' ? -1 : 1);
    const up = pnl >= 0;
    const curCell = tr.querySelector('.cur-cell');
    const pnlCell = tr.querySelector('.pnl-cell');
    curCell.textContent = p.cur.toLocaleString(undefined,{maximumFractionDigits:4});
    pnlCell.textContent = `${up?'+':''}${pnl.toFixed(2)}%`;
    pnlCell.className = `pnl ${up?'up':'down'} pnl-cell`;
    tr.classList.remove('flash-up','flash-down');
    void tr.offsetWidth;
    tr.classList.add(up ? 'flash-up' : 'flash-down');
  });
}, 3200);

/* ============================================================
   RENDER: markets table + order ticket
============================================================ */
const marketsBody = document.getElementById('marketsBody');
const assetTabs = document.getElementById('assetTabs');
let currentAsset = 'forex';
let selectedInstrument = null;

function renderMarkets(asset){
  marketsBody.innerHTML = '';
  MARKETS[asset].forEach((inst, i)=>{
    const up = inst.chg >= 0;
    const color = up ? '#00E6A0' : '#FF5C6C';
    const tr = document.createElement('tr');
    tr.className = 'instrument-row';
    tr.dataset.sym = inst.sym;
    tr.innerHTML = `
      <td class="cell-instrument">
        <div class="instr-icon" style="background:${up?'var(--bull-dim)':'var(--bear-dim)'};color:${color}">${inst.sym.slice(0,2)}</div>
        <div><strong>${inst.sym}</strong><small>${inst.name}</small></div>
      </td>
      <td style="font-family:var(--font-mono)">${inst.price.toLocaleString(undefined,{maximumFractionDigits:4})}</td>
      <td class="pnl ${up?'up':'down'}">${up?'▲':'▼'} ${Math.abs(inst.chg).toFixed(2)}%</td>
      <td>${miniSpark(i*9+asset.length, color).replace('<svg ', '<svg class="mini-spark" ')}</td>
      <td>
        <button class="buy-btn" data-sym="${inst.sym}" data-side="buy">Buy</button>
        <button class="sell-btn" data-sym="${inst.sym}" data-side="sell">Sell</button>
      </td>
    `;
    marketsBody.appendChild(tr);
  });
  selectInstrument(MARKETS[asset][0], asset);
}

const otName = document.getElementById('otName');
const otSub = document.getElementById('otSub');
const otPrice = document.getElementById('otPrice');
const otDelta = document.getElementById('otDelta');
const otIcon = document.getElementById('otIcon');
const otChartLine = document.getElementById('otChartLine');
const otUnits = document.getElementById('otUnits');
const otAmount = document.getElementById('otAmount');
const otSubmit = document.getElementById('otSubmit');
let otSide = 'buy';

function selectInstrument(inst, asset){
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
  otChartLine.setAttribute('stroke', up ? '#00E6A0' : '#FF5C6C');
  otChartLine.setAttribute('d', pathFromSeries(walkSeries(11, inst.sym.length*7+3, up?0.6:0.42, 1.5), 300, 70, false));
  updateUnits();
}

function updateUnits(){
  if(!selectedInstrument) return;
  const amt = parseFloat(otAmount.value) || 0;
  otUnits.textContent = (amt / selectedInstrument.price).toLocaleString(undefined,{maximumFractionDigits:4});
  otSubmit.querySelector('span').textContent = `${otSide === 'buy' ? 'Buy' : 'Sell'} ${selectedInstrument.sym}`;
}
otAmount?.addEventListener('input', updateUnits);
document.querySelectorAll('.ot-quick button').forEach(btn=>{
  btn.addEventListener('click', ()=>{ otAmount.value = btn.dataset.amt; updateUnits(); });
});

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
  const buyBtn = e.target.closest('.buy-btn');
  const sellBtn = e.target.closest('.sell-btn');
  const row = e.target.closest('.instrument-row');
  if(buyBtn || sellBtn){
    e.stopPropagation();
    const sym = (buyBtn||sellBtn).dataset.sym;
    const inst = MARKETS[currentAsset].find(m=>m.sym===sym);
    selectInstrument(inst, currentAsset);
    if(buyBtn) document.getElementById('otBuyToggle').click(); else document.getElementById('otSellToggle').click();
    showToast(`${buyBtn?'Buy':'Sell'} order placed`, `${sym} · $${otAmount.value} at market price.`);
    return;
  }
  if(row){
    const inst = MARKETS[currentAsset].find(m=>m.sym===row.dataset.sym);
    selectInstrument(inst, currentAsset);
  }
});

otSubmit.addEventListener('click', ()=>{
  showToast(`${otSide === 'buy' ? 'Buy' : 'Sell'} order placed`, `${selectedInstrument.sym} · $${otAmount.value} at market price.`);
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

/* Live-ish price flicker for markets table + order ticket price */
setInterval(()=>{
  Object.values(MARKETS).flat().forEach(inst=>{
    const drift = (Math.random()-0.5) * (inst.price * 0.0012);
    inst.price = Math.max(0.0001, inst.price + drift);
  });
  document.querySelectorAll('#marketsBody tr').forEach((tr, i)=>{
    const inst = MARKETS[currentAsset][i];
    const priceCell = tr.children[1];
    if(priceCell) priceCell.textContent = inst.price.toLocaleString(undefined,{maximumFractionDigits:4});
  });
  if(selectedInstrument){
    otPrice.textContent = selectedInstrument.price.toLocaleString(undefined,{maximumFractionDigits:4});
    updateUnits();
  }
}, 2600);

/* ============================================================
   TRANSACTIONS TABLE
============================================================ */
const TX = [
  { ref:'TX-88421', type:'Copytrade settlement', detail:'M. Okafor · XAU/USD closed', amt:128.40, date:'Aug 17, 2026', status:'completed' },
  { ref:'TX-88390', type:'Stock trade', detail:'Sold AAPL · 3.2 shares', amt:-42.10, date:'Aug 16, 2026', status:'completed' },
  { ref:'TX-88355', type:'Deposit', detail:'Card ending 4471', amt:1000, date:'Aug 15, 2026', status:'completed' },
  { ref:'TX-88301', type:'Copytrade settlement', detail:'S. Lindqvist · NAS100 closed', amt:64.20, date:'Aug 15, 2026', status:'completed' },
  { ref:'TX-88276', type:'Withdrawal', detail:'Crypto · USDT (TRC20)', amt:-320, date:'Aug 12, 2026', status:'completed' },
  { ref:'TX-88240', type:'Forex trade', detail:'Bought EUR/USD · 0.5 lot', amt:-100, date:'Aug 10, 2026', status:'completed' },
  { ref:'TX-88190', type:'Deposit', detail:'Bank transfer', amt:2500, date:'Aug 6, 2026', status:'pending' },
  { ref:'TX-88104', type:'Copytrade settlement', detail:'A. Reyes · BTC/USD closed', amt:-38.60, date:'Aug 3, 2026', status:'completed' },
];
const txBody = document.getElementById('txBody');
TX.forEach(t=>{
  const tr = document.createElement('tr');
  const up = t.amt >= 0;
  tr.innerHTML = `
    <td style="font-family:var(--font-mono);color:var(--text-tertiary)">${t.ref}</td>
    <td>${t.type}</td>
    <td style="color:var(--text-secondary)">${t.detail}</td>
    <td class="pnl ${up?'up':'down'}">${up?'+':'-'}$${Math.abs(t.amt).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
    <td style="color:var(--text-tertiary)">${t.date}</td>
    <td><span class="status-badge ${t.status}">${t.status[0].toUpperCase()+t.status.slice(1)}</span></td>
  `;
  txBody.appendChild(tr);
});

/* ============================================================
   WALLET: method select
============================================================ */
document.querySelectorAll('.method-card').forEach(card=>{
  card.addEventListener('click', ()=>{
    document.querySelectorAll('.method-card').forEach(c=> c.classList.remove('selected'));
    card.classList.add('selected');
  });
});
document.querySelectorAll('#panel-wallet .ot-quick button').forEach(btn=>{
  btn.addEventListener('click', ()=>{ document.getElementById('depositAmount').value = btn.dataset.amt; });
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