/* DailyEdge – App interactions + Header (menu, search, theme, progress)
   Upgrades:
   - Hide header on panels + sticky Back bar
   - Timer: Wake Lock (screen stays on), presets, streak counter
   - Planner: tags + due date + filters
   - Calculator: "Needed" mode (required score to hit target)
*/

document.addEventListener('DOMContentLoaded', () => {
  // Helpers
  const $  = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const todayKey = (d=new Date()) => d.toISOString().slice(0,10);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso+'T00:00:00');
    return d.toLocaleDateString(undefined, {month:'short', day:'numeric', weekday:'short'});
  };

  // Subjects used in planner
  const SUBJECTS = ['General','Maths','Science','English','Physics','Chemistry','Biology','History','Geography','Economics','Civics(Politics)','Computer(AI)','Hindi','Urdu','Sanskrit','sst','GK','Art','Music','Dance'];

  // Header elements
  const headerEl = $('#siteHeader');
  const navToggle = $('#navToggle');
  const navMenu = $('#navMenu');
  const searchBtn = $('#searchBtn');
  const searchBox = $('#searchBox');
  const searchInput = $('#searchInput');
  const themeToggle = $('#themeToggle');
  const progressBar = $('#progressBar');

  // =============== Header: mobile menu ===============
  navToggle?.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (!navMenu) return;
    if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
      navMenu.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  });

  // =============== Header: search expand ===============
  searchBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    searchBox.classList.toggle('active');
    if (searchBox.classList.contains('active')) setTimeout(() => searchInput.focus(), 10);
  });
  document.addEventListener('click', (e) => {
    if (searchBox && !searchBox.contains(e.target)) searchBox.classList.remove('active');
  });

  // =============== Header: theme toggle ===============
  const html = document.documentElement;
  function setTheme(mode) {
    html.setAttribute('data-theme', mode);
    try { localStorage.setItem('de-theme', mode); } catch(e){}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#0b0f14' : '#ffffff');
  }
  function getTheme() {
    try { return localStorage.getItem('de-theme'); } catch(e){ return null; }
  }
  setTheme(getTheme() || 'dark');

  themeToggle?.addEventListener('click', () => {
    setTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // =============== Header: shrink + progress ===============
  function onScroll() {
    if (window.scrollY > 10) headerEl?.classList.add('scrolled');
    else headerEl?.classList.remove('scrolled');

    const doc = document.documentElement;
    const total = doc.scrollHeight - doc.clientHeight;
    const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
    if (progressBar) progressBar.style.width = `${pct}%`;
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // =============== App state ===============
  const STORAGE_KEY = 'dailyedge:v2';
  const defaults = {
    date: todayKey(),
    studySeconds: 0,
    sessions: 0,
    tasks: [],     // {id, text, done, tag, due}
    completed: 0,
    streakDays: 0,
    lastStudyDate: null
  };

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) {
        const old = localStorage.getItem('dailyedge:v1');
        if (old) { const d = JSON.parse(old); return {...defaults, ...d}; }
        return {...defaults};
      }
      const data = JSON.parse(raw);
      if (data.date !== todayKey()){
        data.date = todayKey();
        data.studySeconds = 0;
        data.sessions = 0;
      }
      return {...defaults, ...data};
    }catch{
      return {...defaults};
    }
  }
  function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch{} }
  const state = loadState();

  // =============== Panels + Tabs ===============
  const panels = {
    home: null,
    timer: $('#panel-timer'),
    planner: $('#panel-planner'),
    calculator: $('#panel-calculator')
  };
  const tabs = $$('.tabbar .tab');

  function hideAllPanels(){ Object.keys(panels).forEach(k => { if(panels[k]) panels[k].hidden = true; }); }
  function setActiveTab(name){ tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name)); }

  // Inject sticky Back bar into panels (once)
  function ensurePanelBar(key, title){
    const panel = panels[key]; if (!panel) return;
    const inner = panel.querySelector('.panel-inner'); if (!inner) return;
    if (panel.querySelector('.panelbar')) return; // avoid duplicate

    const bar = document.createElement('div');
    bar.className = 'panelbar';
    bar.innerHTML = `
      <button class="backbtn" data-back="home" aria-label="Back to Home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"></path>
        </svg>
        <span>Back</span>
      </button>
      <div class="panelbar-title">${title}</div>
    `;
    inner.prepend(bar);
  }

  // Global Back handler
  document.addEventListener('click', e => {
    const back = e.target.closest('[data-back]');
    if (!back) return;
    e.preventDefault();
    navigate(back.dataset.back || 'home');
  });

  // Main navigation function (hides header on panels)
  function navigate(name){
    setActiveTab(name);
    hideAllPanels();

    const isHome = name === 'home';
    if (isHome){
      headerEl?.classList.remove('hidden');
      window.scrollTo({top:0, behavior:'smooth'});
      navMenu?.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
      return;
    }

    headerEl?.classList.add('hidden'); // hide main header on panels
    const panel = panels[name]; if (!panel) return;
    panel.hidden = false; panel.scrollTop = 0;

    navMenu?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }

  // Header menu links -> navigate
  navMenu?.addEventListener('click', (e) => {
    const link = e.target.closest('.nav__link'); if (!link) return;
    e.preventDefault();
    const target = link.dataset.open;
    if (target) navigate(target);
  });

  // Bottom tabbar
  $('.tabbar')?.addEventListener('click', e => {
    const tab = e.target.closest('.tab'); if (!tab) return;
    navigate(tab.dataset.tab);
  });

  // Quick actions -> navigate
  const quickMap = { 'open-timer':'timer', 'open-planner':'planner', 'open-calculator':'calculator' };
  $('.action-list')?.addEventListener('click', e => {
    const item = e.target.closest('.action-item'); if (!item) return;
    const target = quickMap[item.dataset.action]; if (target) navigate(target);
  });

  // =============== Home stats ===============
  function findStatCard(labelNeedle){
    return $$('.card.stat').find(card => {
      const t = card.querySelector('.label')?.textContent?.toLowerCase() || '';
      return t.includes(labelNeedle);
    });
  }
  const studyCard = findStatCard('study time') || $('.cards-2 .card.stat:nth-child(1)');
  const activeCard = findStatCard('active tasks') || $('.cards-2 .card.stat:nth-child(2)');

  const studyValueEl    = studyCard?.querySelector('.value');
  const studySessionsEl = studyCard?.querySelector('.muted');
  const activeValueEl   = activeCard?.querySelector('.value');
  const activeMutedEl   = activeCard?.querySelector('.muted');

  function renderHomeStats(){
    if (studyValueEl)    studyValueEl.textContent    = `${Math.floor(state.studySeconds/60)}m`;
    if (studySessionsEl) {
      const streakTxt = state.streakDays > 0 ? ` • Streak ${state.streakDays}d` : '';
      studySessionsEl.textContent = `${state.sessions} session${state.sessions===1?'':'s'}${streakTxt}`;
    }
    const activeCount = state.tasks.filter(t=>!t.done).length;
    if (activeValueEl)   activeValueEl.textContent   = String(activeCount);
    if (activeMutedEl)   activeMutedEl.textContent   = `${state.completed} completed`;
  }

  studyCard?.addEventListener('click', () => navigate('timer'));
  activeCard?.addEventListener('click', () => navigate('planner'));

  // =============== TIMER (presets + streak + wake lock) ===============
  const timerPanel   = panels.timer;
  const timerDisplay = $('#timerDisplay');

  let wakeLock = null;
  async function requestWakeLock(){
    try{
      if ('wakeLock' in navigator && !wakeLock){
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener?.('release', () => updateWakeBadge());
      }
    }catch{}
    updateWakeBadge();
  }
  async function releaseWakeLock(){
    try{ await wakeLock?.release(); }catch{}
    wakeLock = null; updateWakeBadge();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && running) requestWakeLock();
  });

  function ensureTimerSettings(){
    if (!timerPanel || $('#timerSettings', timerPanel)) return;
    const box = document.createElement('div');
    box.className = 'timer-ui';
    box.id = 'timerSettings';
    box.innerHTML = `
      <div class="badges">
        <span id="streakBadge" class="badge">Streak: 0d</span>
        <span id="wakeBadge" class="badge">Screen Awake: Off</span>
      </div>
      <div class="chips" style="margin:8px 0;">
        <button class="chip" id="chip25" type="button">25m</button>
        <button class="chip" id="chip50" type="button">50m</button>
      </div>
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <label for="targetMins" style="font-weight:600;">Set study time (minutes)</label>
        <input id="targetMins" type="number" min="1" step="1" value="25"
               style="flex:0 0 100px; padding:10px 12px; border-radius:12px; border:1px solid var(--border); background: var(--card); color: var(--text);" />
        <button class="btn primary" id="applyTarget" type="button">Apply</button>
        <span id="targetInfo" style="color:var(--muted);">Pomodoro tip: 25 min focus + short break</span>
      </div>
      <div id="timerProgress" style="height:8px; background:color-mix(in srgb, var(--primary) 15%, transparent); border-radius:999px; margin-top:10px; overflow:hidden;">
        <div id="timerProgressBar" style="height:100%; width:0%; background:var(--primary); border-radius:999px;"></div>
      </div>
    `;
    timerPanel.querySelector('.panel-inner')?.insertBefore(box, timerPanel.querySelector('.timer-ui'));

    // Listeners
    $('#applyTarget').addEventListener('click', () => {
      const mins = clamp(parseInt($('#targetMins').value,10) || 25, 1, 600);
      setTarget(mins*60);
    });
    $('#chip25').addEventListener('click', () => { setTarget(25*60); $('#targetMins').value = 25; });
    $('#chip50').addEventListener('click', () => { setTarget(50*60); $('#targetMins').value = 50; });
    renderStreak(); updateWakeBadge();
  }

  let raf = null, last = 0, running = false;
  let elapsedSec = 0;
  let targetSec  = 0;

  const fmt = (s) => {
    s = Math.floor(s);
    const h = String(Math.floor(s/3600)).padStart(2,'0');
    const m = String(Math.floor((s%3600)/60)).padStart(2,'0');
    const sec = String(s%60).padStart(2,'0');
    return `${h}:${m}:${sec}`;
  };
  function renderTimer(){
    const left = targetSec ? Math.max(targetSec - elapsedSec, 0) : elapsedSec;
    if (timerDisplay) timerDisplay.textContent = fmt(left);
    const pct = targetSec ? Math.max(0, Math.min(100, (elapsedSec/targetSec)*100)) : 0;
    const bar = $('#timerProgressBar'); if (bar) bar.style.width = `${pct}%`;
  }
  function tick(now){
    if(!running) return;
    const dt = (now - last)/1000; last = now;
    elapsedSec += dt;
    if (targetSec && elapsedSec >= targetSec){ stopTimer(true); return; }
    renderTimer();
    raf = requestAnimationFrame(tick);
  }
  function startTimer(){ if (running) return; running = true; last = performance.now(); requestWakeLock(); raf = requestAnimationFrame(tick); }
  function pauseTimer(){ running = false; if (raf) cancelAnimationFrame(raf); raf = null; releaseWakeLock(); }
  function stopTimer(finished=false){
    pauseTimer();
    const add = Math.round(elapsedSec);
    state.studySeconds += add;
    if (finished) {
      state.sessions += 1;
      updateStreak();
    }
    saveState(); renderHomeStats(); renderStreak();
    try{ navigator.vibrate?.(finished?[120,80,120]:80); }catch{}
    try{
      const C = window.AudioContext || window.webkitAudioContext;
      if (C){ const ctx = new C(); const o=ctx.createOscillator(), g=ctx.createGain();
        o.connect(g); g.connect(ctx.destination); o.type='sine'; o.frequency.value = finished?880:440; g.gain.value=0.1;
        o.start(); setTimeout(()=>{o.stop(); ctx.close();}, finished?500:250);
      }
    }catch{}
    elapsedSec = 0; renderTimer();
  }
  function resetTimer(){ pauseTimer(); elapsedSec = 0; renderTimer(); }
  function setTarget(sec){
    targetSec = Math.max(0, Math.min(24*3600, sec|0));
    const info = $('#targetInfo');
    if (info) info.textContent = targetSec ? `Target set: ${Math.round(targetSec/60)} min` : 'No target set';
    renderTimer();
  }
  function updateStreak(){
    const today = todayKey();
    if (state.lastStudyDate === today) return;
    const yday = todayKey(addDays(new Date(), -1));
    state.streakDays = (state.lastStudyDate === yday) ? (state.streakDays + 1) : 1;
    state.lastStudyDate = today;
    saveState();
  }
  function renderStreak(){
    const el = $('#streakBadge');
    if (el) {
      el.textContent = `Streak: ${state.streakDays||0}d`;
      el.classList.toggle('on', (state.streakDays||0) > 0);
    }
  }
  function updateWakeBadge(){
    const el = $('#wakeBadge');
    if (el) {
      const on = !!wakeLock;
      el.textContent = `Screen Awake: ${on?'On':'Off'}`;
      el.classList.toggle('on', on);
    }
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-timer]'); if (!btn) return;
    const a = btn.dataset.timer;
    if (a==='start') startTimer();
    if (a==='pause') pauseTimer();
    if (a==='reset') resetTimer();
  });

  // =============== Planner (tags + due date + filters) ===============
  const taskForm  = $('#taskForm');
  const taskInput = $('#taskInput');
  const taskList  = $('#taskList');

  function enhancePlannerUI(){
    if (!taskForm || $('#taskTag')) return;
    // Tag select
    const tagSel = document.createElement('select');
    tagSel.id = 'taskTag';
    SUBJECTS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      tagSel.appendChild(opt);
    });
    // Due date
    const dueInp = document.createElement('input');
    dueInp.type = 'date'; dueInp.id = 'taskDue';

    taskForm.insertBefore(tagSel, taskForm.querySelector('button'));
    taskForm.insertBefore(dueInp, taskForm.querySelector('button'));

    // Filters
    const filters = document.createElement('div');
    filters.className = 'filters';
    filters.innerHTML = `
      <label>View:
        <select id="fRange">
          <option value="all">All</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
        </select>
      </label>
      <label>Tag:
        <select id="fTag">
          <option value="all">All</option>
          ${SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </label>
    `;
    taskForm.parentElement.insertBefore(filters, taskForm);
    filters.addEventListener('change', renderTasks);
  }

  const escapeHTML = (s) => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function taskPassesFilters(t){
    const fRange = $('#fRange')?.value || 'all';
    const fTag = $('#fTag')?.value || 'all';

    if (fTag !== 'all' && t.tag !== fTag) return false;

    if (fRange === 'today'){
      return t.due && t.due === todayKey();
    } else if (fRange === 'week'){
      if (!t.due) return false;
      const d = new Date(t.due+'T00:00:00');
      const now = new Date();
      const in7 = addDays(now, 7);
      return d >= new Date(todayKey()+'T00:00:00') && d <= in7;
    }
    return true;
  }

  function renderTasks(){
    if (!taskList) return;
    taskList.innerHTML = '';

    const copy = state.tasks.slice().sort((a,b)=>{
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return 0;
    });

    copy.filter(taskPassesFilters).forEach(t=>{
      const li = document.createElement('li'); li.dataset.id = t.id;
      li.innerHTML = `
        <div class="task-left">
          <span class="tag">${escapeHTML(t.tag || 'General')}</span>
          <span class="task-text" style="${t.done?'text-decoration:line-through; opacity:.7;':''}">${escapeHTML(t.text)}</span>
          ${t.due ? `<span class="task-meta">Due ${formatDate(t.due)}</span>` : ''}
        </div>
        <div>
          <button class="btn" data-task="done">${t.done?'Undo':'Done'}</button>
          <button class="btn danger" data-task="delete">Delete</button>
        </div>`;
      taskList.appendChild(li);
    });

    const doneCount   = state.tasks.filter(x=> x.done).length;
    state.completed = doneCount; saveState(); renderHomeStats();
  }

  function addTask(text){
    const tag = $('#taskTag')?.value || 'General';
    const due = $('#taskDue')?.value || '';
    state.tasks.unshift({
      id: crypto.randomUUID?.() || String(Date.now()+Math.random()),
      text, done:false, tag, due
    });
    saveState(); renderTasks();
  }
  function toggleTask(id){ const t = state.tasks.find(x=>x.id===id); if(!t) return; t.done=!t.done; saveState(); renderTasks(); }
  function deleteTask(id){ const i = state.tasks.findIndex(x=>x.id===id); if(i>=0) state.tasks.splice(i,1); saveState(); renderTasks(); }

  taskForm?.addEventListener('submit', e=>{
    e.preventDefault();
    const text = taskInput.value.trim(); if(!text) return;
    addTask(text); taskInput.value=''; taskInput.focus();
  });
  taskList?.addEventListener('click', e=>{
    const btn = e.target.closest('[data-task]'); if(!btn) return;
    const li = btn.closest('li'); if(!li) return;
    if (btn.dataset.task==='done') toggleTask(li.dataset.id);
    if (btn.dataset.task==='delete') deleteTask(li.dataset.id);
  });

  // =============== Calculator (Points + Weighted + Needed) ===============
  const calcPanel = panels.calculator;

  function buildGradeCalculator(){
    if (!calcPanel) return;

    // Hide the old GPA demo form if present
    calcPanel.querySelector('.gpa-form')?.setAttribute('hidden','true');
    calcPanel.querySelector('#gpaResult')?.setAttribute('hidden','true');

    if ($('#gradeCalc', calcPanel)) return;

    const wrap = document.createElement('div');
    wrap.id = 'gradeCalc';
    wrap.className = 'card';
    wrap.style.padding = '16px';
    wrap.style.marginTop = '10px';
    wrap.innerHTML = `
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
        <button class="btn primary" type="button" data-mode="simple">Points</button>
        <button class="btn" type="button" data-mode="weighted">Weighted</button>
        <button class="btn" type="button" data-mode="needed">Needed</button>
      </div>

      <div id="mode-simple">
        <form id="simpleForm" class="gpa-form">
          <div class="grid">
            <input id="sEarned"   type="number" inputmode="decimal" min="0" step="0.01" placeholder="Points earned" />
            <input id="sPossible" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Points possible" />
          </div>
          <button class="btn primary" type="submit">Calculate</button>
        </form>
        <div id="simpleOut" class="gpa-result" style="margin-top:8px;"></div>
      </div>

      <div id="mode-weighted" hidden>
        <div id="rows"></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin:10px 0;">
          <button id="addRow" class="btn" type="button">Add category</button>
          <button id="calcWeighted" class="btn primary" type="button">Calculate Final</button>
        </div>
        <div style="color:var(--muted); margin-top:4px;">Weights should total 100%. If not, we’ll normalize automatically.</div>
        <div id="weightedOut" class="gpa-result" style="margin-top:8px;"></div>
      </div>

      <div id="mode-needed" hidden>
        <form id="needForm" class="gpa-form">
          <div class="grid">
            <input id="needCurrent" type="number" inputmode="decimal" step="0.01" min="0" max="100" placeholder="Current grade (%)" />
            <input id="needFinalWeight" type="number" inputmode="decimal" step="0.01" min="1" max="100" placeholder="Final exam weight (%)" />
            <input id="needTarget" type="number" inputmode="decimal" step="0.01" min="0" max="100" placeholder="Target course grade (%)" />
          </div>
          <button class="btn primary" type="submit">Calculate needed score</button>
        </form>
        <div id="needOut" class="gpa-result" style="margin-top:8px;"></div>
      </div>
    `;
    calcPanel.querySelector('.panel-inner')?.appendChild(wrap);

    // Weighted rows
    const rowsBox = $('#rows', wrap);
    function addRow(prefill = {}){
      const row = document.createElement('div');
      row.className = 'wrow';
      row.style.display = 'grid';
      row.style.gridTemplateColumns = 'minmax(120px,1.2fr) minmax(90px,1fr) minmax(90px,1fr) minmax(90px,1fr) auto';
      row.style.gap = '8px';
      row.style.marginTop = '8px';
      row.innerHTML = `
        <input type="text" placeholder="Category (e.g., Exams)" value="${prefill.name||''}" />
        <input type="number" inputmode="decimal" min="0" step="0.01" placeholder="Earned"  value="${prefill.earned??''}" />
        <input type="number" inputmode="decimal" min="0" step="0.01" placeholder="Possible" value="${prefill.possible??''}" />
        <input type="number" inputmode="decimal" min="0" step="0.01" placeholder="Weight %" value="${prefill.weight??''}" />
        <button class="btn danger" type="button" aria-label="Remove">✕</button>
      `;
      rowsBox.appendChild(row);
    }

    addRow({name:'Exams', weight:40});
    addRow({name:'Quizzes', weight:20});
    addRow({name:'Homework', weight:40});

    // Mode toggle
    const seg = wrap.querySelectorAll('[data-mode]');
    function switchMode(which){
      seg.forEach(b => b.classList.toggle('primary', b.dataset.mode===which));
      $('#mode-simple', wrap).hidden   = which !== 'simple';
      $('#mode-weighted', wrap).hidden = which !== 'weighted';
      $('#mode-needed', wrap).hidden   = which !== 'needed';
    }
    seg.forEach(b => b.addEventListener('click', () => switchMode(b.dataset.mode)));
    switchMode('simple');

    // Simple form calculation
    $('#simpleForm', wrap).addEventListener('submit', e => {
      e.preventDefault();
      const earned   = parseFloat($('#sEarned').value);
      const possible = parseFloat($('#sPossible').value);
      const out = $('#simpleOut');
      if (!(earned >= 0) || !(possible > 0)) { out.textContent = 'Enter valid numbers (possible must be > 0).'; return; }
      const pct = (earned / possible) * 100;
      out.textContent = `Score: ${pct.toFixed(2)}%`;
    });

    // Weighted calculation
    $('#addRow', wrap).addEventListener('click', () => addRow());
    rowsBox.addEventListener('click', e => { if (e.target.matches('.btn.danger')) e.target.closest('.wrow')?.remove(); });
    $('#calcWeighted', wrap).addEventListener('click', () => {
      const rows = $$('.wrow', wrap).map(row => {
        const [nameEl, eEl, pEl, wEl] = row.querySelectorAll('input');
        return {
          name: nameEl.value.trim() || 'Category',
          earned: parseFloat(eEl.value),
          possible: parseFloat(pEl.value),
          weight: parseFloat(wEl.value)
        };
      }).filter(r => (r.earned >= 0) && (r.possible > 0));

      const out = $('#weightedOut', wrap);
      if (!rows.length) { out.textContent = 'Add at least one valid category.'; return; }

      const hasAnyWeight = rows.some(r => r.weight > 0);
      const totalW = hasAnyWeight ? rows.reduce((s,r) => s + (r.weight>0 ? r.weight : 0), 0) : rows.length;

      if (totalW <= 0) { out.textContent = 'Please set weights or leave all blank for equal weighting.'; return; }

      let sum = 0;
      const breakdown = [];
      rows.forEach(r => {
        const pct = (r.earned / r.possible) * 100;
        const w   = hasAnyWeight ? (r.weight / totalW) : (1 / rows.length);
        sum += pct * w;
        breakdown.push({name:r.name, pct, w});
      });

      const lines = breakdown.map(b => `${b.name}: ${b.pct.toFixed(2)}% × ${(b.w*100).toFixed(1)}% = ${(b.pct*b.w).toFixed(2)}%`);
      out.innerHTML = `Final Grade: <strong>${sum.toFixed(2)}%</strong><div style="color:var(--muted); margin-top:6px;">${lines.join('<br>')}</div>`;
    });

    // Needed calculation
    $('#needForm', wrap).addEventListener('submit', e => {
      e.preventDefault();
      const cur = parseFloat($('#needCurrent').value);
      const w   = parseFloat($('#needFinalWeight').value);
      const tgt = parseFloat($('#needTarget').value);
      const out = $('#needOut');

      if (!isFinite(cur) || !isFinite(w) || !isFinite(tgt) || w<=0 || w>100) {
        out.textContent = 'Enter valid numbers. Final weight must be 1–100.';
        return;
      }
      const wf = w/100;
      const needed = (tgt - cur*(1 - wf)) / wf;
      if (!isFinite(needed)) { out.textContent = 'Check inputs.'; return; }

      const msg = needed > 100
        ? `You need ${needed.toFixed(2)}% (above 100%). It’s tough — aim for max boost and partial credit.`
        : `You need ${needed.toFixed(2)}% on the final to reach ${tgt}% overall.`;

      out.textContent = msg;
    });
  }

  // Build back bars once
  ensurePanelBar('timer', 'Study Timer');
  ensurePanelBar('planner', 'Task Planner');
  ensurePanelBar('calculator', 'Grade Calculator');

  // Boot
  ensureTimerSettings();
  buildGradeCalculator();
  enhancePlannerUI();
  renderHomeStats();
  renderTasks();
  navigate('home');
  onScroll();
});