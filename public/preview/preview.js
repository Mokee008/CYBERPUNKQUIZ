/**
 * CYBER_QUIZ 2077 // Engine & Sector Hub Controller
 * Night City Cyberpunk Theme with 5-Sector Selection Window,
 * Real-time question generation, Canvas FX, and Web Audio.
 */

// Application State
let sectorsData = [];
let selectedSector = null;
let sessionId = null;
let currentQuestion = null;
let currentQuestionId = null;
let timerInterval = null;
let timeLeft = 20;
let isMuted = true;
let isAnswering = false;
let sessionStats = { score: 0, streak: 0, currentNum: 1, total: 10 };

// Sector metadata for Cyberpunk 2077 lore
const CYBER_SECTOR_META = {
  CA: {
    code: 'SEC_01 // ARASAKA CORP',
    tag: 'CORPO_AUDIT',
    title: 'Chartered Accountancy & Tax',
    sub: 'Corporate governance, auditing (SA 200-700), Ind AS / IFRS, tax deductions, and balance sheets.'
  },
  Healthcare: {
    code: 'SEC_02 // TRAUMA TEAM',
    tag: 'MEDTECH_TRIAGE',
    title: 'Healthcare & Clinical Science',
    sub: 'Triage vitals, SpO2 hypoxemia, cardiovascular troponins, pharmacology, and renal physiology.'
  },
  Programming: {
    code: 'SEC_03 // NETRUNNER OPS',
    tag: 'CYBERDECK_CODE',
    title: 'Programming & Software Architecture',
    sub: 'B+ Tree indexes, circuit breakers, asynchronous event loops, Big-O complexity, and cybersecurity.'
  },
  Agriculture: {
    code: 'SEC_04 // BIOTECHNICA',
    tag: 'AGRI_FARMS',
    title: 'Agriculture & Agronomy',
    sub: 'Soil chemistry (NPK, pH, CEC), precision drip hydraulics, crop rotation, and IPM pest management.'
  },
  Biology: {
    code: 'SEC_05 // CYBERWARE BIO',
    tag: 'GENETICS_ATP',
    title: 'Cellular Biology & Genetics',
    sub: 'DNA replication, aerobic ATP respiration, Mendelian crosses, human physiology, and carrying capacity.'
  }
};

// Web Audio Synthesizer
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playCyberPop() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function playCyberBoom() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.45);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

// Terminal Logger
function logTerminal(message, type = 'info') {
  const terminal = document.getElementById('terminal-output');
  if (!terminal) return;
  const p = document.createElement('p');
  p.className = `log-line ${type}`;
  p.textContent = `> ${message}`;
  terminal.appendChild(p);
  terminal.scrollTop = terminal.scrollHeight;
}

// View Navigation
function switchView(viewId) {
  document.querySelectorAll('.cyber-view').forEach(view => {
    view.classList.remove('active');
  });
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
}

// Fetch and render sectors in Hub
async function loadSectors() {
  const grid = document.getElementById('sectors-grid');
  try {
    const res = await fetch('/api/v1/sectors');
    const data = await res.json();
    sectorsData = data.sectors || [];

    grid.innerHTML = '';

    // Render each of the 5 primary sectors
    sectorsData.forEach(sector => {
      const meta = CYBER_SECTOR_META[sector.id] || {
        code: `SEC // ${sector.id}`,
        tag: sector.id.toUpperCase(),
        title: sector.name,
        sub: sector.description
      };

      const tile = document.createElement('div');
      tile.className = 'sector-tile';
      tile.innerHTML = `
        <div>
          <div class="sector-tile-top">
            <span class="sector-code">${meta.code}</span>
            <span class="sector-count-pill" id="count-pill-${sector.id}">${sector.questionCount} UNITS</span>
          </div>
          <h3 class="sector-name">${meta.title}</h3>
          <p class="sector-desc">${meta.sub}</p>
        </div>
        <div class="sector-tile-actions">
          <button class="cyber-btn cyber-btn-yellow" onclick="handleJackIn('${sector.id}')">⚡ JACK IN</button>
          <button class="cyber-btn" onclick="handleGenerateSector('${sector.id}')">+ GEN 5</button>
        </div>
      `;
      grid.appendChild(tile);
    });

    // Add 6th tile for Full Mixed Matrix
    const mixedTile = document.createElement('div');
    mixedTile.className = 'sector-tile featured';
    mixedTile.innerHTML = `
      <div>
        <div class="sector-tile-top">
          <span class="sector-code" style="color: var(--cp-yellow);">SEC_ALL // FULL SPECTRUM</span>
          <span class="sector-count-pill" style="border-color: var(--cp-yellow); color: var(--cp-yellow);">ALL SECTORS</span>
        </div>
        <h3 class="sector-name" style="color: var(--cp-yellow);">NIGHT CITY OVERDRIVE</h3>
        <p class="sector-desc">Cross-domain matrix drill pulling dynamically from all 5 sectors. Maximum cognitive stress test.</p>
      </div>
      <div class="sector-tile-actions">
        <button class="cyber-btn cyber-btn-yellow" onclick="handleJackIn(null)">⚡ JACK IN (ALL)</button>
        <button class="cyber-btn cyber-btn-magenta" onclick="handleBulkGenerate()">⚡ REFILL ALL</button>
      </div>
    `;
    grid.appendChild(mixedTile);

    logTerminal(`Loaded ${sectorsData.length} active sectors from neural mainframe.`, 'success');
  } catch (err) {
    grid.innerHTML = `<div class="log-line warning" style="padding: 20px;">FAILED TO CONNECT TO SECTOR BUS: ${err.message}</div>`;
    logTerminal(`Error fetching sectors: ${err.message}`, 'warning');
  }
}

