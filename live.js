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

  await Promise.all([loadBalance(), loadPositions(), loadMarkets(), loadTx()]);
  bindTrade(); connectWs();
  setInterval(() => { loadBalance(); loadPositions(); }, 15000);
})();