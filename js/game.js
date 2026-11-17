/* =========================================================
   «Bananebrot-Bäcker» – ein kleines Canvas-Spiel
   Fang die Zutaten mit der Schüssel und backe Bananenbrote!
   Steuerung: Maus / Finger oder ← → bzw. A D, P = Pause
   ========================================================= */
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('game-overlay');
  const ovTitle = document.getElementById('ov-title');
  const ovText = document.getElementById('ov-text');
  const ovBtn = document.getElementById('ov-btn');
  const store = window.siteStore || { get() { return null; }, set() {} };
  const FACTS = window.BANANA_FACTS || [];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const TAU = Math.PI * 2;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Logische Breite: 960 am Computer, 540 auf dem Handy (dort grösser dargestellt)
  let W = 960;
  let H = 600;
  let scale = 1;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width < 600 ? 540 : 960;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    scale = canvas.width / W;
    H = canvas.height / scale;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Zutaten ----------
  const ITEMS = {
    banana: { emoji: '🍌', points: 2, good: true, label: 'Banane' },
    egg: { emoji: '🥚', points: 2, good: true, label: 'Ei' },
    flour: { emoji: '🌾', points: 2, good: true, label: 'Mehl' },
    butter: { emoji: '🧈', points: 2, good: true, label: 'Butter' },
    choc: { emoji: '🍫', points: 5, good: true, label: 'Schoggi' },
    pickle: { emoji: '🥒', good: false, label: 'Essiggurke' },
    sock: { emoji: '🧦', good: false, label: 'Socke' },
    fish: { emoji: '🐟', good: false, label: 'Fisch' },
    golden: { emoji: '🍌', points: 10, good: true, golden: true, label: 'Goldene Banane' }
  };
  const RECIPE = { banana: 3, egg: 1, flour: 1, butter: 1 };
  const RECIPE_KEYS = Object.keys(RECIPE);
  const YUCK = ['Igitt!', 'Wäh!', 'Nei danke!', 'Bäh!', 'Gaht’s no?!'];

  let state = 'menu'; // menu | play | pause | over
  let bowl, items, floaters, particles, score, lives, loaves, time, spawnT, power, inv, shake, have;
  let best = Number(store.get('bananebrot-best')) || 0;
  let t = 0;
  let last = performance.now();
  let pointerX = null;
  const keys = {};

  function reset() {
    bowl = { x: W / 2, vx: 0, w: 150 };
    items = [];
    floaters = [];
    particles = [];
    score = 0;
    lives = 3;
    loaves = 0;
    time = 0;
    spawnT = 0.6;
    power = 0;
    inv = 0;
    shake = 0;
    have = { banana: 0, egg: 0, flour: 0, butter: 0 };
  }
  reset();

  // ---------- Zustände ----------
  function showOverlay(title, html, buttonText) {
    ovTitle.textContent = title;
    ovText.innerHTML = html;
    ovBtn.textContent = buttonText;
    overlay.hidden = false;
    ovBtn.focus({ preventScroll: true });
  }
  function start() {
    reset();
    state = 'play';
    overlay.hidden = true;
    last = performance.now();
    canvas.focus({ preventScroll: true });
  }
  function pause() {
    if (state !== 'play') return;
    state = 'pause';
    showOverlay('Pause ⏸️', 'Der Teig ruht. Weiter geht’s, sobald du bereit bist.', 'Weiter backen');
  }
  function resume() {
    state = 'play';
    overlay.hidden = true;
    last = performance.now();
    canvas.focus({ preventScroll: true });
  }
  function gameOver() {
    state = 'over';
    const isBest = score > best;
    if (isBest) {
      best = score;
      store.set('bananebrot-best', String(best));
    }
    const fact = FACTS.length ? FACTS[Math.floor(Math.random() * FACTS.length)] : '';
    const loafText = loaves === 1 ? '1 Bananenbrot' : `${loaves} Bananenbrote`;
    showOverlay(
      isBest ? '🏆 Neuer Rekord!' : 'Feierabend in der Backstube 🧑‍🍳',
      `Du hast <strong>${loafText}</strong> gebacken und <strong>${score}</strong> Punkte gesammelt. Rekord: <strong>${best}</strong>.` +
        (fact ? `<small>🍌 Wusstest du? ${fact}</small>` : ''),
      'Nochmal backen'
    );
  }
  ovBtn.addEventListener('click', () => (state === 'pause' ? resume() : start()));

  // ---------- Eingabe ----------
  const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.key];
    if (k && state === 'play') {
      keys[k] = true;
      pointerX = null;
      e.preventDefault();
    }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (state === 'play') pause();
      else if (state === 'pause') resume();
    }
    if ((e.key === ' ' || e.key === 'Enter') && state !== 'play' && document.activeElement !== ovBtn) {
      e.preventDefault();
      if (state === 'pause') resume(); else start();
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.key];
    if (k) keys[k] = false;
  });
  window.addEventListener('blur', () => { keys.left = false; keys.right = false; });

  function toLogicalX(e) {
    const r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * W;
  }
  canvas.addEventListener('pointermove', (e) => { if (state === 'play') pointerX = toLogicalX(e); });
  canvas.addEventListener('pointerdown', (e) => {
    if (state !== 'play') return;
    pointerX = toLogicalX(e);
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // ---------- Spiellogik ----------
  function pickType() {
    const weights = [];
    for (const k of RECIPE_KEYS) {
      const needed = have[k] < RECIPE[k];
      weights.push([k, (k === 'banana' ? 2.2 : 1) * (needed ? 1.4 : 0.5)]);
    }
    weights.push(['choc', 0.7]);
    const bad = Math.min(3.2, 1.1 + loaves * 0.25 + time / 90);
    weights.push(['pickle', bad / 3], ['sock', bad / 3], ['fish', bad / 3]);
    if (power <= 0) weights.push(['golden', 0.12]);
    const total = weights.reduce((s, w) => s + w[1], 0);
    let r = Math.random() * total;
    for (const [k, w] of weights) {
      r -= w;
      if (r <= 0) return k;
    }
    return 'banana';
  }

  function spawn() {
    const type = pickType();
    const diff = Math.min(2.1, 1 + time / 70 + loaves * 0.06);
    items.push({
      type,
      x: 40 + Math.random() * (W - 80),
      y: -40,
      vy: (150 + Math.random() * 90) * diff,
      rot: Math.random() * TAU,
      vr: (Math.random() - 0.5) * 4,
      r: 24,
      dead: false
    });
  }

  function floater(x, y, text, color, size = 22) {
    floaters.push({ x, y, text, color, size, life: 1.1 });
  }

  function burst(x, y, colors, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = 80 + Math.random() * 220;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.9 + Math.random() * 0.5, size: 3 + Math.random() * 5, color: colors[i % colors.length] });
    }
  }

  function recipeDone() {
    return RECIPE_KEYS.every((k) => have[k] >= RECIPE[k]);
  }

  function catchItem(item) {
    const def = ITEMS[item.type];
    item.dead = true;
    const top = H - 70;
    if (def.good) {
      const mult = power > 0 ? 2 : 1;
      score += def.points * mult;
      if (def.golden) {
        power = 8;
        floater(item.x, top - 30, '✨ Goldene Banane! Doppelte Punkte', '#ffcf2e', 24);
        burst(item.x, top, ['#ffd23f', '#fff1a8', '#f2b705'], 26);
        return;
      }
      floater(item.x, top - 20, `+${def.points * mult}`, '#2e7d32');
      if (RECIPE[item.type] !== undefined && have[item.type] < RECIPE[item.type]) have[item.type]++;
      if (recipeDone()) bake();
    } else if (power > 0) {
      score += 3;
      floater(item.x, top - 20, `+3 ${def.label} weggeschnippt`, '#2e7d32', 18);
    } else if (inv <= 0) {
      lives--;
      inv = 1.2;
      shake = 0.35;
      floater(item.x, top - 20, `${YUCK[Math.floor(Math.random() * YUCK.length)]} ${def.emoji}`, '#d84315', 26);
      if (lives <= 0) gameOver();
    }
  }

  function bake() {
    loaves++;
    if (window.countBakedLoaf) window.countBakedLoaf(); // weltweiter Bananebrot-Zähler
    score += 30;
    have = { banana: 0, egg: 0, flour: 0, butter: 0 };
    floater(bowl.x, H - 150, '🍞 Bananenbrot gebacken! +30', '#8a4b1c', 28);
    burst(bowl.x, H - 90, ['#c47a35', '#8a4b1c', '#ffd23f', '#e8b56a'], 34);
    particles.push({ x: bowl.x, y: H - 90, vx: 0, vy: -90, life: 1.6, size: 0, loaf: true });
    if (loaves % 3 === 0 && lives < 3) {
      lives++;
      floater(bowl.x, H - 190, '❤️ Extra-Leben', '#d84315', 22);
    }
  }

  function update(dt) {
    t += dt;

    if (state === 'menu') {
      bowl.x = W / 2 + Math.sin(t * 0.8) * W * 0.3;
      if (Math.random() < dt * 1.5) spawn();
      for (const item of items) { item.y += item.vy * 0.5 * dt; item.rot += item.vr * dt; if (item.y > H + 50) item.dead = true; }
      items = items.filter((i) => !i.dead);
      return;
    }
    if (state !== 'play') return;

    time += dt;
    power = Math.max(0, power - dt);
    inv = Math.max(0, inv - dt);
    shake = Math.max(0, shake - dt);

    // Schüssel bewegen
    bowl.w = power > 0 ? 220 : 150;
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (pointerX !== null && !dir) {
      bowl.vx = (pointerX - bowl.x) * 12;
    } else {
      bowl.vx += dir * 3200 * dt;
      bowl.vx *= Math.pow(0.001, dt);
    }
    bowl.vx = clamp(bowl.vx, -900, 900);
    bowl.x = clamp(bowl.x + bowl.vx * dt, bowl.w / 2, W - bowl.w / 2);

    // Neue Zutaten
    spawnT -= dt;
    if (spawnT <= 0) {
      spawn();
      spawnT = Math.max(0.28, 0.85 - time / 150 - loaves * 0.03) * (0.6 + Math.random() * 0.8);
    }

    // Fallen & fangen
    const top = H - 70;
    for (const item of items) {
      item.y += item.vy * dt;
      item.rot += item.vr * dt;
      if (!item.dead && state === 'play' && item.y + item.r >= top - 6 && item.y < top + 24 && Math.abs(item.x - bowl.x) < bowl.w / 2 + 6) {
        catchItem(item);
      }
      if (item.y > H + 50) item.dead = true;
    }
    items = items.filter((i) => !i.dead);

    for (const f of floaters) { f.y -= 45 * dt; f.life -= dt; }
    floaters = floaters.filter((f) => f.life > 0);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.loaf) p.vy += 600 * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
  }

  // ---------- Zeichnen ----------
  function palette() {
    const dark = document.documentElement.dataset.theme === 'dark';
    return dark
      ? { wall: '#2a1a0f', tile: 'rgba(255,220,160,0.05)', counter: '#4a2c17', counterTop: '#6b4325', hud: '#f8ead4', pill: 'rgba(0,0,0,0.35)', window: '#0d1a2b', star: '#fff3c4' }
      : { wall: '#fff3d1', tile: 'rgba(160,110,40,0.10)', counter: '#c58a52', counterTop: '#e0a96d', hud: '#3b2414', pill: 'rgba(255,255,255,0.75)', window: '#9fd8f5', star: '#fff' };
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawKitchen(p) {
    ctx.fillStyle = p.wall;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    // Kacheln
    ctx.strokeStyle = p.tile;
    ctx.lineWidth = 2;
    const size = 48;
    for (let x = 0; x <= W; x += size) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - 40); ctx.stroke(); }
    for (let y = 0; y <= H - 40; y += size) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // Fenster
    const wx = W - 190;
    const wy = 135;
    ctx.fillStyle = p.window;
    roundRect(wx, wy, 140, 110, 10);
    ctx.fill();
    ctx.fillStyle = p.star;
    if (document.documentElement.dataset.theme === 'dark') {
      ctx.beginPath(); ctx.arc(wx + 100, wy + 32, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = p.window; ctx.beginPath(); ctx.arc(wx + 108, wy + 27, 12, 0, TAU); ctx.fill();
      ctx.fillStyle = p.star;
      for (const [sx, sy] of [[30, 30], [55, 70], [20, 85], [80, 90]]) { ctx.fillRect(wx + sx, wy + sy, 3, 3); }
    } else {
      ctx.beginPath(); ctx.arc(wx + 105, wy + 35, 16, 0, TAU); ctx.fillStyle = '#ffe066'; ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(wx + 45 + Math.sin(t * 0.3) * 10, wy + 70, 26, 10, 0, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = p.counter;
    ctx.lineWidth = 6;
    roundRect(wx, wy, 140, 110, 10);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx + 70, wy); ctx.lineTo(wx + 70, wy + 110); ctx.moveTo(wx, wy + 55); ctx.lineTo(wx + 140, wy + 55); ctx.stroke();
    // Arbeitsfläche
    ctx.fillStyle = p.counter;
    ctx.fillRect(-20, H - 36, W + 40, 60);
    ctx.fillStyle = p.counterTop;
    ctx.fillRect(-20, H - 40, W + 40, 8);
  }

  function drawEmoji(emoji, x, y, size, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.font = `${size}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }

  function drawItem(item) {
    const def = ITEMS[item.type];
    if (def.golden) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(t * 2);
      ctx.fillStyle = 'rgba(255, 210, 63, 0.35)';
      for (let i = 0; i < 8; i++) {
        ctx.rotate(TAU / 8);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6, -40); ctx.lineTo(6, -40); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 25;
      drawEmoji('🍌', item.x, item.y, 50, item.rot);
      ctx.restore();
      return;
    }
    drawEmoji(def.emoji, item.x, item.y, 42, item.rot);
  }

  function drawBowl(p) {
    const top = H - 70;
    const half = bowl.w / 2;
    const x = bowl.x;
    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(x, H - 34, half * 0.8, 7, 0, 0, TAU); ctx.fill();
    // Kochlöffel
    ctx.strokeStyle = '#a0662f';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + half * 0.3, top + 5); ctx.lineTo(x + half * 0.75, top - 55); ctx.stroke();
    ctx.fillStyle = '#a0662f';
    ctx.beginPath(); ctx.ellipse(x + half * 0.78, top - 62, 9, 14, 0.6, 0, TAU); ctx.fill();
    // Innenseite
    ctx.fillStyle = '#6f8fa6';
    ctx.beginPath(); ctx.ellipse(x, top, half, 13, 0, 0, TAU); ctx.fill();
    // Teig, wächst mit dem Fortschritt
    const done = RECIPE_KEYS.reduce((s, k) => s + Math.min(have[k], RECIPE[k]), 0);
    const total = RECIPE_KEYS.reduce((s, k) => s + RECIPE[k], 0);
    const prog = done / total;
    if (prog > 0) {
      ctx.fillStyle = '#f3d68b';
      ctx.beginPath(); ctx.ellipse(x, top + 2, (half - 10) * (0.6 + prog * 0.4), 6 + prog * 20, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#8a4b1c';
      for (let i = 0; i < Math.round(prog * 6); i++) {
        ctx.beginPath(); ctx.arc(x - half * 0.4 + i * half * 0.16, top - 3 - (i % 2) * prog * 8, 2.5, 0, TAU); ctx.fill();
      }
    }
    // Schüssel aussen
    const grad = ctx.createLinearGradient(x - half, 0, x + half, 0);
    grad.addColorStop(0, '#5aa9d6');
    grad.addColorStop(0.5, '#8fd0f0');
    grad.addColorStop(1, '#4b95c2');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - half, top);
    ctx.bezierCurveTo(x - half + 6, top + 44, x - half * 0.45, top + 44, x - half * 0.4, top + 44);
    ctx.lineTo(x + half * 0.4, top + 44);
    ctx.bezierCurveTo(x + half * 0.45, top + 44, x + half - 6, top + 44, x + half, top);
    ctx.ellipse(x, top, half, 13, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    // Streifen & Rand
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(x, top + 16, half * 0.9, 9, 0, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#3d7fa8';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, top, half, 13, 0, 0, TAU); ctx.stroke();

    if (power > 0 && (power > 2 || Math.floor(t * 8) % 2 === 0)) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,210,63,${0.6 + 0.3 * Math.sin(t * 10)})`;
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x, top + 18, half + 18, 42, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }

  function drawHud(p) {
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = p.hud;
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.fillText(`Punkte: ${score}`, 20, 16);
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.globalAlpha = 0.75;
    ctx.fillText(`Rekord: ${best}`, 22, 50);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'right';
    ctx.font = `26px ${EMOJI_FONT}`;
    ctx.fillText('❤️'.repeat(Math.max(0, lives)) + '🤍'.repeat(Math.max(0, 3 - lives)), W - 20, 16);
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(`🍞 × ${loaves}`, W - 22, 52);

    // Rezept-Karte
    const entries = RECIPE_KEYS.map((k) => [ITEMS[k].emoji, have[k], RECIPE[k]]);
    const cellW = 64;
    const cardW = entries.length * cellW + 92;
    ctx.fillStyle = p.pill;
    roundRect(16, 78, cardW, 40, 20);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = p.hud;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText('Rezept:', 30, 98);
    entries.forEach(([emoji, got, need], i) => {
      const cx = 96 + i * cellW;
      ctx.font = `22px ${EMOJI_FONT}`;
      ctx.globalAlpha = got >= need ? 1 : 0.55;
      ctx.fillText(emoji, cx, 99);
      ctx.globalAlpha = 1;
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.fillStyle = got >= need ? '#2e7d32' : p.hud;
      ctx.fillText(got >= need ? '✓' : `${got}/${need}`, cx + 27, 99);
      ctx.fillStyle = p.hud;
    });

    if (power > 0) {
      const bw = 140;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(W - 20 - bw, 84, bw, 8);
      ctx.fillStyle = '#f2b705';
      ctx.fillRect(W - 20 - bw, 84, bw * (power / 8), 8);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillStyle = p.hud;
      ctx.fillText('✨ Goldene Banane ×2', W - 20, 96);
    }
  }

  function draw() {
    const p = palette();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (shake > 0) {
      const m = (shake / 0.35) * 10;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    drawKitchen(p);
    for (const item of items) drawItem(item);

    if (inv <= 0 || Math.floor(t * 12) % 2 === 0) drawBowl(p);

    for (const pt of particles) {
      ctx.globalAlpha = clamp(pt.life, 0, 1);
      if (pt.loaf) {
        drawEmoji('🍞', pt.x, pt.y, 64, Math.sin(t * 6) * 0.15);
      } else {
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      }
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.font = `800 ${f.size}px system-ui, ${EMOJI_FONT}`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (state !== 'menu') drawHud(p);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