// Generate Questions for a Specific Sector on Demand
window.handleGenerateSector = async (sector) => {
  logTerminal(`Transmitting generation request for sector: ${sector}...`, 'info');
  try {
    const res = await fetch(`/api/v1/sectors/${encodeURIComponent(sector)}/generate?count=5`);
    const data = await res.json();
    logTerminal(`Success: +${data.count} fresh questions synthesized for ${sector}.`, 'success');

    // Update pill counter
    const pill = document.getElementById(`count-pill-${sector}`);
    if (pill) {
      const current = parseInt(pill.textContent, 10) || 0;
      pill.textContent = `${current + data.count} UNITS`;
      pill.style.background = 'rgba(252, 238, 10, 0.25)';
      setTimeout(() => { pill.style.background = 'rgba(0, 255, 102, 0.15)'; }, 600);
    }
  } catch (err) {
    logTerminal(`Generation error for ${sector}: ${err.message}`, 'warning');
  }
};

// Bulk Refill All 5 Sectors
window.handleBulkGenerate = async () => {
  logTerminal('Executing bulk matrix refill across all 5 sectors...', 'info');
  const btn = document.getElementById('bulk-generate-btn');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/v1/sectors/generate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countPerSector: 4 })
    });
    const data = await res.json();
    logTerminal(`Bulk sync complete: ${data.totalGenerated} questions generated across ${data.sectors.length} sectors!`, 'success');
    await loadSectors();
  } catch (err) {
    logTerminal(`Bulk refill failure: ${err.message}`, 'warning');
  } finally {
    if (btn) btn.disabled = false;
  }
};

// Start Quiz Session for Selected Sector
window.handleJackIn = async (sector) => {
  selectedSector = sector;
  const playerName = document.getElementById('player-name-input')?.value.trim() || 'V_Netrunner';
  const count = parseInt(document.getElementById('count-select')?.value, 10) || 10;

  logTerminal(`Initiating dive into [${sector || 'ALL SECTORS'}] for ${playerName} (${count} questions)...`, 'info');

  try {
    const payload = { playerName, count };
    if (sector) payload.category = sector;

    const res = await fetch('/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Failed to start session');
    }

    const data = await res.json();
    sessionId = data.sessionId;
    sessionStats = {
      score: 0,
      streak: 0,
      currentNum: 1,
      total: data.totalQuestions
    };

    document.getElementById('active-sector-tag').textContent = sector || 'ALL SECTORS';
    document.getElementById('total-q').textContent = data.totalQuestions;
    updateStatsDisplay();

    switchView('quiz-arena-view');
    await fetchNextQuestion();
  } catch (err) {
    alert(`Could not start quiz session: ${err.message}`);
    logTerminal(`Session launch aborted: ${err.message}`, 'warning');
  }
};

function updateStatsDisplay() {
  document.getElementById('current-num').textContent = String(sessionStats.currentNum).padStart(2, '0');
  document.getElementById('score-val').textContent = sessionStats.score;
  document.getElementById('streak-val').textContent = sessionStats.streak;
}

