/* =========================================================
   bananebrot.ch – «Mal öppis»: interaktive Kunst
   Maus oder Finger hinterlassen farbige Fäden, die einem
   unsichtbaren Strömungsfeld folgen. Ohne Eingabe malt
   ein Geister-Pinsel von selbst.
   ========================================================= */
(() => {
  'use strict';

  const canvas = document.getElementById('art');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const toast = window.siteToast || (() => {});
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PALETTES = [
    { name: 'Banane', colors: ['#ffd23f', '#f2b705', '#ff9f1c', '#ffe680'] },
    { name: 'Sunneuntergang', colors: ['#ff5e62', '#ff9966', '#ffd23f', '#c94b8f'] },
    { name: 'Meer', colors: ['#45e0f0', '#0a7ea4', '#7fd3ee', '#2ec4b6'] },
    { name: 'Schoggi', colors: ['#8a4b1c', '#c47a35', '#e8b56a', '#4a2a12'] },
    { name: 'Regeboge', colors: ['#ff5e62', '#ffd23f', '#4fae78', '#45a0f0', '#a66cff'] }
  ];
  let paletteIndex = 0;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let particles = [];
  let pointer = null;
  let lastInput = 0;
  let t = 0;
  let hue = 0;

  const bg = () => getComputedStyle(document.documentElement).getPropertyValue('--surface-solid').trim() || '#fffdf6';

  function clear() {
    ctx.fillStyle = bg();
    ctx.fillRect(0, 0, W, H);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (W && Math.abs(rect.width - W) < 1 && Math.abs(rect.height - H) < 1) return; // z. B. Adressleiste am Handy
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clear();
  }

  // weiches, sich langsam veränderndes Strömungsfeld
  function flow(x, y) {
    const s = 0.0045;
    return Math.sin(x * s + t * 0.25) * 1.6 + Math.cos(y * s * 1.3 - t * 0.2) * 1.6 + Math.sin((x + y) * s * 0.5) * 0.8;
  }

  function spawn(x, y, n) {
    const colors = PALETTES[paletteIndex].colors;
    for (let i = 0; i < n; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        life: 1,
        decay: 0.006 + Math.random() * 0.01,
        speed: 0.8 + Math.random() * 1.8,
        width: 0.6 + Math.random() * 2.4,
        color: colors[(hue + i) % colors.length]
      });
    }
    hue++;
    if (particles.length > 1400) particles.splice(0, particles.length - 1400);
  }

  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener('pointermove', (e) => {
    pointer = toLocal(e);
    lastInput = performance.now();
  });
  canvas.addEventListener('pointerdown', (e) => {
    pointer = toLocal(e);
    lastInput = performance.now();
    spawn(pointer.x, pointer.y, 40);
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerleave', () => { pointer = null; });

  function step() {
    t += 0.016;
    const now = performance.now();

    // Eingabe → neue Fäden
    if (pointer && now - lastInput < 120) spawn(pointer.x, pointer.y, 4);

    // Geister-Pinsel, wenn niemand malt
    if (now - lastInput > 3000) {
      const gx = W / 2 + Math.sin(t * 0.7) * W * 0.38 + Math.sin(t * 1.9) * 30;
      const gy = H / 2 + Math.sin(t * 1.1 + 1) * H * 0.34;
      spawn(gx, gy, 2);
    }

    for (const p of particles) {
      const a = flow(p.x, p.y);
      const nx = p.x + Math.cos(a) * p.speed;
      const ny = p.y + Math.sin(a) * p.speed;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life) * 0.55;
      ctx.lineWidth = p.width * p.life;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx;
      p.y = ny;
      p.life -= p.decay;
    }
    ctx.globalAlpha = 1;
    particles = particles.filter((p) => p.life > 0 && p.x > -20 && p.x < W + 20 && p.y > -20 && p.y < H + 20);

    requestAnimationFrame(step);
  }

  // ---------- Knöpfe ----------
  const btnClear = document.getElementById('art-clear');
  const btnPalette = document.getElementById('art-palette');
  const btnSave = document.getElementById('art-save');

  if (btnClear) btnClear.addEventListener('click', () => { particles = []; clear(); });
  if (btnPalette) {
    btnPalette.addEventListener('click', () => {
      paletteIndex = (paletteIndex + 1) % PALETTES.length;
      btnPalette.textContent = `🎨 Farbe: ${PALETTES[paletteIndex].name}`;
    });
    btnPalette.textContent = `🎨 Farbe: ${PALETTES[paletteIndex].name}`;
  }
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      try {
        const link = document.createElement('a');
        link.download = 'bananebrot-kunstwerk.png';
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast('🖼️ Kunstwerk gespeichert!');
      } catch (e) {
        toast('Speichern hat leider nicht geklappt.');
      }
    });
  }

  window.addEventListener('resize', resize);
  new MutationObserver(() => { particles = []; clear(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  resize();
  if (reduceMotion) {
    // Ohne Animation: ein einzelnes, ruhiges Bild malen
    for (let i = 0; i < 400; i++) { t += 0.05; spawn(W / 2 + Math.sin(t) * W * 0.35, H / 2 + Math.cos(t * 1.3) * H * 0.3, 1); }
    for (let k = 0; k < 120; k++) {
      for (const p of particles) {
        const a = flow(p.x, p.y);
        const nx = p.x + Math.cos(a) * p.speed;
        const ny = p.y + Math.sin(a) * p.speed;
        ctx.strokeStyle = p.color; ctx.globalAlpha = 0.4; ctx.lineWidth = p.width;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny;
      }
    }
    ctx.globalAlpha = 1;
  } else {
    requestAnimationFrame(step);
  }
})();
