/* =========================================================
   bananebrot.ch – Rezeptseite
   Mengen umrechnen, Schritte abhaken, Reife-Check & Back-Timer
   ========================================================= */
(() => {
  'use strict';
  const toast = window.siteToast || (() => {});

  // ---------- Mengen (1 oder 2 Brote) ----------
  const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  function formatQty(value) {
    const whole = Math.floor(value);
    const frac = Math.round((value - whole) * 100) / 100;
    const fracText = FRACTIONS[frac] || (frac ? String(frac).replace('0.', ',') : '');
    if (!whole) return fracText || '0';
    return `${whole}${fracText}`;
  }
  function unitText(unit, value) {
    if (unit === 'Prise' && value > 1) return 'Prisen';
    return unit;
  }
  function renderAmounts(mult) {
    document.querySelectorAll('[data-qty]').forEach((el) => {
      const value = Number(el.dataset.qty) * mult;
      const unit = el.dataset.unit;
      el.textContent = unit ? `${formatQty(value)} ${unitText(unit, value)}` : formatQty(value);
    });
    document.querySelectorAll('[data-sg]').forEach((el) => {
      el.textContent = mult > 1 ? el.dataset.pl : el.dataset.sg;
    });
  }
  const multButtons = document.querySelectorAll('[data-mult]');
  multButtons.forEach((btn) => btn.addEventListener('click', () => {
    multButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const mult = Number(btn.dataset.mult);
    renderAmounts(mult);
    if (mult === 2) toast('🍞🍞 Doppelte Menge: eins für dich, eins zum Teilen. Oder beide für dich.');
  }));
  renderAmounts(1);

  // ---------- Schritte abhaken ----------
  const stepBoxes = document.querySelectorAll('#steps input');
  const bar = document.getElementById('step-progress');
  let celebrated = false;
  function updateProgress() {
    const done = [...stepBoxes].filter((b) => b.checked).length;
    if (bar) bar.style.width = `${(done / stepBoxes.length) * 100}%`;
    if (done === stepBoxes.length && !celebrated) {
      celebrated = true;
      toast('🎉 Fertig! En Guete!');
    }
    if (done < stepBoxes.length) celebrated = false;
  }
  stepBoxes.forEach((b) => b.addEventListener('change', updateProgress));
  updateProgress();

  // ---------- Reife-Check ----------
  const slider = document.getElementById('ripe');
  const banana = document.getElementById('ripe-banana');
  const spotsGroup = document.getElementById('ripe-spots');
  const verdict = document.getElementById('ripe-verdict');
  const STAGES = [
    { fill: '#b5d34f', stroke: '#6f8a1f', spots: 0, text: '🥒 Noch viel zu grün! Gib ihnen ein paar Tage. Tipp: In einer Papiertüte neben einem Apfel reifen sie schneller.' },
    { fill: '#ffd23f', stroke: '#c9a200', spots: 0, text: '🙂 Perfekt zum Essen, fürs Bananenbrot aber noch etwas zu wenig süss.' },
    { fill: '#f9c932', stroke: '#c9a200', spots: 7, text: '👍 Schon ganz gut! Die braunen Punkte zeigen: Jetzt wird’s süss.' },
    { fill: '#c98a3e', stroke: '#7a4a14', spots: 16, text: '🎉 Perfekt! Genau so müssen Bananen fürs Bananenbrot aussehen.' },
    { fill: '#3d2a18', stroke: '#1e140a', spots: 0, text: '🏆 Sieht schlimm aus, ist aber der Jackpot. Solange nichts schimmelt: ab in den Teig!' }
  ];
  // feste Positionen für die Flecken (entlang der Bananenform)
  const SPOT_POS = [
    [30, 36], [44, 46], [58, 52], [72, 54], [86, 51], [100, 46], [112, 38], [38, 44], [52, 50], [66, 55],
    [80, 54], [94, 49], [106, 42], [24, 32], [120, 33], [62, 49]
  ];
  function renderRipeness() {
    if (!slider || !banana) return;
    const stage = STAGES[Number(slider.value)];
    banana.setAttribute('fill', stage.fill);
    banana.setAttribute('stroke', stage.stroke);
    spotsGroup.innerHTML = SPOT_POS.slice(0, stage.spots)
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${1.5 + (i % 3) * 0.8}"/>`)
      .join('');
    verdict.textContent = stage.text;
  }
  if (slider) {
    slider.addEventListener('input', renderRipeness);
    renderRipeness();
  }

  // ---------- Back-Timer ----------
  const clock = document.getElementById('timer-clock');
  const box = document.getElementById('timer');
  const startBtn = document.getElementById('timer-start');
  const resetBtn = document.getElementById('timer-reset');
  if (!clock || !startBtn) return;

  const DEFAULT = 55 * 60;
  let remaining = DEFAULT;
  let endAt = null;
  let tick = null;
  let audioCtx = null;
  const baseTitle = document.title;
  let titleBlink = null;

  function fmt(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  function render() {
    clock.textContent = fmt(remaining);
    if (endAt) document.title = `⏲️ ${fmt(remaining)} · ${baseTitle}`;
  }
  function beep() {
    if (!audioCtx) return;
    try {
      [0, 0.35, 0.7].forEach((offset) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const t0 = audioCtx.currentTime + offset;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        osc.start(t0);
        osc.stop(t0 + 0.3);
      });
    } catch (e) { /* kein Ton möglich */ }
  }
  function stop() {
    clearInterval(tick);
    tick = null;
    endAt = null;
    startBtn.textContent = '▶ Start';
  }
  function finish() {
    stop();
    remaining = 0;
    render();
    box.classList.add('done');
    beep();
    toast('🍞 Zeit um! Jetzt die Stäbchenprobe machen.');
    let on = false;
    clearInterval(titleBlink);
    titleBlink = setInterval(() => {
      on = !on;
      document.title = on ? '🍞 Fertig gebacken!' : baseTitle;
    }, 1000);
    setTimeout(() => { clearInterval(titleBlink); document.title = baseTitle; }, 30000);
  }
  startBtn.addEventListener('click', () => {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    if (tick) { // Pause
      remaining = (endAt - Date.now()) / 1000;
      stop();
      startBtn.textContent = '▶ Weiter';
      document.title = baseTitle;
      return;
    }
    if (remaining <= 0) remaining = DEFAULT;
    box.classList.remove('done');
    endAt = Date.now() + remaining * 1000;
    startBtn.textContent = '⏸ Pause';
    tick = setInterval(() => {
      remaining = (endAt - Date.now()) / 1000;
      if (remaining <= 0) finish(); else render();
    }, 250);
    toast('⏲️ Timer läuft. Ab in den Ofen!');
  });
  resetBtn.addEventListener('click', () => {
    stop();
    clearInterval(titleBlink);
    document.title = baseTitle;
    remaining = DEFAULT;
    box.classList.remove('done');
    render();
  });
  document.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => {
    const delta = Number(btn.dataset.add) * 60;
    if (endAt) {
      endAt = Math.max(Date.now() + 1000, endAt + delta * 1000);
      remaining = (endAt - Date.now()) / 1000;
    } else {
      remaining = Math.max(60, remaining + delta);
    }
    render();
  }));
  render();
})();
