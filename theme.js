(() => {
  const k = 'theme', r = document.documentElement;
  try { r.dataset.theme = localStorage.getItem(k) || 'light'; } catch { r.dataset.theme = 'light'; }
  document.addEventListener('DOMContentLoaded', () => {
    const host = document.querySelector('.topbar-right,.nav-actions,.mt-top');
    const b = document.createElement('button'); b.className = 'icon-btn'; b.setAttribute('aria-label', 'Toggle theme');
    if (!host) b.style.cssText = 'position:fixed;top:14px;right:14px;z-index:600';
    const paint = () => b.textContent = r.dataset.theme === 'dark' ? '☀' : '☾';
    b.onclick = () => { r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(k, r.dataset.theme); } catch {} paint(); };
    paint(); if (host) host.prepend(b); else document.body.append(b);
  });
})();
