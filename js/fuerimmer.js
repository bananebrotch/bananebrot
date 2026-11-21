/* =========================================================
   bananebrot.ch – FürImmer
   Passwort-Sperre (Entschlüsselung im Browser), Kuchen mit
   Kerzen zum Ausblasen, Diashow und schwebende Herzen.
   ========================================================= */
(() => {
  'use strict';

  const DATA = window.FUERIMMER;
  const lock = document.getElementById('love-lock');
  const form = document.getElementById('love-form');
  const input = document.getElementById('love-pin');
  const msg = document.getElementById('love-msg');
  const stage = document.getElementById('love-content');
  if (!DATA || !lock || !form || !stage) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  // ---------- Schwebende Herzen im Hintergrund ----------
  if (!reduceMotion) {
    const layer = document.createElement('div');
    layer.className = 'love-hearts';
    layer.setAttribute('aria-hidden', 'true');
    const hearts = ['❤', '❤', '♥', '💗', '💕'];
    for (let i = 0; i < 18; i++) {
      const h = document.createElement('span');
      h.textContent = hearts[i % hearts.length];
      h.style.left = `${Math.random() * 100}%`;
      h.style.setProperty('--size', `${12 + Math.random() * 22}px`);
      h.style.setProperty('--sway', `${(Math.random() - 0.5) * 80}px`);
      h.style.animationDuration = `${14 + Math.random() * 14}s`;
      h.style.animationDelay = `${-Math.random() * 28}s`;
      layer.appendChild(h);
    }
    document.body.prepend(layer);
  }

  // ---------- Entschlüsseln ----------
  async function decrypt(password) {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: fromB64(DATA.s), iterations: DATA.it, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(DATA.iv) }, key, fromB64(DATA.c));
    return new TextDecoder().decode(plain);
  }

  let busy = false;
  async function tryUnlock(password, remember) {
    if (busy) return;
    busy = true;
    form.classList.add('is-busy');
    msg.textContent = '';
    try {
      const html = await decrypt(password);
      if (remember) {
        try { sessionStorage.setItem('fuerimmer', password); } catch (e) { /* egal */ }
      }
      reveal(html);
    } catch (e) {
      try { sessionStorage.removeItem('fuerimmer'); } catch (err) { /* egal */ }
      if (!remember) return; // gespeichertes Passwort war ungültig: still bleiben
      msg.textContent = 'Leider falsch 💔';
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
      input.value = '';
      input.focus();
    } finally {
      busy = false;
      form.classList.remove('is-busy');
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value.trim()) tryUnlock(input.value.trim(), true);
  });
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    if (input.value.length === 4) tryUnlock(input.value, true);
  });

  // Im selben Tab nicht jedes Mal neu eintippen müssen
  try {
    const saved = sessionStorage.getItem('fuerimmer');
    if (saved) tryUnlock(saved, false);
  } catch (e) { /* egal */ }

  // ---------- Inhalt zeigen ----------
  function reveal(html) {
    lock.classList.add('is-open');
    setTimeout(() => {
      lock.hidden = true;
      stage.innerHTML = html;
      stage.hidden = false;
      stage.classList.add('is-visible');
      initCake();
      initSlides();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, reduceMotion ? 0 : 700);
  }

  // ---------- Kuchen: Kerzen ausblasen ----------
  function burstHearts(x, y) {
    if (reduceMotion) return;
    for (let i = 0; i < 26; i++) {
      const h = document.createElement('span');
      h.className = 'love-burst';
      h.textContent = ['❤', '💖', '✨', '💗'][i % 4];
      const a = Math.random() * Math.PI * 2;
      const d = 80 + Math.random() * 160;
      h.style.left = `${x}px`;
      h.style.top = `${y}px`;
      h.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      h.style.setProperty('--dy', `${Math.sin(a) * d - 60}px`);
      h.style.setProperty('--rot', `${(Math.random() - 0.5) * 120}deg`);
      h.style.fontSize = `${14 + Math.random() * 18}px`;
      document.body.appendChild(h);
      h.addEventListener('animationend', () => h.remove());
    }
  }

  function initCake() {
    const cake = document.getElementById('love-cake');
    const hint = document.getElementById('love-cake-hint');
    const wish = document.getElementById('love-wish');
    if (!cake) return;
    const toggle = () => {
      const out = cake.classList.toggle('is-out');
      if (out) {
        const r = cake.getBoundingClientRect();
        burstHearts(r.left + r.width / 2, r.top + r.height * 0.25);
        if (hint) hint.textContent = 'Nomal tippe zum wieder aazünde 🕯️';
        if (wish) wish.hidden = false;
      } else {
        if (hint) hint.textContent = 'Tipp uf de Chueche und blas d Cherze us 🎂';
        if (wish) wish.hidden = true;
      }
    };
    cake.addEventListener('click', toggle);
    cake.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }

  // ---------- Diashow ----------
  function initSlides() {
    const box = document.getElementById('love-slides');
    if (!box) return;
    const slides = [...box.querySelectorAll('.love-slide')];
    if (!slides.length) return;
    let index = 0;
    let timer = null;

    const dots = document.createElement('div');
    dots.className = 'love-dots';
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Bild ${i + 1}`);
      b.addEventListener('click', () => { go(i); restart(); });
      dots.appendChild(b);
    });
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'love-nav love-prev';
    prev.setAttribute('aria-label', 'Vorheriges Bild');
    prev.textContent = '‹';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'love-nav love-next';
    next.setAttribute('aria-label', 'Nächstes Bild');
    next.textContent = '›';
    box.append(prev, next);
    box.after(dots);

    function go(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === index));
      [...dots.children].forEach((d, k) => d.classList.toggle('is-active', k === index));
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion && slides.length > 1) timer = setInterval(() => go(index + 1), 5000);
    }
    prev.addEventListener('click', () => { go(index - 1); restart(); });
    next.addEventListener('click', () => { go(index + 1); restart(); });

    // Wischen auf dem Handy
    let startX = null;
    box.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });

    go(0);
    restart();
  }
})();
