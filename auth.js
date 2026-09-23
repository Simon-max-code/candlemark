/* ============================================================
  MENTORSEDGEPRO — AUTH PAGE INTERACTIONS
============================================================ */

/* ---------- Ambient Three.js scene (left panel) ---------- */
(function authScene(){
  const canvas = document.getElementById('authCanvas');
  if(!canvas || typeof THREE === 'undefined') return;
  const wrap = canvas.parentElement;
  let W = wrap.clientWidth, H = wrap.clientHeight;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0A0D12, 0.05);
  const camera = new THREE.PerspectiveCamera(50, W/H, 0.1, 100);
  camera.position.set(0, 2, 16);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);

  scene.add(new THREE.AmbientLight(0x445566, 1.2));
  const key = new THREE.PointLight(0x00E6A0, 2, 40);
  key.position.set(-6, 6, 8); scene.add(key);
  const rim = new THREE.PointLight(0xE8B961, 1.1, 40);
  rim.position.set(8, -2, 4); scene.add(rim);

  // Sparse candlestick silhouette drifting in background
  const group = new THREE.Group();
  scene.add(group);
  const COUNT = 14;
  for(let i=0;i<COUNT;i++){
    const seed = i*2.7;
    const bull = Math.sin(seed) > -0.15;
    const h = 1 + Math.abs(Math.sin(seed*1.7)) * 3.4;
    const color = bull ? 0x00E6A0 : 0xFF5C6C;
    const geo = new THREE.BoxGeometry(0.5, h, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color, emissive:color, emissiveIntensity:0.3, transparent:true, opacity:0.55 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((i - COUNT/2) * 1.1, h/2 - 3, -4 - (i%3)*1.5);
    group.add(mesh);
  }

  // floating particles
  const pCount = 90;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(pCount*3);
  for(let i=0;i<pCount;i++){
    pos[i*3] = (Math.random()-0.5) * 24;
    pos[i*3+1] = (Math.random()-0.5) * 16;
    pos[i*3+2] = (Math.random()-0.5) * 20 - 4;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const pMat = new THREE.PointsMaterial({ color:0x2C3444, size:0.08, transparent:true, opacity:0.7 });
  const points = new THREE.Points(geo, pMat);
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
    group.rotation.y = Math.sin(t*0.06) * 0.15;
    group.position.y = Math.sin(t*0.2) * 0.15;
    points.rotation.y = t * 0.008;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ---------- Rotating testimonials ---------- */
(function testimonials(){
  const quotes = document.querySelectorAll('.auth-quote');
  const dots = document.querySelectorAll('.auth-quote-dots button');
  if(!quotes.length) return;
  let idx = 0;
  let timer = null;

  function show(i){
    quotes.forEach(q => q.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    quotes[i].classList.add('active');
    if(dots[i]) dots[i].classList.add('active');
    idx = i;
  }
  function next(){ show((idx+1) % quotes.length); }

  function restart(){
    clearInterval(timer);
    timer = setInterval(next, 5000);
  }

  dots.forEach((dot,i)=>{
    dot.addEventListener('click', ()=>{ show(i); restart(); });
  });

  show(0);
  restart();
})();

/* ---------- Segmented account-type control ---------- */
document.querySelectorAll('.seg-control').forEach(seg=>{
  // purely CSS-driven via :checked, nothing needed here except a11y label sync
});

/* ---------- Floating label fix for selects ---------- */
document.querySelectorAll('.field select').forEach(sel=>{
  const sync = ()=>{
    sel.closest('.field').classList.toggle('has-value', !!sel.value);
  };
  sel.addEventListener('change', sync);
  sync();
});

/* ---------- Password visibility toggle ---------- */
document.querySelectorAll('[data-toggle-pw]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const input = document.getElementById(btn.dataset.togglePw);
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    btn.innerHTML = isPw ? eyeOffIcon() : eyeIcon();
  });
});
function eyeIcon(){
  return `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 9s2.8-5.5 8-5.5S17 9 17 9s-2.8 5.5-8 5.5S1 9 1 9Z" stroke="currentColor" stroke-width="1.4"/><circle cx="9" cy="9" r="2.3" stroke="currentColor" stroke-width="1.4"/></svg>`;
}
function eyeOffIcon(){
  return `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14M7.4 7.6a2.3 2.3 0 0 0 3.1 3.1M5.2 5.1C3 6.4 1.6 9 1.6 9S4.4 14.5 9.6 14.5c1.4 0 2.6-.4 3.6-1M14.6 12.3C15.9 11 16.4 9 16.4 9S13.6 3.5 8.4 3.5c-.6 0-1.2.07-1.7.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
}
document.querySelectorAll('[data-toggle-pw]').forEach(btn=> btn.innerHTML = eyeIcon());

/* ---------- Password strength meter ---------- */
const pwInput = document.getElementById('regPassword');
if(pwInput){
  const bars = document.querySelectorAll('.pw-strength i');
  const label = document.querySelector('.pw-strength-label');
  const colors = ['#FF5C6C','#FF5C6C','#E8B961','#00E6A0','#00E6A0'];
  const labels = ['Very weak','Weak','Fair','Strong','Very strong'];

  pwInput.addEventListener('input', ()=>{
    const v = pwInput.value;
    let score = 0;
    if(v.length >= 8) score++;
    if(v.length >= 12) score++;
    if(/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if(/[0-9]/.test(v)) score++;
    if(/[^A-Za-z0-9]/.test(v)) score++;
    score = Math.min(score, 5);
    const filled = v.length === 0 ? 0 : Math.max(score,1);

    bars.forEach((bar,i)=>{
      bar.style.background = i < filled ? colors[Math.min(filled-1,4)] : 'var(--line)';
    });
    label.textContent = v.length === 0 ? 'Use 8+ characters with a mix of letters, numbers &amp; symbols' : labels[Math.min(filled-1,4)];
  });
}

/* ---------- Custom checkbox ---------- */
document.querySelectorAll('.checkbox').forEach(box=>{
  const input = box.querySelector('input');
  const sync = ()=> box.classList.toggle('checked', input.checked);
  input.addEventListener('change', sync);
  sync();
});

/* ---------- Field validation helpers ---------- */
function setInvalid(field, msg){
  field.classList.add('invalid');
  const err = field.querySelector('.field-error span');
  if(err && msg) err.textContent = msg;
}
function clearInvalid(field){
  field.classList.remove('invalid');
}
document.querySelectorAll('.field input').forEach(inp=>{
  inp.addEventListener('input', ()=> clearInvalid(inp.closest('.field')));
});

/* ---------- Login form ---------- */
const loginForm = document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    let valid = true;
    const email = document.getElementById('loginEmail');
    const pw = document.getElementById('loginPassword');

    if(!email.value.includes('@')){ setInvalid(email.closest('.field'), 'Enter a valid email address'); valid = false; }
    if(pw.value.length < 6){ setInvalid(pw.closest('.field'), 'Password must be at least 6 characters'); valid = false; }
    if(!valid) return;

    submitWithLoading(loginForm, ()=>{
      document.getElementById('loginSuccess').classList.add('show');
      redirectToDashboard();
    });
  });
}

/* ---------- Register form ---------- */
const registerForm = document.getElementById('registerForm');
if(registerForm){
  registerForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    let valid = true;

    const name = document.getElementById('regName');
    const email = document.getElementById('regEmail');
    const pw = document.getElementById('regPassword');
    const confirm = document.getElementById('regConfirm');
    const terms = document.getElementById('regTerms');

    if(name.value.trim().length < 2){ setInvalid(name.closest('.field'), 'Enter your full name'); valid = false; }
    if(!email.value.includes('@')){ setInvalid(email.closest('.field'), 'Enter a valid email address'); valid = false; }
    if(pw.value.length < 8){ setInvalid(pw.closest('.field'), 'Use at least 8 characters'); valid = false; }
    if(confirm.value !== pw.value || confirm.value === ''){ setInvalid(confirm.closest('.field'), 'Passwords do not match'); valid = false; }
    if(!terms.checked){ document.getElementById('termsError').style.display = 'block'; valid = false; }
    else{ document.getElementById('termsError').style.display = 'none'; }

    if(!valid) return;

    submitWithLoading(registerForm, ()=>{
      document.getElementById('registerSuccess').classList.add('show');
      redirectToDashboard();
    });
  });
}

function redirectToDashboard(delay = 1500){
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, delay);
}

function submitWithLoading(form, onDone){
  const btn = form.querySelector('.btn-submit');
  btn.classList.add('loading');
  btn.disabled = true;
  setTimeout(()=>{
    btn.classList.remove('loading');
    btn.disabled = false;
    onDone();
  }, 1300);
}