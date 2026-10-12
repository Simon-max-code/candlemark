(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const usd = (c) => (Number(c) / 100).toLocaleString('en-US', { style:'currency', currency:'USD' });
  const TV = { 'EUR/USD':'FX:EURUSD','GBP/USD':'FX:GBPUSD','USD/JPY':'FX:USDJPY','AUD/USD':'FX:AUDUSD','USD/CAD':'FX:USDCAD',
    AAPL:'NASDAQ:AAPL',TSLA:'NASDAQ:TSLA',NVDA:'NASDAQ:NVDA',MSFT:'NASDAQ:MSFT',AMZN:'NASDAQ:AMZN',
    'BTC/USD':'BINANCE:BTCUSDT','ETH/USD':'BINANCE:ETHUSDT','SOL/USD':'BINANCE:SOLUSDT','XRP/USD':'BINANCE:XRPUSDT',
    US500:'OANDA:SPX500USD',NAS100:'OANDA:NAS100USD',US30:'OANDA:US30USD',UK100:'OANDA:UK100GBP',
    'XAU/USD':'OANDA:XAUUSD','XAG/USD':'OANDA:XAGUSD',WTI:'TVC:USOIL',NATGAS:'CAPITALCOM:NATURALGAS' };
  const ERR = { INSUFFICIENT_FUNDS:'Not enough balance.', BELOW_MIN:'Minimum trade is $10.', PRICE_UNAVAILABLE:'No live price right now (market closed?).',
    BAD_STOP_LOSS:'Stop loss is on the wrong side of the price.', BAD_TAKE_PROFIT:'Take profit is on the wrong side of the price.', TOO_MANY_POSITIONS:'Too many open positions.', VALIDATION:'Check the amount and levels.' };
  const code = (e) => (e.data?.message in ERR ? e.data.message : e.data?.error);
  const msg = (t) => { const m = $('#msg'); m.textContent = t; m.style.display = 'block'; setTimeout(() => m.style.display = 'none', 4000); };
  let M = {}, cur = '', side = 'BUY';

  function chart() {
    if (!window.TradingView || !cur) return;
    $('#tv').innerHTML = '';
    new TradingView.widget({ container_id:'tv', autosize:true, symbol: TV[cur] || cur, interval:'15', timezone:'Etc/UTC', theme:'light', style:'1', locale:'en', enable_publishing:false, allow_symbol_change:false, hide_top_toolbar:false });
  }
  function paintPrice() {
    const m = M[cur]; if (!m) return;
    $('#px').textContent = Number(m.price).toLocaleString(undefined, { maximumFractionDigits: 6 });
    const c = $('#chg'); c.textContent = `${m.chg >= 0 ? '▲' : '▼'} ${Math.abs(m.chg).toFixed(2)}%`; c.className = m.chg >= 0 ? 'up' : 'down';
    const unit = m.asset === 'forex' ? 'pips' : 'points';
    document.querySelectorAll('.un').forEach((e) => e.textContent = unit);
  }
  async function loadMarkets(first) {
    const { items } = await api('/markets');
    const old = M; M = Object.fromEntries(items.map((i) => [i.sym, i]));
    if (first) {
      const groups = {}; items.forEach((i) => (groups[i.asset] ||= []).push(i));
      $('#sym').innerHTML = Object.entries(groups).map(([g, l]) => `<optgroup label="${esc(g)}">${l.map((i) => `<option>${esc(i.sym)}</option>`).join('')}</optgroup>`).join('');
      cur = items[0]?.sym || ''; if (cur) $('#sym').value = cur; chart();
    }
    paintPrice();
  }
  function connectWs() {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (m) => { const { t, p } = JSON.parse(m.data); if (t !== 'tick' && t !== 'snapshot') return;
      for (const k in p) if (M[k]) M[k].price = Number(p[k]); paintPrice(); };
    ws.onclose = () => setTimeout(connectWs, 3000);
  }
  async function loadOverview() {
    const o = await api('/mentor/overview');
    $('#who').textContent = `· ${o.name} (@${o.handle})`;
    const pnl = Number(o.pnl);
    $('#stats').innerHTML = [['Balance', usd(o.balance)], ['Active copiers', o.copiers], ['Allocated by copiers', usd(o.allocated)], ['Closed trades', o.trades],
      ['Win rate', o.winRate == null ? '—' : o.winRate + '%'], ['Realised P&L', `<span class="${pnl >= 0 ? 'up' : 'down'}">${usd(o.pnl)}</span>`]]
      .map(([k, v]) => `<div class="card"><small>${k}</small><b>${v}</b></div>`).join('');
  }
  async function loadPositions() {
    const { items } = await api('/trades?status=OPEN');
    $('#pos').innerHTML = items.length ? items.map((p) => { const up = Number(p.pnl) >= 0; return `<tr>
      <td><strong>${esc(p.sym)}</strong></td><td class="${p.dir === 'long' ? 'up' : 'down'}">${esc(p.side)}</td><td>${Number(p.entry)}</td><td>${Number(p.cur)}</td>
      <td>${p.stopLoss ? Number(p.stopLoss) : '—'}</td><td>${p.takeProfit ? Number(p.takeProfit) : '—'}</td>
      <td class="${up ? 'up' : 'down'}">${usd(p.pnl)} (${p.pnlPct}%)</td><td><button class="cl" data-c="${p.id}">Close</button></td></tr>`; }).join('')
      : '<tr><td colspan="8" style="color:var(--text-tertiary)">No open positions.</td></tr>';
  }
  const refresh = () => Promise.all([loadOverview(), loadPositions()]).catch(() => {});

  $('#sym').onchange = (e) => { cur = e.target.value; paintPrice(); chart(); };
  const setSide = (s) => { side = s; $('#sBuy').classList.toggle('on', s === 'BUY'); $('#sSell').classList.toggle('on', s === 'SELL');
    $('#go').textContent = s === 'BUY' ? 'Buy' : 'Sell'; $('#go').classList.toggle('sell', s === 'SELL'); };
  $('#sBuy').onclick = () => setSide('BUY'); $('#sSell').onclick = () => setSide('SELL');

  $('#go').onclick = async () => {
    const m = M[cur]; if (!m) return msg(ERR.PRICE_UNAVAILABLE);
    const amt = $('#amt').value, sl = +$('#sl').value, tp = +$('#tp').value, dir = side === 'BUY' ? 1 : -1;
    const body = { symbol: cur, side, amount: String(amt) };
    if (sl > 0) body.stopLoss = (m.price - dir * sl * m.pip).toFixed(m.dp);
    if (tp > 0) body.takeProfit = (m.price + dir * tp * m.pip).toFixed(m.dp);
    if ((body.stopLoss && +body.stopLoss <= 0) || (body.takeProfit && +body.takeProfit <= 0)) return msg('Level would be below zero.');
    $('#go').disabled = true;
    try { await api('/trades', { method:'POST', headers:{ 'Idempotency-Key': api.key() }, body }); msg('Trade placed. Copiers are being mirrored.'); refresh(); }
    catch (e) { msg(ERR[code(e)] || 'Could not place trade.'); }
    $('#go').disabled = false;
  };
  $('#pos').onclick = async (e) => { const id = e.target.closest('[data-c]')?.dataset.c; if (!id) return;
    try { await api(`/trades/${id}/close`, { method:'POST' }); msg('Closed. Copiers are being closed too.'); refresh(); } catch (er) { msg(ERR[code(er)] || 'Could not close.'); } };

  const loginBox = $('#login'), app = $('#app');
  const out = async () => { await api('/auth/logout', { method:'POST' }).catch(() => {}); api.setToken(null); };
  const showLogin = (n) => { app.style.display = 'none'; loginBox.style.display = 'flex'; $('#lerr').textContent = n || ''; };
  let started = false;
  async function enter() {
    try { await api('/mentor/overview', { noRedirect: true }); }
    catch (e) {
      if (e.status === 403) { // keep the session (don't log an admin out); just explain
        const me = await api('/auth/me', { noRedirect: true }).catch(() => null);
        return showLogin(`${me ? 'You are signed in as ' + me.email + ', which has' : 'This account has'} no active, verified mentor profile. Log in with the mentor's own account (use a private window to stay signed in as admin).`);
      }
      await out(); return showLogin('Could not load the mentor portal, please log in again.');
    }
    loginBox.style.display = 'none'; app.style.display = '';
    if (started) return; started = true;
    await loadMarkets(true); await refresh(); connectWs();
    setInterval(() => { refresh(); loadMarkets(false).catch(() => {}); }, 10000);
  }
  $('#lo').onclick = async () => { await out(); location.reload(); };
  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true;
    try {
      const totp = $('#lt').value.trim();
      const r = await api('/auth/login', { method:'POST', auth:false, body:{ email: $('#le').value.trim().toLowerCase(), password: $('#lp').value, ...(totp && { totp }) } });
      api.setToken(r.accessToken); $('#lp').value = ''; $('#lt').value = ''; await enter();
    } catch (err) {
      const c = err.data?.error;
      if (c === 'TOTP_REQUIRED' || c === 'INVALID_TOTP') { $('#lt').style.display = 'block'; $('#lt').focus(); $('#lerr').textContent = c === 'INVALID_TOTP' ? 'Wrong 2FA code.' : 'Enter your 2FA code.'; }
      else if (c === 'ACCOUNT_SUSPENDED') $('#lerr').textContent = 'Account restricted.';
      else if (err.status === 429) $('#lerr').textContent = 'Too many attempts, wait a minute.';
      else $('#lerr').textContent = c === 'INVALID_CREDENTIALS' ? 'Incorrect email or password.' : 'Server unreachable, try again.';
    } finally { btn.disabled = false; }
  };
  (async () => { try { await api('/auth/me', { noRedirect: true }); await enter(); } catch { showLogin(); } })();
})();