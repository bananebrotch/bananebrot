/* =========================================================
   bananebrot.ch – Website-Skripte
   Schoggi-Modus, Menü, Fakten, Filter, Ofen-Thermometer & Easter Eggs
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Speicher-Helfer (funktioniert auch, wenn der Browser Speicher blockiert)
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* egal */ } }
  };
  window.siteStore = store;

  // ---------- Bananen-Fakten ----------
  const FACTS = [
    'Bananen sind botanisch gesehen Beeren. Erdbeeren dagegen sind keine.',
    'Die Bananenpflanze ist kein Baum, sondern eine riesige Staude: Ihr «Stamm» besteht aus eingerollten Blättern.',
    'Je brauner die Banane, desto süsser: Beim Reifen wird Stärke in Zucker umgewandelt. Perfekt für Bananenbrot!',
    'Ein Bündel Bananen an der Staude heisst «Hand», eine einzelne Banane «Finger».',
    'Bananen wachsen nach oben gebogen, weil sie sich dem Licht entgegenstrecken.',
    'Fast alle Bananen im Supermarkt gehören zu einer einzigen Sorte: der Cavendish.',
    'Bananen enthalten Kalium, darunter ein winziger Anteil an natürlich radioaktivem Kalium-40. Völlig harmlos!',
    'Bananenbrot wurde in den USA in den 1930er-Jahren populär, als Backpulver und Natron in jeder Küche standen.',
    'Im Frühling 2020 gehörte Bananenbrot weltweit zu den meistgesuchten Rezepten im Internet.',
    'Wilde Bananen haben harte Kerne. Die Bananen aus dem Laden wurden so gezüchtet, dass sie praktisch kernlos sind.'
  ];
  window.BANANA_FACTS = FACTS;

  // ---------- Toast-Nachrichten ----------
  let toastEl;
  let toastTimer;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }
  window.siteToast = toast;

  // ---------- Schoggi-Modus (Dark Mode) ----------
  const toggles = document.querySelectorAll('[data-theme-toggle]');
  function applyTheme(theme) {
    root.dataset.theme = theme;
    toggles.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      const label = btn.querySelector('.tt-label');
      if (label) label.textContent = theme === 'dark' ? 'Banane-Modus' : 'Schoggi-Modus';
    });
  }
  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
  toggles.forEach((btn) => btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    store.set('theme', next);
    toast(next === 'dark' ? 'Schoggi-Modus' : 'Banane-Modus');
  }));

  // ---------- Mobiles Menü ----------
  const menuBtn = document.querySelector('.menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if (menuBtn && navLinks) {
    const setOpen = (open) => {
      navLinks.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.textContent = open ? '✕' : '☰';
    };
    menuBtn.addEventListener('click', () => setOpen(!navLinks.classList.contains('open')));
    navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  }

  // ---------- Elemente beim Scrollen einblenden ----------
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // ---------- Ofen-Thermometer beim Scrollen ----------
  const thermo = document.createElement('div');
  thermo.className = 'thermo';
  thermo.setAttribute('aria-hidden', 'true');
  document.body.appendChild(thermo);
  let baked = false;
  function updateThermo() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    const temp = Math.round(20 + progress * 160);
    if (temp >= 178) thermo.textContent = '🍞 180 °C: fertig gebacken!';
    else if (temp > 120) thermo.textContent = `🔥 ${temp} °C`;
    else thermo.textContent = `🌡️ ${temp} °C`;
    if (temp >= 178 && !baked && max > 400) {
      baked = true;
      toast('🍞 Fertig gebacken! Du hast die ganze Seite gelesen.');
    }
  }
  window.addEventListener('scroll', updateThermo, { passive: true });
  window.addEventListener('resize', updateThermo);
  updateThermo();

  // ---------- Schwebende Bananen im Hintergrund ----------
  if (!reduceMotion) {
    const floaties = document.createElement('div');
    floaties.className = 'floaties';
    floaties.setAttribute('aria-hidden', 'true');
    const emojis = ['🍌', '🍌', '🍌', '🍞', '🍫', '✨'];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.textContent = emojis[i % emojis.length];
      s.style.left = `${Math.random() * 100}%`;
      s.style.setProperty('--size', `${18 + Math.random() * 22}px`);
      s.style.animationDuration = `${22 + Math.random() * 20}s`;
      s.style.animationDelay = `${-Math.random() * 40}s`;
      floaties.appendChild(s);
    }
    document.body.prepend(floaties);
  }

  // ---------- Brösmeli beim Klicken ----------
  if (!reduceMotion) {
    const crumbColors = ['#c47a35', '#8a4b1c', '#ffd23f', '#e8b56a', '#4a2a12'];
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('canvas, input, textarea, select, label')) return;
      for (let i = 0; i < 9; i++) {
        const c = document.createElement('span');
        const s = 4 + Math.random() * 6;
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 50;
        c.className = 'crumb';
        c.style.width = c.style.height = `${s}px`;
        c.style.left = `${e.clientX - s / 2}px`;
        c.style.top = `${e.clientY - s / 2}px`;
        c.style.background = crumbColors[i % crumbColors.length];
        c.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        c.style.setProperty('--dy', `${Math.sin(angle) * dist + 40}px`);
        c.style.setProperty('--rot', `${Math.random() * 360}deg`);
        document.body.appendChild(c);
        c.addEventListener('animationend', () => c.remove());
      }
    });
  }

  // ---------- Das Brot anstupsen → fliegende Banane ----------
  document.querySelectorAll('.loaf-svg').forEach((svg) => {
    svg.addEventListener('click', () => {
      svg.classList.remove('boop');
      void svg.getBoundingClientRect();
      svg.classList.add('boop');
      bananaFly();
    });
  });

  // ---------- «Wusstest du?»-Box ----------
  const factText = document.querySelector('[data-fact]');
  const factBtn = document.querySelector('[data-fact-next]');
  if (factText && factBtn) {
    const order = FACTS.map((_, i) => i).sort(() => Math.random() - 0.5);
    let index = 0;
    const showFact = () => {
      factText.style.opacity = '0';
      setTimeout(() => {
        factText.textContent = FACTS[order[index % order.length]];
        index++;
        factText.style.opacity = '1';
      }, 220);
    };
    showFact();
    factBtn.addEventListener('click', showFact);
  }

  // ---------- Projekt-Filter ----------
  const chips = document.querySelectorAll('[data-filter]');
  const projects = document.querySelectorAll('[data-tags]');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => {
      c.classList.toggle('active', c === chip);
      c.setAttribute('aria-pressed', String(c === chip));
    });
    const filter = chip.dataset.filter;
    projects.forEach((p) => {
      const show = filter === 'alle' || p.dataset.tags.split(' ').includes(filter);
      p.classList.toggle('hidden', !show);
    });
  }));

  // ---------- Zähler über den Gratis-Dienst «Abacus» ----------
  const ABACUS = 'https://abacus.jasoncameron.dev';
  const fetchWithTimeout = (url, ms) => {
    const ctrl = 'AbortController' in window ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), ms) : null;
    return fetch(url, ctrl ? { signal: ctrl.signal, cache: 'no-store' } : { cache: 'no-store' })
      .finally(() => timer && clearTimeout(timer));
  };
  // Holt einen Zählerwert mit bis zu 3 Versuchen. 404 = Zähler existiert noch nicht = 0.
  const readCounter = (path, onValue, attempt = 1) => {
    if (!window.fetch) return;
    fetchWithTimeout(`${ABACUS}${path}`, 6000)
      .then((r) => {
        if (r.status === 404) return { value: 0 };
        return r.ok ? r.json() : Promise.reject(new Error(String(r.status)));
      })
      .then((data) => onValue(Number(data && data.value) || 0))
      .catch(() => {
        if (attempt < 3) setTimeout(() => readCounter(path, onValue, attempt + 1), 1500 * attempt);
      });
  };
  // Für das Spiel: ein gebackenes Brot zum weltweiten Zähler hinzufügen
  window.countBakedLoaf = () => {
    if (!window.fetch) return;
    fetch(`${ABACUS}/hit/bananebrot.ch/brote`, { cache: 'no-store', keepalive: true }).catch(() => {});
  };

  if (document.querySelector('[data-hits]')) {
    // Besuche der Startseite werden still mitgezählt (nicht angezeigt):
    // Stand abrufbar unter https://abacus.jasoncameron.dev/get/bananebrot.ch/startseite
    readCounter('/hit/bananebrot.ch/startseite', () => {});
  }

  // Im Guetschii: wie viele Bananenbrote alle Spieler zusammen schon gebacken haben
  const loavesEl = document.querySelector('[data-hits]');
  if (loavesEl) {
    const showLoaves = (n) => {
      if (!n) return;
      loavesEl.textContent = `Scho ${Number(n).toLocaleString('de-CH')} Bananebrot uf dere Site bache.`;
      loavesEl.hidden = false;
    };
    showLoaves(Number(store.get('bananebrot-loaves')) || 0); // sofort die letzte bekannte Zahl
    readCounter('/get/bananebrot.ch/brote', (n) => {
      if (n) store.set('bananebrot-loaves', String(n));
      showLoaves(n);
    });
  }

  // ---------- Jahr im Footer ----------
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // ---------- Easter Eggs ----------
  function spawnFlyer(content, cls, isSvg) {
    const el = document.createElement('div');
    el.className = `flyer ${cls}`;
    if (isSvg) el.innerHTML = content; else el.textContent = content;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    return el;
  }

  function bananaFly() {
    toast('Wuuusch! Eh flügendi Banane!');
    if (!reduceMotion) spawnFlyer('🍌', 'fly');
  }

  function bananaRain() {
    toast('🍌🍌🍌 Bananen-Regen! Jetzt brauchst du ein grosses Rezept.');
    if (reduceMotion) return;
    const items = ['🍌', '🍌', '🍌', '🍞', '🍫', '🥚'];
    for (let i = 0; i < 28; i++) {
      setTimeout(() => {
        const el = spawnFlyer(items[Math.floor(Math.random() * items.length)], 'rain');
        el.style.setProperty('--x', `${Math.random() * window.innerWidth}px`);
        el.style.setProperty('--size', `${32 + Math.random() * 36}px`);
        el.style.setProperty('--dur', `${2 + Math.random() * 1.6}s`);
        el.style.setProperty('--rot', `${(Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360)}deg`);
      }, i * 90);
    }
  }

  const ORCA_SVG = `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M100 30 C104 8 110 2 117 2 C112 14 113 24 120 32 Z" fill="#111"/>
    <path d="M36 56 L10 40 C5 37 2 42 6 46 L18 56 L6 66 C2 70 6 74 10 71 Z" fill="#111"/>
    <path d="M32 56 C56 28 132 22 172 42 C192 51 194 62 176 68 C140 82 70 84 32 58 Z" fill="#111"/>
    <path d="M84 70 C112 78 150 74 174 66 C158 76 118 82 84 70 Z" fill="#fff"/>
    <ellipse cx="152" cy="45" rx="11" ry="4.5" transform="rotate(-8 152 45)" fill="#fff"/>
    <ellipse cx="104" cy="36" rx="14" ry="4" fill="#8c99a3"/>
    <path d="M128 68 C126 80 118 88 108 86 C116 80 120 72 120 66 Z" fill="#111"/>
    <text x="150" y="30" font-size="26">🍌</text>
  </svg>`;
  function orcaJump() {
    toast('🐋 Auch Orcas mögen Bananenbrot. Wusstest du nicht? Jetzt schon.');
    if (!reduceMotion) spawnFlyer(ORCA_SVG, 'jump', true);
  }

  // Konami-Code (↑ ↑ ↓ ↓ ← → ← → B A) oder Wörter tippen
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiPos = 0;
  let typed = '';
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[konamiPos]) konamiPos++;
    else konamiPos = key === KONAMI[0] ? 1 : 0;
    if (konamiPos === KONAMI.length) { konamiPos = 0; bananaRain(); }

    if (e.key.length === 1) {
      typed = (typed + key).slice(-12);
      if (typed.endsWith('banane')) bananaFly();
      if (typed.endsWith('orca')) orcaJump();
      if (typed.endsWith('schoggi')) {
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        store.set('theme', next);
        toast('🍫 Schoggi-Zauber!');
      }
    }
  });

  // Logo 5x schnell anklicken → Bananen-Regen
  const logo = document.querySelector('.logo');
  if (logo) {
    let clicks = 0;
    let clickTimer;
    logo.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      clicks++;
      clearTimeout(clickTimer);
      if (clicks >= 5) {
        clicks = 0;
        bananaRain();
        return;
      }
      clickTimer = setTimeout(() => {
        if (clicks === 1) window.location.href = logo.href;
        clicks = 0;
      }, 350);
    });
  }

  console.log('%c🍌 Hoi! Schön, dass du in den Code schaust.', 'font-size:16px;font-weight:bold;color:#b8690f');
  console.log('Tipp: Tippe irgendwo auf der Seite «banane», «schoggi» oder «orca».');
})();