// Fetch Current Question
async function fetchNextQuestion() {
  if (!sessionId) return;
  clearInterval(timerInterval);
  isAnswering = false;

  document.getElementById('explanation-box').classList.remove('visible');
  document.getElementById('explanation-box').textContent = '';
  document.getElementById('effect-banner').classList.remove('visible');
  document.getElementById('next-action-bar').style.display = 'none';

  try {
    const res = await fetch(`/api/v1/sessions/${sessionId}/question`);
    if (!res.ok) {
      if (res.status === 400) {
        // Session complete
        await showSummary();
        return;
      }
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Failed to fetch question');
    }

    currentQuestion = await res.json();
    currentQuestionId = currentQuestion.id;
    sessionStats.currentNum = currentQuestion.number;
    updateStatsDisplay();

    // Render Question
    document.getElementById('question-diff-badge').textContent = `DIFF // ${currentQuestion.difficulty.toUpperCase()}`;
    document.getElementById('question-diff-badge').className = `cyber-badge badge-${currentQuestion.difficulty}`;
    document.getElementById('question-id-badge').textContent = `ID: #${currentQuestion.id}`;
    document.getElementById('question-text').textContent = currentQuestion.question;

    // Render 4 Options
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    currentQuestion.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="opt-prefix">[${letters[idx]}]</span><span class="opt-text">${optText}</span>`;
      btn.onclick = () => submitAnswer(idx, btn);
      container.appendChild(btn);
    });

    startTimer(currentQuestion.timeLimitSec || 20);
  } catch (err) {
    console.error(err);
  }
}

// Timer Countdown
function startTimer(seconds) {
  timeLeft = seconds;
  const fill = document.getElementById('timer-fill');
  const readout = document.getElementById('timer-sec');
  readout.textContent = timeLeft;
  fill.style.width = '100%';
  fill.className = 'timer-fill';

  const total = seconds;
  timerInterval = setInterval(() => {
    timeLeft--;
    readout.textContent = timeLeft;
    const pct = Math.max(0, (timeLeft / total) * 100);
    fill.style.width = `${pct}%`;

    if (timeLeft <= 5) fill.className = 'timer-fill danger';
    else if (timeLeft <= 10) fill.className = 'timer-fill warning';

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitAnswer(-1, null); // Timeout
    }
  }, 1000);
}

// Submit Answer
async function submitAnswer(selectedIndex, clickedBtn) {
  if (isAnswering) return;
  isAnswering = true;
  clearInterval(timerInterval);

  // Disable all options
  const allBtns = document.querySelectorAll('.option-btn');
  allBtns.forEach(b => { b.disabled = true; });

  if (clickedBtn) clickedBtn.classList.add('selected');

  try {
    const res = await fetch(`/api/v1/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: currentQuestionId,
        selectedIndex: selectedIndex >= 0 ? selectedIndex : 0
      })
    });

    const result = await res.json();

    // Highlight correct & wrong options
    allBtns.forEach((btn, idx) => {
      if (idx === result.correctIndex) {
        btn.classList.add('correct');
      } else if (idx === selectedIndex && !result.correct) {
        btn.classList.add('wrong');
      }
    });

    // Update state
    sessionStats.score = result.score;
    sessionStats.streak = result.streak;
    updateStatsDisplay();

    // Show explanation
    const expBox = document.getElementById('explanation-box');
    expBox.textContent = result.explanation;
    expBox.classList.add('visible');

    // Show effect banner
    const banner = document.getElementById('effect-banner');
    banner.textContent = result.effect.label || (result.correct ? 'NEURAL LOCK // CORRECT' : 'SYSTEM OVERHEAT // INCORRECT');
    banner.className = `effect-banner visible ${result.correct ? 'correct' : 'wrong'}`;

    // Fire sound & visual directive
    if (result.correct) playCyberPop();
    else playCyberBoom();

    runEffectDirective(result.effect);

    // Show Next button or automatically handle finish
    if (result.finished) {
      setTimeout(() => { showSummary(); }, 1800);
    } else {
      document.getElementById('next-action-bar').style.display = 'flex';
    }
  } catch (err) {
    console.error('Answer submission error:', err);
  }
}

// Show Final Mission Debrief
async function showSummary() {
  clearInterval(timerInterval);
  try {
    const res = await fetch(`/api/v1/sessions/${sessionId}/summary`);
    const sum = await res.json();

    document.getElementById('summary-score').textContent = sum.score;
    document.getElementById('summary-acc').textContent = `${sum.accuracy}%`;
    document.getElementById('summary-streak').textContent = sum.bestStreak;
    document.getElementById('summary-weakest').textContent = sum.weakestCategory || 'NONE';

    const breakdownBox = document.getElementById('summary-breakdown');
    breakdownBox.innerHTML = '';
    if (sum.categoryBreakdown) {
      Object.entries(sum.categoryBreakdown).forEach(([cat, stats]) => {
        if (stats.total > 0) {
          const row = document.createElement('div');
          row.style.cssText = 'display: flex; justify-content: space-between; padding: 6px 12px; font-family: var(--font-mono); font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.08);';
          row.innerHTML = `<span>${cat}</span><span style="color: var(--cp-cyan);">${stats.correct}/${stats.total} (${stats.accuracy}%)</span>`;
          breakdownBox.appendChild(row);
        }
      });
    }

    switchView('summary-view');
  } catch (err) {
    console.error('Summary error:', err);
  }
}

