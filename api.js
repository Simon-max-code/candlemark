(() => {
  let token = sessionStorage.getItem('at');
  let refreshing = null;
  const setToken = (t) => { token = t; t ? sessionStorage.setItem('at', t) : sessionStorage.removeItem('at'); };

  const raw = (path, { method = 'GET', body, headers = {}, auth = true, form } = {}) => {
    const h = { ...headers };
    if (auth && token) h.Authorization = 'Bearer ' + token;
    let payload;
    if (form) payload = form;
    else if (body !== undefined || method !== 'GET') { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body ?? {}); }
    return fetch(API_BASE + path, { method, headers: h, body: payload, credentials: 'include' });
  };

  // Single-flight: parallel refreshes would trigger token-reuse detection.
  const refresh = () => (refreshing ||= raw('/auth/refresh', { method: 'POST', auth: false })
    .then(async (r) => { if (!r.ok) throw new Error('NO_SESSION'); const d = await r.json(); setToken(d.accessToken); return d; })
    .finally(() => { refreshing = null; }));

  async function api(path, opts = {}) {
    let r = await raw(path, opts);
    if (r.status === 401 && opts.auth !== false) {
      try { await refresh(); r = await raw(path, opts); }
      catch { setToken(null); if (!opts.noRedirect) location.href = 'login.html'; throw new Error('UNAUTHORIZED'); }
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || data.message || 'ERROR'), { status: r.status, data });
    return data;
  }
  api.setToken = setToken;
  api.refresh = refresh;
  api.key = () => crypto.randomUUID();
  window.api = api;
})();