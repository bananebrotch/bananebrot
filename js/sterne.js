/* =========================================================
   bananebrot.ch – Stärnehimmel
   Berechnet live, welche Sterne gerade über der Schweiz stehen.
   Sterndaten: js/himmel-daten.js (d3-celestial / Hipparcos)
   ========================================================= */
(() => {
  'use strict';

  const canvas = document.getElementById('sky');
  const DATA = window.SKY_DATA;
  if (!canvas || !DATA) return;
  const ctx = canvas.getContext('2d');
  const toast = window.siteToast || (() => {});

  const PLACES = {
    zuerich: { name: 'Züri', lat: 47.3769, lon: 8.5417 },
    bern: { name: 'Bern', lat: 46.948, lon: 7.4474 },
    basel: { name: 'Basel', lat: 47.5596, lon: 7.5886 },
    genf: { name: 'Genf', lat: 46.2044, lon: 6.1432 },
    lugano: { name: 'Lugano', lat: 46.0037, lon: 8.9511 },
    chur: { name: 'Chur', lat: 46.8508, lon: 9.532 }
  };

  const RAD = Math.PI / 180;
  const LABELLED_STARS = ['Polarstern', 'Sirius'];
  const els = {
    place: document.getElementById('sky-place'),
    slider: document.getElementById('sky-time'),
    now: document.getElementById('sky-now'),
    locate: document.getElementById('sky-locate'),
    showPlanets: document.getElementById('sky-show-planets'),
    showCons: document.getElementById('sky-show-cons'),
    showIss: document.getElementById('sky-show-iss'),
    when: document.getElementById('sky-when'),
    moon: document.getElementById('sky-moon'),
    list: document.getElementById('sky-list'),
    tip: document.getElementById('sky-tip'),
    planets: document.getElementById('sky-planets'),
    iss: document.getElementById('sky-iss')
  };

  let place = PLACES.zuerich;
  let offsetHours = 0;
  let size = 600;
  let drawnStars = [];

  // ---------- Astronomie ----------
  const norm = (d) => ((d % 360) + 360) % 360;
  const julian = (date) => date.getTime() / 86400000 + 2440587.5;

  function localSiderealDeg(date, lon) {
    const d = julian(date) - 2451545.0;
    return norm(280.46061837 + 360.98564736629 * d + lon);
  }

  // Rektaszension/Deklination (Grad) → Höhe/Azimut (Grad, Azimut ab Norden über Osten)
  function toHorizon(raDeg, decDeg, lst, lat) {
    const ha = (lst - raDeg) * RAD;
    const dec = decDeg * RAD;
    const phi = lat * RAD;
    const sinAlt = Math.sin(dec) * Math.sin(phi) + Math.cos(dec) * Math.cos(phi) * Math.cos(ha);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    const az = Math.atan2(-Math.sin(ha) * Math.cos(dec), Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.sin(phi) * Math.cos(ha));
    return { alt: alt / RAD, az: norm(az / RAD) };
  }

  function eclipticToEquatorial(lonDeg, latDeg, d) {
    const eps = (23.4393 - 3.563e-7 * d) * RAD;
    const l = lonDeg * RAD;
    const b = latDeg * RAD;
    const ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l));
    const dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l));
    return { ra: norm(ra / RAD), dec: dec / RAD };
  }

  // Sonne (Genauigkeit ca. 1°)
  function sunPosition(date) {
    const d = julian(date) - 2451545.0;
    const g = norm(357.529 + 0.98560028 * d) * RAD;
    const q = norm(280.459 + 0.98564736 * d);
    const lon = q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);
    return { ...eclipticToEquatorial(lon, 0, d), lon };
  }

  // Mond (vereinfachte Formel, Genauigkeit ca. 1–2°)
  function moonPosition(date) {
    const d = julian(date) - 2451545.0;
    const L = norm(218.316 + 13.176396 * d);
    const M = norm(134.963 + 13.064993 * d) * RAD;
    const F = norm(93.272 + 13.22935 * d) * RAD;
    const lon = L + 6.289 * Math.sin(M);
    const lat = 5.128 * Math.sin(F);
    return { ...eclipticToEquatorial(lon, lat, d), lon };
  }

  // Planeten: vereinfachte Keplerbahnen nach NASA/JPL (Standish), gültig ca. 1800–2050.
  // [a, e, I, L, Perihel-Länge, Knoten-Länge] und deren Änderung pro Jahrhundert
  const ORBITS = {
    Merkur: [[0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
    Venus: [[0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255], [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418]],
    Erde: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0]],
    Mars: [[1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
    Jupiter: [[5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
    Saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]]
  };
  const PLANET_STYLE = {
    Merkur: { color: '#d9c9b0', size: 3 },
    Venus: { color: '#fff4d6', size: 5.5 },
    Mars: { color: '#ff7a4d', size: 4 },
    Jupiter: { color: '#ffe2b0', size: 5 },
    Saturn: { color: '#f0d79a', size: 4.2 }
  };

  function heliocentric(name, T) {
    const [el, rate] = ORBITS[name];
    const [a, e, I, L, wBar, node] = el.map((v, i) => v + rate[i] * T);
    const w = (wBar - node) * RAD;
    const O = node * RAD;
    const inc = I * RAD;
    let M = norm(L - wBar);
    if (M > 180) M -= 360;
    M *= RAD;
    let E = M + e * Math.sin(M);
    for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xp = a * (Math.cos(E) - e);
    const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    return {
      x: (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(inc)) * xp + (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(inc)) * yp,
      y: (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(inc)) * xp + (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(inc)) * yp,
      z: Math.sin(w) * Math.sin(inc) * xp + Math.cos(w) * Math.sin(inc) * yp
    };
  }

  function planetPositions(date) {
    const d = julian(date) - 2451545.0;
    const T = d / 36525;
    const earth = heliocentric('Erde', T);
    return Object.keys(PLANET_STYLE).map((name) => {
      const p = heliocentric(name, T);
      const x = p.x - earth.x;
      const y = p.y - earth.y;
      const z = p.z - earth.z;
      const lon = norm(Math.atan2(y, x) / RAD);
      const lat = Math.atan2(z, Math.hypot(x, y)) / RAD;
      return { name, ...eclipticToEquatorial(lon, lat, d), lon };
    });
  }
  window.__planetPositions = planetPositions; // für Tests

  function moonPhase(date) {
    const sun = sunPosition(date);
    const moon = moonPosition(date);
    const elong = norm(moon.lon - sun.lon); // 0 = Neumond, 180 = Vollmond
    const illum = (1 - Math.cos(elong * RAD)) / 2;
    let name;
    if (elong < 12 || elong > 348) name = 'Neumond 🌑';
    else if (elong < 80) name = 'zuenehmendi Sichle 🌒';
    else if (elong < 100) name = 'ersts Viertel 🌓';
    else if (elong < 168) name = 'zuenehmende Mond 🌔';
    else if (elong < 192) name = 'Vollmond 🌕';
    else if (elong < 260) name = 'abnehmende Mond 🌖';
    else if (elong < 280) name = 'letschts Viertel 🌗';
    else name = 'abnehmendi Sichle 🌘';
    return { elong, illum, name };
  }

  // Farbindex B-V → Sternfarbe
  function starColor(bv) {
    if (bv < 0) return '#a9c8ff';
    if (bv < 0.3) return '#dfe8ff';
    if (bv < 0.6) return '#fffaf0';
    if (bv < 0.9) return '#fff1c4';
    if (bv < 1.3) return '#ffd59a';
    return '#ffb07a';
  }

  // ---------- ISS (Internationale Raumstation) ----------
  // Bahndaten (TLE) werden einmal geladen und im Browser mit satellite.js (SGP4) weitergerechnet.
  const SAT = window.satellite;
  let issRec = null;
  let nextPass = null;
  let nextPassKey = '';

  function parseTle(text) {
    const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const l1 = lines.find((l) => l.startsWith('1 25544'));
    const l2 = lines.find((l) => l.startsWith('2 25544'));
    return l1 && l2 ? [l1, l2] : null;
  }

  function useTle(tle) {
    try {
      issRec = SAT.twoline2satrec(tle[0], tle[1]);
      nextPassKey = '';
      draw();
    } catch (e) { issRec = null; }
  }

  function loadIss() {
    if (!SAT || !window.fetch) return;
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem('iss-tle') || 'null'); } catch (e) { cached = null; }
    if (cached && cached.tle) useTle(cached.tle);
    if (cached && Date.now() - cached.at < 12 * 3600000) return; // Bahndaten max. 12 h alt

    const sources = [
      () => fetch('https://api.wheretheiss.at/v1/satellites/25544/tles').then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => (d && d.line1 && d.line2 ? [d.line1.trim(), d.line2.trim()] : Promise.reject())),
      () => fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE').then((r) => (r.ok ? r.text() : Promise.reject()))
        .then((t) => parseTle(t) || Promise.reject())
    ];
    const tryNext = (i) => {
      if (i >= sources.length) return;
      sources[i]()
        .then((tle) => {
          try { localStorage.setItem('iss-tle', JSON.stringify({ tle, at: Date.now() })); } catch (e) { /* egal */ }
          useTle(tle);
        })
        .catch(() => tryNext(i + 1));
    };
    tryNext(0);
  }

  // Höhe/Azimut der ISS für einen Beobachter + ob sie von der Sonne beleuchtet ist
  function issLook(date, obs) {
    if (!issRec) return null;
    const pv = SAT.propagate(issRec, date);
    const r = pv && pv.position;
    if (!r || typeof r.x !== 'number') return null;
    const g = SAT.gstime(date);
    const x = r.x * Math.cos(g) + r.y * Math.sin(g);
    const y = -r.x * Math.sin(g) + r.y * Math.cos(g);
    const z = r.z;
    const phi = obs.lat * RAD;
    const lam = obs.lon * RAD;
    const a = 6378.137;
    const e2 = (1 / 298.257223563) * (2 - 1 / 298.257223563);
    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
    const h = 0.45;
    const ox = (N + h) * Math.cos(phi) * Math.cos(lam);
    const oy = (N + h) * Math.cos(phi) * Math.sin(lam);
    const oz = (N * (1 - e2) + h) * Math.sin(phi);
    const dx = x - ox;
    const dy = y - oy;
    const dz = z - oz;
    const east = -Math.sin(lam) * dx + Math.cos(lam) * dy;
    const north = -Math.sin(phi) * Math.cos(lam) * dx - Math.sin(phi) * Math.sin(lam) * dy + Math.cos(phi) * dz;
    const up = Math.cos(phi) * Math.cos(lam) * dx + Math.cos(phi) * Math.sin(lam) * dy + Math.sin(phi) * dz;
    const range = Math.hypot(dx, dy, dz);
    // Erdschatten (zylindrisch genähert)
    const sun = sunPosition(date);
    const sx = Math.cos(sun.dec * RAD) * Math.cos(sun.ra * RAD);
    const sy = Math.cos(sun.dec * RAD) * Math.sin(sun.ra * RAD);
    const sz = Math.sin(sun.dec * RAD);
    const proj = r.x * sx + r.y * sy + r.z * sz;
    const perp = Math.hypot(r.x - proj * sx, r.y - proj * sy, r.z - proj * sz);
    const sunlit = proj > 0 || perp > 6371;
    return { alt: Math.asin(up / range) / RAD, az: norm(Math.atan2(east, north) / RAD), sunlit, range };
  }

  // Nächster sichtbarer Überflug (ISS beleuchtet, Himmel dunkel genug, mind. 10° hoch)
  function findNextPass(from, obs) {
    const step = 30000;
    let best = null;
    for (let t = from.getTime(); t < from.getTime() + 48 * 3600000; t += step) {
      const d = new Date(t);
      const look = issLook(d, obs);
      if (!look) return null;
      const sunAlt = toHorizon(sunPosition(d).ra, sunPosition(d).dec, localSiderealDeg(d, obs.lon), obs.lat).alt;
      const visible = look.alt > 10 && look.sunlit && sunAlt < -6;
      if (visible) {
        if (!best) best = { start: d, maxAlt: look.alt };
        else best.maxAlt = Math.max(best.maxAlt, look.alt);
      } else if (best) {
        return best;
      }
    }
    return best;
  }

  // ---------- Zeichnen ----------
  function resize() {
    const wrap = canvas.parentElement.getBoundingClientRect();
    size = Math.min(wrap.width, 760);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(alt, az, R, c) {
    const r = ((90 - alt) / 90) * R;
    const a = az * RAD;
    // Blick nach oben: Norden oben, Osten links
    return { x: c - r * Math.sin(a), y: c - r * Math.cos(a), r };
  }

  function currentDate() {
    return new Date(Date.now() + offsetHours * 3600000);
  }

  function draw() {
    const date = currentDate();
    const lst = localSiderealDeg(date, place.lon);
    const c = size / 2;
    const R = c - 30;
    const sun = sunPosition(date);
    const sunH = toHorizon(sun.ra, sun.dec, lst, place.lat);

    ctx.clearRect(0, 0, size, size);

    // Himmel: Farbe je nach Sonnenstand
    let inner = '#0d1d3d';
    let outer = '#060d1f';
    if (sunH.alt > 0) { inner = '#5aa0d8'; outer = '#2c6aa3'; }
    else if (sunH.alt > -6) { inner = '#2c4a7a'; outer = '#16264a'; }
    else if (sunH.alt > -12) { inner = '#17284d'; outer = '#0a1430'; }
    const grad = ctx.createRadialGradient(c, c, 0, c, c, R);
    grad.addColorStop(0, outer);
    grad.addColorStop(1, inner);
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.clip();

    // Hilfskreise (Höhe 30° und 60°)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (const alt of [30, 60]) {
      ctx.beginPath();
      ctx.arc(c, c, ((90 - alt) / 90) * R, 0, Math.PI * 2);
      ctx.stroke();
    }

    const dayFade = sunH.alt > 0 ? 0.35 : sunH.alt > -6 ? 0.7 : 1;

    // Sternbild-Linien
    if (els.showCons.checked) {
      ctx.strokeStyle = `rgba(150,190,255,${0.35 * dayFade})`;
      ctx.lineWidth = 1;
      for (const line of DATA.lines) {
        ctx.beginPath();
        let started = false;
        let prevAbove = false;
        for (const [ra, dec] of line) {
          const h = toHorizon(ra, dec, lst, place.lat);
          const p = project(h.alt, h.az, R, c);
          const above = h.alt > -10;
          if (!started || !above || !prevAbove) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
          started = true;
          prevAbove = above;
        }
        ctx.stroke();
      }
    }

    // Sterne
    drawnStars = [];
    const scale = size / 600;
    DATA.stars.forEach(([ra, dec, mag, bv], i) => {
      const h = toHorizon(ra, dec, lst, place.lat);
      if (h.alt < 0) return;
      const p = project(h.alt, h.az, R, c);
      const r = Math.max(0.55, (5.6 - mag) * 0.62) * scale;
      ctx.globalAlpha = Math.min(1, (0.35 + (5.2 - mag) * 0.2)) * dayFade;
      ctx.fillStyle = starColor(bv);
      if (mag < 1.5) {
        ctx.shadowColor = starColor(bv);
        ctx.shadowBlur = 8 * scale;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      drawnStars.push({ x: p.x, y: p.y, i, mag, alt: h.alt });
    });
    ctx.globalAlpha = 1;

    // Planeten
    const planets = planetPositions(date).map((pl) => ({ ...pl, h: toHorizon(pl.ra, pl.dec, lst, place.lat) }));
    const placedLabels = [];
    for (const pl of planets) {
      if (pl.h.alt < 0 || !els.showPlanets.checked) continue;
      const st = PLANET_STYLE[pl.name];
      const p = project(pl.h.alt, pl.h.az, R, c);
      ctx.save();
      ctx.globalAlpha = Math.max(0.6, dayFade);
      ctx.fillStyle = st.color;
      ctx.shadowColor = st.color;
      ctx.shadowBlur = 12 * scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, st.size * scale, 0, Math.PI * 2);
      ctx.fill();
      if (pl.name === 'Saturn') {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 1.2 * scale;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, st.size * 2 * scale, st.size * 0.7 * scale, -0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      {
        ctx.font = `700 ${Math.round(10 * scale + 3)}px "Inter", system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = st.color;
        // Beschriftungen nahe beieinanderliegender Planeten nicht übereinander schreiben
        let ly = p.y + 10 * scale;
        const lx = p.x + (st.size + 5) * scale;
        while (placedLabels.some((q) => Math.abs(q.x - lx) < 60 * scale && Math.abs(q.y - ly) < 14 * scale)) ly += 15 * scale;
        placedLabels.push({ x: lx, y: ly });
        ctx.fillText(pl.name, lx, ly);
      }
      drawnStars.push({ x: p.x, y: p.y, planet: pl.name, mag: -3, alt: pl.h.alt });
    }

    // ISS
    const iss = issLook(date, place);
    if (iss && iss.alt > -2 && (!els.showIss || els.showIss.checked)) {
      // Bahnspur ±6 Minuten
      ctx.save();
      ctx.setLineDash([3 * scale, 4 * scale]);
      ctx.strokeStyle = 'rgba(143,123,255,0.55)';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      let pen = false;
      for (let k = -360; k <= 360; k += 15) {
        const l = issLook(new Date(date.getTime() + k * 1000), place);
        if (!l || l.alt < 0) { pen = false; continue; }
        const q = project(l.alt, l.az, R, c);
        if (pen) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
        pen = true;
      }
      ctx.stroke();
      ctx.restore();
      if (iss.alt > 0) {
        const p = project(iss.alt, iss.az, R, c);
        const bright = iss.sunlit && sunH.alt < -6;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = bright ? '#ffffff' : '#b3a6ff';
        ctx.shadowColor = bright ? '#ffffff' : '#8f7bff';
        ctx.shadowBlur = 12 * scale;
        ctx.fillRect(-2.5 * scale, -2.5 * scale, 5 * scale, 5 * scale); // Rumpf
        ctx.fillStyle = bright ? '#cfe0ff' : '#8f7bff';
        ctx.fillRect(-11 * scale, -4 * scale, 6 * scale, 8 * scale); // Sonnensegel links
        ctx.fillRect(5 * scale, -4 * scale, 6 * scale, 8 * scale); // Sonnensegel rechts
        ctx.restore();
        ctx.font = `800 ${Math.round(10 * scale + 3)}px "Inter", system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c9c0ff';
        ctx.fillText('ISS', p.x + 14 * scale, p.y);
        drawnStars.push({ x: p.x, y: p.y, iss: true, mag: -4, alt: iss.alt });
      }
    }

    // Mond
    const moon = moonPosition(date);
    const moonH = toHorizon(moon.ra, moon.dec, lst, place.lat);
    const phase = moonPhase(date);
    if (moonH.alt > -1) {
      const p = project(moonH.alt, moonH.az, R, c);
      const mr = 11 * scale;
      ctx.save();
      ctx.fillStyle = '#2a3346';
      ctx.beginPath(); ctx.arc(p.x, p.y, mr, 0, Math.PI * 2); ctx.fill();
      // beleuchteter Teil (vereinfacht: zunehmend rechts, abnehmend links)
      ctx.fillStyle = '#f4f1de';
      ctx.shadowColor = '#f4f1de';
      ctx.shadowBlur = 14 * scale;
      const waxing = phase.elong < 180;
      const k = Math.cos(phase.elong * RAD); // 1 = neu, -1 = voll
      ctx.beginPath();
      ctx.arc(p.x, p.y, mr, -Math.PI / 2, Math.PI / 2, !waxing);
      ctx.ellipse(p.x, p.y, Math.abs(k) * mr, mr, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === waxing ? true : false);
      ctx.fill();
      ctx.restore();
      drawnStars.push({ x: p.x, y: p.y, moon: true, mag: -12, alt: moonH.alt });
    }

    // Beschriftungen
    {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Sternbilder (nur wenn «Sternebilder» angekreuzt)
      ctx.font = `600 ${Math.round(11 * scale + 2)}px "Inter", system-ui, sans-serif`;
      ctx.fillStyle = `rgba(170,200,255,${0.55 * dayFade})`;
      if (els.showCons.checked) for (const key of Object.keys(DATA.cons)) {
        const [name, ra, dec, rank] = DATA.cons[key];
        if (rank > 2) continue;
        const h = toHorizon(ra, dec, lst, place.lat);
        if (h.alt < 5) continue;
        const p = project(h.alt, h.az, R, c);
        ctx.fillText(name, p.x, p.y);
      }
      // helle Sterne mit Namen
      ctx.font = `600 ${Math.round(10 * scale + 2)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = `rgba(255,236,190,${0.9 * dayFade})`;
      // Nur zwei Sterne werden beschriftet: der Polarstern und Sirius, der hellste Stern am Himmel
      for (const s of drawnStars) {
        if (s.moon || s.planet) continue;
        const n = DATA.names[s.i];
        if (n && LABELLED_STARS.includes(n[0])) ctx.fillText(n[0], s.x + 6 * scale, s.y - 6 * scale);
      }
    }
    ctx.restore();

    // Rand und Himmelsrichtungen
    ctx.strokeStyle = 'rgba(160,190,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `800 ${Math.round(13 * scale + 3)}px "Inter", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(232,238,255,0.85)';
    const dirs = [['N', 0], ['O', 90], ['S', 180], ['W', 270]];
    for (const [label, az] of dirs) {
      const a = az * RAD;
      ctx.fillText(label, c - (R + 16) * Math.sin(a), c - (R + 16) * Math.cos(a));
    }

    updateInfo(date, sunH, moonH, phase, lst, planets, iss);
  }

  // ---------- Infos neben dem Himmel ----------
  // Datum mit Wochentagen auf Schweizerdeutsch
  const WOCHENTAGE = { Montag: 'Mäntig', Dienstag: 'Zistig', Mittwoch: 'Mittwuch', Donnerstag: 'Dunnstig', Freitag: 'Fritig', Samstag: 'Samstig', Sonntag: 'Sunntig' };
  function swissDate(date) {
    const parts = {};
    new Intl.DateTimeFormat('de-CH', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Zurich' })
      .formatToParts(date).forEach((p) => { parts[p.type] = p.value; });
    return `${WOCHENTAGE[parts.weekday] || parts.weekday}, ${parts.day}. ${parts.month} um ${parts.hour}:${parts.minute}`;
  }

  function updateInfo(date, sunH, moonH, phase, lst, planets, iss) {
    els.when.textContent = `${place.name} · ${swissDate(date)}${offsetHours === 0 ? ' (jetzt)' : ''}`;

    if (els.iss) {
      if (!issRec) {
        els.iss.textContent = 'ISS: Bahndate werded glade …';
      } else {
        let now;
        if (iss && iss.alt > 0) {
          now = iss.sunlit && sunH.alt < -6
            ? `ISS: ${Math.round(iss.alt)}° über em Horizont – grad sichtbar! ✨`
            : `ISS: ${Math.round(iss.alt)}° über em Horizont, aber grad nöd sichtbar.`;
        } else {
          now = 'ISS: grad unter em Horizont.';
        }
        const key = `${place.lat},${place.lon},${Math.floor(date.getTime() / 300000)}`;
        if (key !== nextPassKey) { nextPass = findNextPass(date, place); nextPassKey = key; }
        const visibleNow = iss && iss.alt > 0 && iss.sunlit && sunH.alt < -6;
        const passText = nextPass && !visibleNow ? ` Nächstmal sichtbar: ${swissDate(nextPass.start)} (bis ${Math.round(nextPass.maxAlt)}° hoch).` : '';
        els.iss.textContent = now + passText;
      }
    }

    const vis = planets.filter((p) => p.h.alt > 0).sort((a, b) => b.h.alt - a.h.alt);
    if (els.planets) {
      els.planets.innerHTML = vis.length
        ? vis.map((p) => `<li><span class="pl-dot" style="background:${PLANET_STYLE[p.name].color}"></span>${p.name} <small>${Math.round(p.h.alt)}°</small></li>`).join('')
        : '<li>Grad kei Planet über em Horizont.</li>';
    }


    els.moon.textContent = moonH.alt > 0
      ? `Mond: ${phase.name}, ${Math.round(phase.illum * 100)} % belüchtet, ${Math.round(moonH.alt)}° über em Horizont.`
      : `Mond: ${phase.name}, grad unter em Horizont.`;

    // Sichtbare grosse Sternbilder
    const visible = [];
    for (const key of Object.keys(DATA.cons)) {
      const [name, ra, dec, rank] = DATA.cons[key];
      if (rank > 1) continue;
      const h = toHorizon(ra, dec, lst, place.lat);
      if (h.alt > 15) visible.push([name, h.alt]);
    }
    visible.sort((a, b) => b[1] - a[1]);
    els.list.innerHTML = visible.slice(0, 14).map(([n]) => `<li>${n}</li>`).join('') || '<li>Gerade keine grossen Sternbilder hoch genug.</li>';
  }

  // ---------- Stern-Info beim Antippen ----------
  function starLabel(s) {
    if (s.moon) return '🌙 Mond';
    if (s.iss) return '🛰️ <strong>ISS</strong><br>Internationali Raumstation';
    if (s.planet) return `🪐 <strong>${s.planet}</strong><br>Planet`;
    const n = DATA.names[s.i];
    const star = DATA.stars[s.i];
    const consName = n && DATA.cons[n[2]] ? DATA.cons[n[2]][0] : '';
    const parts = [];
    if (n && n[0]) parts.push(`<strong>${n[0]}</strong>`);
    if (n && n[1]) parts.push(`${n[1]} ${consName}`);
    else if (consName) parts.push(consName);
    parts.push(`Helligkeit ${star[2].toFixed(1)}`);
    return parts.join('<br>');
  }

  function findStar(x, y) {
    let best = null;
    let bestD = 18;
    for (const s of drawnStars) {
      const d = Math.hypot(s.x - x, s.y - y) - (s.mag < 2 ? 4 : 0);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  function showTip(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = findStar(x, y);
    if (!s) { els.tip.hidden = true; return; }
    els.tip.innerHTML = starLabel(s);
    els.tip.hidden = false;
    const left = Math.min(Math.max(s.x + 12, 8), size - 170);
    els.tip.style.left = `${left}px`;
    els.tip.style.top = `${Math.max(s.y - 10, 8)}px`;
  }
  canvas.addEventListener('pointermove', showTip);
  canvas.addEventListener('pointerdown', showTip);
  canvas.addEventListener('pointerleave', () => { els.tip.hidden = true; });

  // ---------- Bedienung ----------
  function setOffsetLabel() {
    const out = document.getElementById('sky-time-label');
    if (!out) return;
    if (offsetHours === 0) out.textContent = 'jetzt';
    else {
      const h = Math.trunc(offsetHours);
      const m = Math.round(Math.abs(offsetHours - h) * 60);
      out.textContent = `${offsetHours > 0 ? '+' : '−'}${Math.abs(h)} h${m ? ` ${m} min` : ''}`;
    }
  }
  els.slider.addEventListener('input', () => {
    offsetHours = Number(els.slider.value);
    setOffsetLabel();
    draw();
  });
  els.now.addEventListener('click', () => {
    offsetHours = 0;
    els.slider.value = '0';
    setOffsetLabel();
    draw();
  });
  els.place.addEventListener('change', () => {
    place = PLACES[els.place.value] || PLACES.zuerich;
    draw();
  });
  els.showPlanets.addEventListener('change', draw);
  els.showCons.addEventListener('change', draw);
  if (els.showIss) els.showIss.addEventListener('change', draw);
  if (els.locate) {
    els.locate.addEventListener('click', () => {
      if (!navigator.geolocation) { toast('Dein Browser kann den Standort nicht bestimmen.'); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          place = { name: 'Min Standort', lat: pos.coords.latitude, lon: pos.coords.longitude };
          const opt = document.createElement('option');
          opt.value = 'eigener';
          opt.textContent = 'Min Standort';
          els.place.querySelector('option[value="eigener"]')?.remove();
          els.place.appendChild(opt);
          els.place.value = 'eigener';
          PLACES.eigener = place;
          toast('📍 Himmel über dim Standort');
          draw();
        },
        () => toast('Standort nicht verfügbar. Wähl einfach eine Stadt aus.'),
        { timeout: 10000 }
      );
    });
  }

  window.addEventListener('resize', () => { resize(); draw(); });
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  resize();
  setOffsetLabel();
  draw();
  // Live mitlaufen lassen
  let lastFull = 0;
  setInterval(() => {
    if (offsetHours !== 0) return;
    const look = issLook(new Date(), place);
    if ((look && look.alt > -2) || Date.now() - lastFull > 30000) { lastFull = Date.now(); draw(); }
  }, 2000);
  loadIss();
})();
