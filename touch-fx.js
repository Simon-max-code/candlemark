if (matchMedia('(hover:none)').matches) {
  const glow = document.getElementById('cursorGlow');
  let raf = null, el = null;
  const pt = e => e.touches[0];

  const move = e => {
    const t = pt(e);
    if (glow) glow.style.transform = `translate(${t.clientX}px,${t.clientY}px) translate(-50%,-50%)`;
    if (!el) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = (t.clientX - r.left) / r.width - .5, y = (t.clientY - r.top) / r.height - .5;
      el.style.transform = el.matches('.magnetic')
        ? `translate(${x * r.width * .12}px,${y * r.height * .25}px)`
        : `perspective(700px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translateY(-3px)`;
    });
  };
  addEventListener('touchstart', e => {
    el = e.target.closest('[data-tilt],.tilt,.magnetic');
    move(e);
  }, { passive: true });
  addEventListener('touchmove', move, { passive: true });
  const end = () => { if (el) el.style.transform = ''; el = null; };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
}