// Directives Canvas Renderer (Cyberpunk Colors)
const canvas = document.getElementById('canvas-overlay');
const ctx = canvas ? canvas.getContext('2d') : null;
let animationFrameId = null;
let activeParticles = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function runEffectDirective(directive) {
  if (!ctx || !directive) return;
  if (directive.type === 'paper_burst') {
    triggerCyberBurst(directive);
  } else if (directive.type === 'bomb_blast') {
    triggerCyberBlast(directive);
  }
}

// Cyber Burst Effect (Confetti & sparks with Cyberpunk Yellow, Cyan, Magenta)
function triggerCyberBurst(d) {
  const originX = (canvas.width * (d.originPct?.x || 50)) / 100;
  const originY = (canvas.height * (d.originPct?.y || 60)) / 100;
  const count = d.particleCount || 100;
  const palette = ['#FCEE0A', '#00F0FF', '#FF003C', '#00FF66', '#FFFFFF'];

  activeParticles = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * (6 + d.intensity * 2.5);
    activeParticles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (3 + Math.random() * 3),
      size: 5 + Math.random() * 8,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: 1,
      decay: 0.012 + Math.random() * 0.015,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2
    });
  }

  cancelAnimationFrame(animationFrameId);
  function renderParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (let p of activeParticles) {
      if (p.alpha > 0) {
        alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }
    if (alive) animationFrameId = requestAnimationFrame(renderParticles);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  renderParticles();
}

// Cyber Blast Effect (Screen Shake + Shockwave + Glitch Flash)
function triggerCyberBlast(d) {
  const flash = document.getElementById('flash-overlay');
  const app = document.getElementById('app-wrapper');

  // 1. Neon Red Flash
  if (flash) {
    flash.style.backgroundColor = 'rgba(255, 0, 60, 0.45)';
    flash.style.opacity = '1';
    setTimeout(() => { flash.style.opacity = '0'; }, 180);
  }

  // 2. Screen Shake
  if (app) {
    const amp = d.screenShake?.amplitudePx || 14;
    const ms = d.screenShake?.ms || 450;
    const start = performance.now();
    function shake() {
      const elapsed = performance.now() - start;
      if (elapsed < ms) {
        const decay = 1 - elapsed / ms;
        const dx = (Math.random() * 2 - 1) * amp * decay;
        const dy = (Math.random() * 2 - 1) * amp * decay;
        app.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(shake);
      } else {
        app.style.transform = 'translate(0, 0)';
      }
    }
    shake();
  }

  // 3. Shockwave Rings on Canvas
  const originX = canvas.width / 2;
  const originY = canvas.height / 2;
  let ringRadius = 10;
  let ringAlpha = 1;

  cancelAnimationFrame(animationFrameId);
  function renderBlast() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (ringAlpha > 0) {
      ringRadius += 16;
      ringAlpha -= 0.035;

      ctx.save();
      ctx.beginPath();
      ctx.arc(originX, originY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 0, 60, ${Math.max(0, ringAlpha)})`;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Second Cyan inner ring
      ctx.beginPath();
      ctx.arc(originX, originY, ringRadius * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${Math.max(0, ringAlpha)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(renderBlast);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  renderBlast();
}

// Dev panel effect triggers
window.fireDevEffect = (type, intensity) => {
  let directive;
  if (type === 'paper_burst') {
    directive = {
      type: 'paper_burst',
      intensity,
      particleCount: Math.round(70 + (intensity - 1) * 35),
      label: `NEURAL BURST // LV.${intensity}`
    };
    playCyberPop();
  } else {
    directive = {
      type: 'bomb_blast',
      intensity,
      screenShake: { amplitudePx: Math.round(10 + (intensity - 1) * 5), ms: 450 },
      label: `SYSTEM CRITICAL // LV.${intensity}`
    };
    playCyberBoom();
  }
  runEffectDirective(directive);
};

// Event Listeners
document.getElementById('mute-toggle')?.addEventListener('click', (e) => {
  isMuted = !isMuted;
  e.target.textContent = isMuted ? 'AUDIO: OFF' : 'AUDIO: ON';
});

document.getElementById('dev-panel-toggle')?.addEventListener('click', () => {
  document.getElementById('dev-panel').classList.toggle('open');
});

document.getElementById('abort-btn')?.addEventListener('click', () => {
  clearInterval(timerInterval);
  switchView('sector-hub-view');
  loadSectors();
});

document.getElementById('next-q-btn')?.addEventListener('click', () => {
  fetchNextQuestion();
});

document.getElementById('return-hub-btn')?.addEventListener('click', () => {
  switchView('sector-hub-view');
  loadSectors();
});

document.getElementById('play-again-btn')?.addEventListener('click', () => {
  handleJackIn(selectedSector);
});

document.getElementById('bulk-generate-btn')?.addEventListener('click', () => {
  handleBulkGenerate();
});

// Initialize on Load
loadSectors();
