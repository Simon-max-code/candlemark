/* ============================================================
  MENTORSEDGEPRO — KYC WIZARD
============================================================ */
const STEPS = ['Personal information','Contact information','Investor information','Trading expectation','Trading experience','Currency','Client declaration'];
const TOTAL = STEPS.length;
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

/* cursor glow */
const glow = $('#cursorGlow');
addEventListener('pointermove', e => glow.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`);

/* ---------- Build chips + select options from data-opts ---------- */
$$('.chip-group').forEach(g => {
  g.innerHTML = g.dataset.opts.split('|').map(o =>
    `<label class="chip"><input type="radio" name="${g.dataset.name}" value="${o}"><span>${o}</span></label>`).join('');
});
$$('select[data-opts]').forEach(s => {
  s.insertAdjacentHTML('beforeend', s.dataset.opts.split('|').map(o => `<option>${o}</option>`).join(''));
  s.dispatchEvent(new Event('change'));
});

/* ---------- Left stepper + progress dots ---------- */
$('#kycSteps').innerHTML = STEPS.map((t,i) => `<li><span class="ks-num">${i+1}</span>${t}</li>`).join('');
$('#kpDots').innerHTML = STEPS.map(() => '<b></b>').join('');

/* ---------- Input helpers ---------- */
const dob = $('#dob');
dob.addEventListener('input', () => {            // auto-insert slashes
  let v = dob.value.replace(/\D/g,'').slice(0,8);
  if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d+)/,'$1/$2/$3');
  else if (v.length > 2) v = v.replace(/(\d{2})(\d+)/,'$1/$2');
  dob.value = v;
});
$('#phone').addEventListener('input', e => e.target.value = e.target.value.replace(/[^\d+\s()-]/g,''));

/* ---------- Validation ---------- */
function setErr(el, msg){
  const wrap = el.closest('.field') || el.parentElement;
  wrap.classList.add(el.classList.contains('chip-group') ? 'invalid-wrap' : 'invalid');
  const s = $('.field-error span', wrap); if (s && msg) s.textContent = msg;
}
function clearErr(el){
  const wrap = el.closest('.field') || el.closest('.invalid-wrap');
  wrap?.classList.remove('invalid','invalid-wrap');
}
function validDate(v){
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if(!m) return 'Use format dd/mm/yyyy';
  const [d,mo,y] = [+m[1],+m[2],+m[3]], dt = new Date(y,mo-1,d);
  if (dt.getFullYear()!==y || dt.getMonth()!==mo-1 || dt.getDate()!==d) return 'Enter a real date';
  const age = (Date.now()-dt)/31557600000;
  if (age < 18) return 'You must be at least 18';
  if (age > 100) return 'Enter a valid birth year';
  return '';
}
function validateSlide(slide){
  let ok = true;
  $$('[data-req]', slide).forEach(el => {
    clearErr(el);
    let msg = '';
    if (el.classList.contains('chip-group')){ if(!$('input:checked', el)) msg = 'Please select an option'; }
    else if (!el.value.trim()) msg = 'This field is required';
    else if (el.dataset.type === 'date') msg = validDate(el.value);
    else if (el.dataset.type === 'phone' && el.value.replace(/\D/g,'').length < 7) msg = 'Enter a valid phone number';
    if (msg){ ok = false; setErr(el, msg); }
  });
  if (!ok) $('.invalid, .invalid-wrap', slide)?.scrollIntoView({ behavior:'smooth', block:'center' });
  return ok;
}
$$('.kyc-slide input, .kyc-slide select, .kyc-slide textarea').forEach(el =>
  ['input','change'].forEach(ev => el.addEventListener(ev, () => clearErr(el.closest('.chip-group') || el))));

/* ---------- Wizard ---------- */
let cur = 1, busy = false;
let first = true;
const slides = $$('.kyc-slide');
const back = $('#kycBack'), next = $('#kycNext'), nextLbl = $('#kycNextLabel');

function render(dir='fwd'){
  slides.forEach((s,i) => {
    const on = i === cur-1;
    s.classList.toggle('active', on);
    s.classList.toggle('back', on && dir === 'back');
  });
  const pct = Math.round(((cur-1)/TOTAL)*100);
  $('#kpFill').style.width = pct + '%';
  $('#kpPct').textContent = pct + '%';
  $('#kpLabel').textContent = `Step ${cur} of ${TOTAL} · ${STEPS[cur-1]}`;
  $$('#kpDots b').forEach((b,i) => { b.className = i < cur-1 ? 'done' : i === cur-1 ? 'active' : ''; });
  $$('#kycSteps li').forEach((li,i) => { li.className = i < cur-1 ? 'done' : i === cur-1 ? 'active' : ''; });
  back.disabled = cur === 1;
  nextLbl.textContent = cur === TOTAL ? 'SUBMIT' : 'Continue →';
  if (cur === TOTAL) buildSummary();
  if(!first) matchMedia('(max-width:980px)').matches
    ? scrollTo({ top:0, behavior:'smooth' })
    : $('.kyc-card').scrollIntoView({ behavior:'smooth', block:'start' });
  if(matchMedia('(hover:hover)').matches)
    setTimeout(() => $('input:not([type=radio]):not([type=checkbox]), textarea', slides[cur-1])?.focus({ preventScroll:true }), 350);
  first = false;
}

function buildSummary(){
  const f = new FormData($('#kycForm')), g = k => f.get(k) || '—';
  const rows = [
    ['Name', `${g('title')} ${g('firstName')} ${g('lastName')}`],
    ['Date of birth', g('dob')],
    ['Address', `${g('houseNo')} ${g('street')}, ${g('city')}`],
    ['Phone', g('phone')],
    ['Employment', g('employment')],
    ['Annual amount', g('annual')],
    ['Experience', g('experience')],
    ['Currency', g('currency')],
  ];
  $('#kycSummary').innerHTML = rows.map(([k,v]) => `<div><small>${k}</small><strong>${v}</strong></div>`).join('');
}

next.addEventListener('click', () => {
  if (busy) return;
  if (!validateSlide(slides[cur-1])) return;
  if (cur < TOTAL){ cur++; render('fwd'); return; }

  // final submit
  const decl = $('#kycDecl');
  $('#declError').classList.toggle('show', !decl.checked);
  if (!decl.checked) return;
  busy = true; next.classList.add('loading'); next.disabled = true;
  const body = Object.fromEntries(new FormData($('#kycForm')));
  delete body.undefined;
  api('/kyc', { method:'PUT', body }).then(() => {
    $('#kpFill').style.width = '100%'; $('#kpPct').textContent = '100%';
    $$('#kpDots b').forEach(b => b.className = 'done');
    $$('#kycSteps li').forEach(li => li.className = 'done');
    $('#kycDone').classList.add('show');
    setTimeout(() => location.href = 'dashboard.html', 2600);
  }).catch((e) => {
    busy = false; next.classList.remove('loading'); next.disabled = false;
    const c = e.data?.error;
    $('#declError span').textContent = c === 'KYC_LOCKED' ? 'Your profile is already submitted.'
      : c === 'VALIDATION' ? 'Please check your details: ' + (e.data.issues?.[0]?.path || '')
      : 'Could not submit, try again.';
    $('#declError').classList.add('show');
    if (c === 'KYC_LOCKED') setTimeout(() => location.href = 'dashboard.html', 1500);
  });
});
back.addEventListener('click', () => { if (cur > 1){ cur--; render('back'); } });
$('#kycForm').addEventListener('keydown', e => {      // Enter = Continue
  if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA'){ e.preventDefault(); next.click(); }
});
$('#kycDecl').addEventListener('change', () => $('#declError').classList.remove('show'));

/* magnetic button */
if (matchMedia('(hover:hover)').matches){
  next.addEventListener('mousemove', e => {
    const r = next.getBoundingClientRect();
    next.style.transform = `translate(${(e.clientX-r.left-r.width/2)*.1}px,${(e.clientY-r.top-r.height/2)*.25}px)`;
  });
  next.addEventListener('mouseleave', () => next.style.transform = '');
}

render();