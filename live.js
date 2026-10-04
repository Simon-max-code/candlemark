(async () => {
  const $ = (s) => document.querySelector(s);
  const usd = (c) => (Number(c) / 100).toLocaleString('en-US', { style:'currency', currency:'USD' });
  const key = () => api.key();

  // guard: no session -> login
  let me;
  try { me = await api('/auth/me'); } catch { return; }

  // greeting + avatar
  const first = me.name.split(' ')[0];
  const g = $('.dash-greeting h1'); if (g) g.textContent = `Good day, ${first}.`;
  const av = $('.avatar-btn'); if (av) av.textContent = me.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  // balance
  async function loadBalance(){
    const b = await api('/wallet/balance');
    const v = Number(b.available) / 100;
    window.__bal = v;
    for (const id of ['totalBalance','topbarBalanceVal'])
      { const el = document.getElementById(id); if (el) el.textContent = usd(b.available); }
    const sa = document.getElementById('statAvailable'); if (sa) sa.textContent = usd(b.available);
    document.querySelectorAll('#panel-wallet .wcard .val')[0].textContent = usd(b.available);
  }

  // KYC banner
  const kycBox = document.querySelector('.kyc-card');
  if (kycBox) {
    const st = me.kycStatus;
    const map = { NOT_STARTED:['Identity verification — Not started','Complete your profile to enable withdrawals.','Start'],
      PENDING:['Identity verification — In review','Your details were submitted. Review usually completes within 24 hours.','View status'],
      APPROVED:['Identity verification — Approved','Your profile is verified. Withdrawals are enabled.','View'],
      REJECTED:['Identity verification — Not approved','Please contact support.','Contact'] }[st];
    kycBox.querySelector('strong').textContent = map[0];
    kycBox.querySelector('p').textContent = map[1];
    const a = kycBox.querySelector('a'); a.textContent = map[2];
    a.href = st === 'NOT_STARTED' ? 'kyc.html' : '#';
  }

  // account details
  const rows = document.querySelectorAll('#panel-account .toggle-row strong, #panel-account .toggle-row span.status-badge');
  if (rows.length >= 5) {
    rows[0].textContent = me.name; rows[1].textContent = me.email; rows[2].textContent = me.id.slice(-8).toUpperCase();
    rows[4].textContent = me.kycStatus.replace('_',' ').toLowerCase();
  }
  const sf = document.querySelectorAll('#panel-settings .settings-field input');
  if (sf.length >= 3) { sf[0].value = me.name; sf[1].value = me.email; sf[2].value = me.country || ''; }

  // positions
  async function loadPositions(){
    const { items } = await api('/trades?status=OPEN');
    const body = document.getElementById('positionsBody');
    body.innerHTML = items.length ? items.map(p => {
      const up = (p.pnlPct ?? 0) >= 0, color = up ? '#00E6A0' : '#FF5C6C';
      return `<tr data-id="${p.id}">
        <td class="cell-instrument"><div class="instr-icon" style="background:${up?'var(--bull-dim)':'var(--bear-dim)'};color:${color}">${p.sym.slice(0,2)}</div>
          <div><strong>${p.sym}</strong><small>${p.asset}${p.copied ? ' · copied' : ''}</small></div></td>
        <td><span class="tag-dir ${p.dir}">${p.dir}</span></td>
        <td style="font-family:var(--font-mono)">${Number(p.entry)}</td>
        <td style="font-family:var(--font-mono)">${Number(p.cur)}</td>
        <td class="pnl ${up?'up':'down'}">${up?'+':''}${p.pnlPct}%</td>
        <td></td>
        <td><button class="row-close-btn" data-close="${p.id}">Close</button></td></tr>`;
    }).join('') : '<tr><td colspan="7" style="color:var(--text-tertiary);padding:24px">No open positions yet.</td></tr>';
    const cnt = document.querySelector('.stat-row .stat-card:last-child .val');
    if (cnt) cnt.innerHTML = `${items.length} <small>open</small>`;
  }
  document.getElementById('positionsBody').addEventListener('click', async (e) => {
    const id = e.target.closest('[data-close]')?.dataset.close; if (!id) return;
    e.stopImmediatePropagation();
    try { await api(`/trades/${id}/close`, { method:'POST' }); showToast('Position closed', 'Balance updated.'); }
    catch { showToast('Could not close', 'Try again.'); }
    loadPositions(); loadBalance();
  }, true);
  // stop the old interval from overwriting rows with mock prices
  for (let i = 1; i < 9999; i++) clearInterval(i);

  // markets: real list + live prices
  const live = {};
  async function loadMarkets(){
    const { items } = await api('/markets');
    for (const k of Object.keys(MARKETS)) MARKETS[k] = [];
    items.forEach(i => { MARKETS[i.asset].push({ sym:i.sym, name:i.name, price:i.price, chg:i.chg }); live[i.sym] = i; });
    renderMarkets(currentAsset);
  }

  // order ticket -> real trades
  function bindTrade(){
    const submit = async (side) => {
      const amt = otAmount.value;
      try {
        await api('/trades', { method:'POST', headers:{ 'Idempotency-Key': key() },
          body:{ symbol: selectedInstrument.sym, side, amount: String(amt) } });
        showToast(`${side === 'BUY' ? 'Buy' : 'Sell'} order placed`, `${selectedInstrument.sym} · $${amt}`);
        loadPositions(); loadBalance();
      } catch (e) {
        const c = e.data?.error;
        showToast('Order failed', c === 'INSUFFICIENT_FUNDS' ? 'Not enough balance.' : c === 'BELOW_MIN' ? 'Minimum trade is $10.' : 'Try again.');
      }
    };
    const clone = (el) => { const n = el.cloneNode(true); el.replaceWith(n); return n; };
    const sub = clone(document.getElementById('otSubmit'));
    sub.addEventListener('click', () => { submit(document.getElementById('otSellToggle').classList.contains('sell-active') ? 'SELL' : 'BUY'); document.querySelector('.order-ticket').classList.remove('open'); document.querySelector('.ot-backdrop')?.classList.remove('show'); });
    const mb = clone(document.getElementById('marketsBody'));
    mb.addEventListener('click', (e) => {
      const btn = e.target.closest('.buy-btn, .sell-btn'), row = e.target.closest('.instrument-row');
      if (!row) return;
      const inst = MARKETS[currentAsset].find(m => m.sym === row.dataset.sym);
      selectInstrument(inst, currentAsset);
      if (btn) { document.getElementById(btn.classList.contains('buy-btn') ? 'otBuyToggle' : 'otSellToggle').click(); submit(btn.classList.contains('buy-btn') ? 'BUY' : 'SELL'); }
      else if (innerWidth <= 1100) { document.querySelector('.order-ticket').classList.add('open'); document.querySelector('.ot-backdrop')?.classList.add('show'); }
    });
  }

  // websocket prices
  function connectWs(){
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (m) => {
      const { t, p } = JSON.parse(m.data);
      if (t !== 'tick' && t !== 'snapshot') return;
      Object.values(MARKETS).flat().forEach(i => { if (p[i.sym]) i.price = Number(p[i.sym]); });
      document.querySelectorAll('#marketsBody tr').forEach((tr, idx) => {
        const i = MARKETS[currentAsset][idx]; if (i) tr.children[1].textContent = i.price.toLocaleString(undefined, { maximumFractionDigits:4 });
      });
      if (selectedInstrument) { otPrice.textContent = selectedInstrument.price.toLocaleString(undefined, { maximumFractionDigits:4 }); updateUnits(); }
    };
    ws.onclose = () => setTimeout(connectWs, 3000);
  }

  // transactions
  async function loadTx(){
    const { items } = await api('/wallet/ledger?limit=50');
    const names = { DEMO_FUNDING:'Demo funding', DEPOSIT:'Deposit', WITHDRAWAL:'Withdrawal', TRADE_PNL:'Trade', COPY_FEE:'Copy fee', ADJUSTMENT:'Adjustment' };
    document.getElementById('txBody').innerHTML = items.map(r => {
      const up = BigInt(r.amount) >= 0n, abs = r.amount.replace('-','');
      return `<tr><td style="font-family:var(--font-mono);color:var(--text-tertiary)">${r.id.slice(-8).toUpperCase()}</td><td>${names[r.type]}</td>
        <td style="color:var(--text-secondary)">${r.refType || ''}</td>
        <td class="pnl ${up?'up':'down'}">${up?'+':'-'}${usd(abs)}</td>
        <td style="color:var(--text-tertiary)">${new Date(r.createdAt).toLocaleDateString()}</td>
        <td><span class="status-badge completed">Completed</span></td></tr>`;
    }).join('');
  }

  // logout
  document.querySelector('a[href="login.html"]')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await api('/auth/logout', { method:'POST' }).catch(() => {});
    api.setToken(null); location.href = 'login.html';
  });

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
  const hue = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const grad = (h) => `conic-gradient(from 180deg, hsl(${h} 70% 55%), hsl(${h+60} 70% 50%), hsl(${h} 70% 55%))`;
  const errMsg = { INSUFFICIENT_FUNDS:'Not enough balance.', BELOW_MIN:'Amount is below the minimum.', KYC_REQUIRED:'Identity verification must be approved first.',
    SELF_COPY:"You can't copy yourself.", VALIDATION:'Please check the details.', NOT_FOUND:'Not found.' };
  const $$id = (id) => document.getElementById(id);

  // ---------- mentors / copytrading ----------
  let mentors = [], picked = null;
  const card = (m, i) => { const h = hue(m.handle), s = m.stats || {}; return `
    <div class="mentor-card tilt">
      <div class="mc-head"><div class="mc-avatar" style="background:${grad(h)}"></div>
        <div><strong>${esc(m.name)}</strong><small>${esc(m.tag || '@' + m.handle)}</small></div></div>
      <div class="mc-spark">${miniSpark(i * 13 + 2, '#00E6A0')}</div>
      <div class="mc-row">
        <div><strong style="color:var(--bull)">${s.gain != null ? '+' + s.gain + '%' : '—'}</strong><span>Gain</span></div>
        <div><strong>${s.trades != null ? Number(s.trades).toLocaleString() : '—'}</strong><span>Trades</span></div>
        <div><strong>${m.copiers}</strong><span>Copiers</span></div></div>
      <div class="mc-row" style="margin-top:-6px">
        <div><strong>${s.winRate != null ? s.winRate + '%' : '—'}</strong><span>Win rate</span></div>
        <div><strong>${s.capital != null ? '$' + Number(s.capital).toLocaleString() : '—'}</strong><span>Inv. capital</span></div>
        <div><strong>${esc(s.avgTime || '—')}</strong><span>Avg. time</span></div></div>
      <button class="mm-btn" data-copy-mentor="${m.id}">Copy this mentor</button>
    </div>`; };

  function openCopy(e) {
    const b = e.target.closest('[data-copy-mentor]'); if (!b) return;
    const m = picked = mentors.find(x => x.id === b.dataset.copyMentor), s = m.stats || {};
    $$id('pmAvatar').style.background = grad(hue(m.handle));
    $$id('pmName').textContent = m.name; $$id('pmHandle').textContent = '@' + m.handle;
    $$id('pmGain').textContent = s.gain != null ? s.gain + '%' : '—';
    $$id('pmTrades').textContent = s.trades != null ? Number(s.trades).toLocaleString() : '—';
    $$id('pmCapital').textContent = s.capital != null ? '$' + Number(s.capital).toLocaleString() : '—';
    $$id('pmRisk').textContent = m.risk; $$id('pmCopiers').textContent = m.copiers; $$id('pmAvgTime').textContent = s.avgTime || '—';
    const fee = Number(m.fee) / 100;
    document.querySelector('.pm-sub-note').textContent = `$${fee} subscription fee will be deducted from your trading account to follow this leader until the end of the month. Renews automatically on the 1st of next month.`;
    $$id('pmConfirm').querySelector('span').textContent = `Confirm Copy — $${fee}/mo`;
    pmBackdrop.classList.add('show');
  }

  async function loadMentors() {
    mentors = (await api('/copy/mentors')).items;
    const html = mentors.length ? mentors.map(card).join('') : '<p style="color:var(--text-tertiary)">No mentors available yet.</p>';
    for (const id of ['mentorGrid', 'proMentorGrid']) {
      const g = $$id(id), n = g.cloneNode(false); n.innerHTML = html; g.replaceWith(n); n.addEventListener('click', openCopy);
    }
  }

  const pmc = $$id('pmConfirm');
  pmc.insertAdjacentHTML('beforeend', '<div class="ot-field"><label>Allocation (USD, min $50)</label><div class="ot-input-row"><span>$</span><input type="number" id="pmAlloc" value="500" min="50"></div></div>');
  const pmn = pmc.cloneNode(true); pmc.replaceWith(pmn);
  pmn.addEventListener('click', async () => {
    if (!picked) return;
    pmn.disabled = true;
    try {
      await api(`/copy/mentors/${picked.id}/copy`, { method:'POST', body:{ allocation: String($$id('pmAlloc').value) } });
      pmBackdrop.classList.remove('show');
      showToast('Now copying ' + picked.name, 'Their new trades will be mirrored to your account.');
      loadCopies(); loadBalance(); loadTx();
    } catch (e) { showToast('Could not start copying', errMsg[e.data?.error] || 'Try again.'); }
    pmn.disabled = false;
  });

  async function loadCopies() {
    const { items } = await api('/copy');
    $$id('activeCopies').innerHTML = items.length ? items.map(c => `
      <div class="ac-row">
        <div class="mm-avatar" style="background:${grad(hue(c.handle))}"></div>
        <div class="ac-info"><strong>${esc(c.name)}</strong><small>@${esc(c.handle)} · ${c.status.toLowerCase()}</small></div>
        <div class="ac-alloc"><strong style="font-family:var(--font-mono)">$${(Number(c.allocation) / 100).toLocaleString()}</strong><span>allocated</span></div>
        <div class="ac-actions">
          <button class="pill-toggle pause" data-act="${c.status === 'PAUSED' ? 'resume' : 'pause'}" data-id="${c.id}">${c.status === 'PAUSED' ? 'Resume' : 'Pause'}</button>
          <button class="pill-toggle stop" data-act="stop" data-id="${c.id}">Stop</button>
        </div></div>`).join('') : '<p style="color:var(--text-tertiary)">You are not copying anyone yet.</p>';
    $$id('mentorStrip').innerHTML = items.map(c => `
      <div class="mentor-mini"><div class="mm-head"><div class="mm-avatar" style="background:${grad(hue(c.handle))}"></div>
        <div><strong>${esc(c.name)}</strong><small>@${esc(c.handle)}</small></div></div>
        <div class="mm-stats"><div><strong>$${(Number(c.allocation) / 100).toLocaleString()}</strong><span>your allocation</span></div>
        <div><strong>${c.status.toLowerCase()}</strong><span>status</span></div></div></div>`).join('');
  }
  $$id('activeCopies').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    try { await api(`/copy/${b.dataset.id}/${b.dataset.act}`, { method:'POST' }); showToast('Updated', `Copy ${b.dataset.act}d.`.replace('stopd', 'stopped')); }
    catch { showToast('Could not update', 'Try again.'); }
    loadCopies();
  });

  // ---------- deposits (crypto only) ----------
  document.body.insertAdjacentHTML('beforeend', `
    <div class="pm-modal-backdrop" id="mtBackdrop"><div class="pm-modal" style="text-align:center">
      <button class="pm-close" id="mtClose">&times;</button>
      <div style="font-size:34px;margin-bottom:10px">🛠️</div>
      <h2 id="mtTitle" style="font-size:1.1rem;margin-bottom:18px;line-height:1.4"></h2>
      <button class="btn-solid btn-sm" id="mtOk" style="width:100%;justify-content:center"><span>Use cryptocurrency</span></button>
    </div></div>`);
  const mt = $$id('mtBackdrop'), dg = $$id('depositMethodGrid');
  const useCrypto = () => { mt.classList.remove('show'); dg.querySelector('[data-method="crypto"]').click(); };
  $$id('mtClose').onclick = () => mt.classList.remove('show');
  $$id('mtOk').onclick = useCrypto;
  mt.addEventListener('click', (e) => { if (e.target === mt) mt.classList.remove('show'); });
  dg.addEventListener('click', (e) => {
    const b = e.target.closest('.method-card'); if (!b || b.dataset.method === 'crypto') return;
    e.stopImmediatePropagation();
    $$id('mtTitle').textContent = `${b.querySelector('strong').textContent} is currently under maintenance, use cryptocurrency method`;
    mt.classList.add('show');
  }, true);
  dg.querySelector('[data-method="crypto"]').click();

  async function loadDeposits() {
    const rows = document.querySelectorAll('[data-panel="crypto"] .crypto-row');
    try {
      const c = (await api('/wallet/deposit-methods')).crypto || {};
      [c.btc, c.eth, c.usdtTrc20].forEach((v, i) => {
        rows[i].querySelector('.mono').textContent = v || 'Address not available yet';
        rows[i].querySelector('.copy-btn').dataset.copy = v || '';
      });
    } catch { rows.forEach((r) => r.querySelector('.mono').textContent = 'Could not load address'); }
  }
  document.querySelector('[data-tab="deposits"]').addEventListener('click', loadDeposits);

  const proofBtn = document.querySelector('#panel-deposits .btn-solid[data-toast]');
  proofBtn.removeAttribute('data-toast');
  proofBtn.addEventListener('click', async () => {
    const amt = $$id('depositProofAmount').value, f = $$id('depositProofFile').files[0];
    if (!(Number(amt) >= 100) || !f) return showToast('Missing details', 'Enter an amount of at least $100 and attach your proof.');
    const fd = new FormData(); fd.append('amount', String(amt)); fd.append('method', 'crypto'); fd.append('file', f);
    proofBtn.disabled = true;
    try {
      await api('/wallet/deposits', { method:'POST', headers:{ 'Idempotency-Key': key() }, form: fd });
      showToast('Proof submitted', 'Your deposit is pending verification.');
      $$id('depositProofAmount').value = ''; $$id('depositProofFile').value = '';
    } catch (e) { showToast('Upload failed', e.data?.error === 'BAD_FILE_TYPE' ? 'Use a JPG, PNG or PDF.' : e.data?.error === 'FILE_TOO_LARGE' ? 'Max file size is 5MB.' : errMsg[e.data?.error] || 'Try again.'); }
    proofBtn.disabled = false;
  });

  // ---------- withdrawals ----------
  const wp = $$id('panel-wallets');
  const wbtn = wp.querySelector('[data-toast="Withdrawal requested"]');
  document.querySelectorAll('[data-toast="Withdrawal requested"]').forEach(b => b.removeAttribute('data-toast'));
  document.querySelectorAll('[data-toast="Deposit initiated"]').forEach(b => { b.removeAttribute('data-toast'); b.addEventListener('click', () => activateTab('deposits')); });
  wp.querySelector('select').closest('.settings-field').innerHTML = `
    <label>Network</label>
    <select id="wdNetwork" style="width:100%;background:var(--bg-panel-2);border:1px solid var(--line);border-radius:9px;padding:12px 14px;color:var(--text-primary);font-size:13.5px;margin-bottom:12px">
      <option value="BTC">Bitcoin (BTC)</option><option value="USDT_TRC20">USDT (TRC20)</option><option value="ETH_ERC20">Ethereum (ERC20)</option></select>
    <label>Destination address</label><input type="text" id="wdDest" placeholder="Paste your wallet address">`;
  wbtn.addEventListener('click', async () => {
    const amt = $$id('wdAmount').value, dest = $$id('wdDest').value.trim();
    if (!(Number(amt) >= 10) || !dest) return showToast('Missing details', 'Enter an amount (min $10) and your address.');
    wbtn.disabled = true;
    try {
      await api('/wallet/withdrawals', { method:'POST', headers:{ 'Idempotency-Key': key() },
        body:{ amount: String(amt), network: $$id('wdNetwork').value, destination: dest } });
      showToast('Withdrawal requested', 'Pending review. Funds are held until approved.');
      $$id('wdDest').value = ''; loadBalance(); loadTx();
    } catch (e) { showToast('Withdrawal failed', errMsg[e.data?.error] || 'Try again.'); }
    wbtn.disabled = false;
  });

  await Promise.all([loadBalance(), loadPositions(), loadMarkets(), loadTx(), loadMentors(), loadCopies(), loadDeposits()]);
  bindTrade(); connectWs();
  setInterval(() => { loadBalance(); loadPositions(); }, 15000);
})();