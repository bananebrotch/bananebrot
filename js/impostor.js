/* =========================================================
   bananebrot.ch – Impostor
   Partyspiel mit einem Handy: Alle sehen dasselbe geheime Wort,
   nur der Impostor nicht. Wer blufft am besten?
   ========================================================= */
(() => {
  'use strict';

  const app = document.getElementById('imp-app');
  if (!app) return;
  const store = window.siteStore || { get() { return null; }, set() {} };
  const toast = window.siteToast || (() => {});

  // [Wort, ähnliches Wort für den Undercover-Modus]
  const WORDS = {
    'Ässe & Trinke': [
      ['Fondue', 'Raclette'], ['Rösti', 'Bratchartoffle'], ['Cervelat', 'Wienerli'], ['Gipfeli', 'Weggli'],
      ['Birchermüesli', 'Haferflocke'], ['Zopf', 'Ruchbrot'], ['Bananebrot', 'Schoggichueche'], ['Älplermagronen', 'Hörnli mit Ghacktem'],
      ['Basler Läckerli', 'Lebkueche'], ['Glace', 'Sorbet'], ['Kafi', 'Tee'], ['Bier', 'Wii'],
      ['Pizza', 'Flammkueche'], ['Sushi', 'Poke Bowl'], ['Kebab', 'Dürüm'], ['Spaghetti', 'Lasagne'],
      ['Schoggi', 'Praliné'], ['Chäschüechli', 'Wähe'], ['Popcorn', 'Chips'], ['Pancakes', 'Waffle']
    ],
    Orte: [
      ['Badi', 'Hallebad'], ['Hauptbahnhof', 'Flughafe'], ['Skilift', 'Sesselbahn'], ['Bibliothek', 'Buechhandlig'],
      ['Kino', 'Theater'], ['Spital', 'Arztpraxis'], ['Zoo', 'Buurehof'], ['Fitnesscenter', 'Yoga-Studio'],
      ['Zürisee', 'Vierwaldstättersee'], ['Schuel', 'Uni'], ['Coiffeur', 'Nagelstudio'], ['Wöschchuchi', 'Chäller'],
      ['Openair', 'Konzert'], ['Uetliberg', 'Pilatus'], ['Bäckerei', 'Konditorei'], ['Camping', 'Jugi'],
      ['Weihnachtsmärt', 'Chilbi'], ['Museum', 'Galerie'], ['Club', 'Bar'], ['Tankstell', 'Kiosk']
    ],
    Alltag: [
      ['Regeschirm', 'Regejagge'], ['Velo', 'Trottinett'], ['Zahnbürschte', 'Zahnseide'], ['Wecker', 'Handy'],
      ['Kafimaschine', 'Wasserchocher'], ['Schlüssel', 'Badge'], ['Rucksack', 'Handtäsche'], ['Abstimmig', 'Wahle'],
      ['Steuererklärig', 'Rächnig'], ['Znüni', 'Zvieri'], ['Feierabig', 'Wuchenend'], ['Ferie', 'Usflug'],
      ['Geburtstag', 'Hochzit'], ['Zügle', 'Renoviere'], ['Tram', 'Bus'], ['Bettdecki', 'Chüssi'],
      ['Staubsuger', 'Bäse'], ['Sunnebrülle', 'Sunnecreme'], ['Wösch ufhänke', 'Bügle'], ['Pöstler', 'Kurier']
    ],
    Tier: [
      ['Orca', 'Delfin'], ['Walhai', 'Wiisse Hai'], ['Chue', 'Geiss'], ['Murmeli', 'Eichhörnli'],
      ['Steibock', 'Gämsi'], ['Hund', 'Chatz'], ['Pinguin', 'Robbe'], ['Bär', 'Wolf'],
      ['Fuchs', 'Dachs'], ['Biene', 'Wespi'], ['Schnägg', 'Wurm'], ['Elefant', 'Nashorn'],
      ['Giraffe', 'Zebra'], ['Papagei', 'Wällesittich'], ['Ameisi', 'Spinne'], ['Igel', 'Maulwurf'],
      ['Frosch', 'Chrott'], ['Adler', 'Falk'], ['Hamster', 'Meersäuli'], ['Qualle', 'Tintefisch']
    ],
    'Freizit & Sport': [
      ['Skifahre', 'Snowboarde'], ['Jasse', 'Poker'], ['Schwinge', 'Ringe'], ['Velofahre', 'Jogge'],
      ['Wandere', 'Klettere'], ['Fuessball', 'Iishockey'], ['Tennis', 'Badminton'], ['Schwümme', 'Tauche'],
      ['Bowling', 'Minigolf'], ['Grilliere', 'Picknick'], ['Karaoke', 'Disco'], ['Serie luege', 'Film luege'],
      ['Game', 'Brettspiel'], ['Yoga', 'Pilates'], ['Schlittle', 'Schlittschuehlaufe'], ['Fische', 'Böötle'],
      ['Fotografiere', 'Male'], ['Gartne', 'Pflanze umtopfe'], ['Lisme', 'Nähje'], ['Escape Room', 'Rätsel']
    ],
    'Reise & Ferie': [
      ['Flugzüg', 'Zug'], ['Hotel', 'Ferienwohnig'], ['Strand', 'See'], ['Koffer', 'Rucksack'],
      ['Pass', 'ID'], ['Kreuzfahrt', 'Fähri'], ['Camping', 'Glamping'], ['Städtetrip', 'Roadtrip'],
      ['Stadtfüehrig', 'Museumsbsuech'], ['Souvenir', 'Postcharte'], ['Sunnebrand', 'Mückestich'], ['Jetlag', 'Schlafmangel'],
      ['Flughafe', 'Bahnhof'], ['Boarding-Pass', 'Billett'], ['Reiseführer', 'Landcharte'], ['Mietauto', 'Taxi'],
      ['Hängematte', 'Liegestuel'], ['Skiferie', 'Wanderferie'], ['Zoll', 'Grenzkontrolle'], ['Backpacker', 'Tourist']
    ],
    Bruef: [
      ['Lehrerin', 'Kindergärtnerin'], ['Arzt', 'Zahnarzt'], ['Polizist', 'Füürwehrmaa'], ['Pilot', 'Lokführer'],
      ['Koch', 'Bäcker'], ['Coiffeur', 'Kosmetikerin'], ['Informatiker', 'Elektriker'], ['Buur', 'Gärtner'],
      ['Architekt', 'Ingenieur'], ['Pflegefachfrau', 'Hebamme'], ['Anwalt', 'Richter'], ['Journalist', 'Fotograf'],
      ['Verchäufer', 'Kassierer'], ['Mechaniker', 'Velomech'], ['Banker', 'Buechhalter'], ['Schauspieler', 'Sänger'],
      ['Tierarzt', 'Zoowärter'], ['Buschauffeur', 'Tramchauffeur'], ['Maler', 'Gipser'], ['Psychologin', 'Coach']
    ],
    Chleider: [
      ['Jeans', 'Stoffhose'], ['Pullover', 'Hoodie'], ['Turnschueh', 'Stiefel'], ['Kappe', 'Mütze'],
      ['Schal', 'Halstuech'], ['Bikini', 'Badhose'], ['Pyjama', 'Trainerhose'], ['Krawatte', 'Fliege'],
      ['Händsche', 'Fäustling'], ['Rock', 'Kleid'], ['Gurt', 'Hosetreger'], ['Sunnehuet', 'Strohhuet'],
      ['Socke', 'Strumpfhose'], ['Winterjagge', 'Weste'], ['T-Shirt', 'Hemd'], ['Ohrring', 'Halschetti'],
      ['Sneaker', 'Flip-Flops'], ['Anzug', 'Smoking'], ['Unterhose', 'Boxershorts'], ['Brülle', 'Kontaktlinse']
    ],
    'Natur & Wätter': [
      ['Gwitter', 'Rege'], ['Schnee', 'Hagel'], ['Regeboge', 'Sunneuntergang'], ['Nebel', 'Wolke'],
      ['Wald', 'Park'], ['Bärg', 'Hügel'], ['See', 'Fluss'], ['Wasserfall', 'Brunne'],
      ['Vulkan', 'Gletscher'], ['Wüeste', 'Strand'], ['Blitz', 'Donner'], ['Sturm', 'Wind'],
      ['Höhli', 'Felswand'], ['Blueme', 'Struuch'], ['Baum', 'Busch'], ['Mond', 'Sunne'],
      ['Stern', 'Komet'], ['Insle', 'Halbinsle'], ['Schneemaa', 'Iglu'], ['Herbstlaub', 'Tannzapfe']
    ],
    Schwiiz: [
      ['Matterhorn', 'Eiger'], ['Sackmesser', 'Multitool'], ['Schwiizer Uhr', 'Smartwatch'], ['Chuehglogge', 'Trychle'],
      ['Bundeshuus', 'Rathuus'], ['Fasnacht', 'Halloween'], ['1. August', 'Silvester'], ['Jodle', 'Ländlermusig'],
      ['Röstigrabe', 'Sprachgrenze'], ['Gotthard', 'San Bernardino'], ['Rheinfall', 'Giessbachfäll'], ['Edelweiss', 'Enzian'],
      ['Caquelon', 'Raclette-Ofe'], ['Chäsi', 'Schoggifabrik'], ['Halbtax', 'GA'], ['Zahnradbahn', 'Gondelbahn'],
      ['Chalet', 'Alphütte'], ['Landsgmeind', 'Gmeindsversammlig'], ['Sechseläute', 'Knabeschiesse'], ['Militär', 'Zivildienst']
    ],
    'Musig & Party': [
      ['Gitarre', 'Ukulele'], ['Klavier', 'Keyboard'], ['Schlagzüg', 'Cajon'], ['DJ', 'Band'],
      ['Rap', 'Hip-Hop'], ['Rock', 'Metal'], ['Techno', 'House'], ['Schlager', 'Volksmusig'],
      ['Chor', 'Orchester'], ['Tanzkurs', 'Zumba'], ['Geburtstagsparty', 'Überraschigsparty'], ['Chopfhörer', 'Lutsprecher'],
      ['Vinyl', 'CD'], ['Mikrofon', 'Megafon'], ['Discokugle', 'Lasershow'], ['Playlist', 'Album'],
      ['Cocktail', 'Shot'], ['Konfetti', 'Luftballon'], ['Afterparty', 'Vorglüehe'], ['Strassemusiker', 'Talentshow']
    ],
    'Chuchi & Huus': [
      ['Pfanne', 'Topf'], ['Mixer', 'Pürierstab'], ['Toaster', 'Sandwichmaker'], ['Chüelschrank', 'Gfrierschrank'],
      ['Gable', 'Löffel'], ['Teller', 'Schüssle'], ['Abwäschmaschine', 'Wöschmaschine'], ['Backofe', 'Mikrowälle'],
      ['Sofa', 'Sessel'], ['Bett', 'Sofabett'], ['Tisch', 'Pult'], ['Lampe', 'Cherze'],
      ['Spiegel', 'Fänster'], ['Duschi', 'Badwanne'], ['Zahnpasta', 'Seife'], ['WC-Papier', 'Haushaltpapier'],
      ['Zimmerpflanze', 'Blumestruss'], ['Teppich', 'Vorhang'], ['Fernseh', 'Beamer'], ['Schublade', 'Chaschte']
    ]
  };
  const ALL = 'Alli Kategorie';

  // ---------- Zustand ----------
  let players = [];
  let settings = { impostors: 1, category: ALL, undercover: false, hint: true, timer: 3 };
  let round = null;
  let revealIndex = 0;
  let timerId = null;

  try {
    const saved = JSON.parse(store.get('impostor-setup') || 'null');
    if (saved && Array.isArray(saved.players) && saved.players.length >= 3) players = saved.players;
    if (saved && saved.settings) settings = { ...settings, ...saved.settings };
  } catch (e) { /* egal */ }
  // Standardnamen («Spieler 3») sind nur Platzhalter, damit man direkt tippen kann
  players = players.map((p) => (/^Spieler \d+$/.test(String(p).trim()) ? '' : p));
  if (players.length < 3) players = ['', '', '', ''];

  const save = () => store.set('impostor-setup', JSON.stringify({ players, settings }));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const maxImpostors = () => Math.max(1, Math.floor((players.length - 1) / 2));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- Bildschirme ----------
  function render(html) {
    clearInterval(timerId);
    app.innerHTML = html;
    app.classList.remove('imp-enter');
    void app.offsetWidth;
    app.classList.add('imp-enter');
  }

  function showSetup() {
    settings.impostors = Math.min(settings.impostors, maxImpostors());
    const cats = [ALL, ...Object.keys(WORDS)];
    render(`
      <div class="imp-card">
        <h2>Wer spielt mit?</h2>
        <ol class="imp-players">
          ${players.map((p, i) => `
            <li>
              <input type="text" value="${esc(p)}" placeholder="Spieler ${i + 1}" data-player="${i}" maxlength="20" autocomplete="off" aria-label="Name Spieler ${i + 1}">
              <button type="button" class="imp-icon" data-remove="${i}" aria-label="Spieler entfernen" ${players.length <= 3 ? 'disabled' : ''}>✕</button>
            </li>`).join('')}
        </ol>
        <button type="button" class="btn btn-ghost btn-small" id="imp-add" ${players.length >= 12 ? 'disabled' : ''}>＋ Spieler</button>

        <div class="imp-settings">
          <div class="imp-setting">
            <span>Impostors</span>
            <div class="imp-stepper">
              <button type="button" data-step="-1" aria-label="weniger">−</button>
              <strong id="imp-count">${settings.impostors}</strong>
              <button type="button" data-step="1" aria-label="mehr">+</button>
            </div>
          </div>
          <label class="imp-setting">
            <span>Kategorie</span>
            <select id="imp-cat">${cats.map((c) => `<option ${c === settings.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
          </label>
          <label class="imp-setting">
            <span>Diskussionsziit</span>
            <select id="imp-timer">${[0, 2, 3, 5].map((m) => `<option value="${m}" ${m === settings.timer ? 'selected' : ''}>${m ? `${m} Minute` : 'Ohni Timer'}</option>`).join('')}</select>
          </label>
          <label class="imp-toggle"><input type="checkbox" id="imp-hint" ${settings.hint ? 'checked' : ''}><span>Impostor gseht d Kategorie</span></label>
          <label class="imp-toggle"><input type="checkbox" id="imp-under" ${settings.undercover ? 'checked' : ''}><span>Undercover-Modus<small>Impostor kriegt es ähnlichs Wort statt gar keis</small></span></label>
        </div>

        <button type="button" class="btn btn-primary imp-big" id="imp-start">Spiel starte</button>
      </div>`);

    app.querySelectorAll('[data-player]').forEach((inp) => inp.addEventListener('input', () => {
      players[Number(inp.dataset.player)] = inp.value;
      save();
    }));
    app.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => {
      players.splice(Number(btn.dataset.remove), 1);
      save();
      showSetup();
    }));
    app.querySelector('#imp-add').addEventListener('click', () => {
      players.push('');
      save();
      showSetup();
      const inputs = app.querySelectorAll('[data-player]');
      inputs[inputs.length - 1].focus();
    });
    app.querySelectorAll('[data-step]').forEach((btn) => btn.addEventListener('click', () => {
      const n = settings.impostors + Number(btn.dataset.step);
      if (n < 1 || n > maxImpostors()) {
        toast(n < 1 ? 'Mindestens 1 Impostor.' : `Bi ${players.length} Spieler gaht maximal ${maxImpostors()}.`);
        return;
      }
      settings.impostors = n;
      app.querySelector('#imp-count').textContent = n;
      save();
    }));
    app.querySelector('#imp-cat').addEventListener('change', (e) => { settings.category = e.target.value; save(); });
    app.querySelector('#imp-timer').addEventListener('change', (e) => { settings.timer = Number(e.target.value); save(); });
    app.querySelector('#imp-hint').addEventListener('change', (e) => { settings.hint = e.target.checked; save(); });
    app.querySelector('#imp-under').addEventListener('change', (e) => { settings.undercover = e.target.checked; save(); });
    app.querySelector('#imp-start').addEventListener('click', startRound);
  }

  const nameOf = (i) => (players[i] && players[i].trim()) || `Spieler ${i + 1}`;

  function startRound() {
    players = players.map((p) => p.trim());
    save();
    const cats = settings.category === ALL ? Object.keys(WORDS) : [settings.category];
    const category = cats[Math.floor(Math.random() * cats.length)];
    const pair = WORDS[category][Math.floor(Math.random() * WORDS[category].length)];
    const flip = Math.random() < 0.5; // welches Wort die Mehrheit bekommt
    const word = flip ? pair[1] : pair[0];
    const decoy = flip ? pair[0] : pair[1];
    const impostors = shuffle(players.map((_, i) => i)).slice(0, settings.impostors);
    round = { category, word, decoy, impostors, starter: Math.floor(Math.random() * players.length) };
    revealIndex = 0;
    showPass();
  }

  function showPass() {
    if (revealIndex >= players.length) { showDiscuss(); return; }
    const name = nameOf(revealIndex);
    render(`
      <div class="imp-card imp-center">
        <p class="imp-step">${revealIndex + 1} / ${players.length}</p>
        <h2>Gib s Handy<br><span class="imp-name">${esc(name)}</span></h2>
        <p class="imp-muted">Nur ${esc(name)} darf jetzt luege. Alli andere: wegluege! 🙈</p>
        <button type="button" class="btn btn-primary imp-big" id="imp-reveal">Ich bi ${esc(name)} – zeig mis Wort</button>
      </div>`);
    app.querySelector('#imp-reveal').addEventListener('click', showRole);
  }

  function showRole() {
    const isImp = round.impostors.includes(revealIndex);
    let secret;
    if (isImp && !settings.undercover) {
      secret = `<div class="imp-role imp-role-bad"><span class="imp-role-label">Du bisch</span><strong class="imp-glitch" data-text="DE IMPOSTOR">DE IMPOSTOR</strong>${settings.hint ? `<span class="imp-role-hint">Kategorie: ${esc(round.category)}</span>` : ''}<span class="imp-role-tip">Bluff! Find use, um was es gaht. 🤫</span></div>`;
    } else {
      const w = isImp ? round.decoy : round.word;
      secret = `<div class="imp-role"><span class="imp-role-label">Dis Wort</span><strong class="imp-word">${esc(w)}</strong><span class="imp-role-hint">Kategorie: ${esc(round.category)}</span></div>`;
    }
    render(`
      <div class="imp-card imp-center">
        <div class="imp-flip">${secret}</div>
        <button type="button" class="btn btn-ghost imp-big" id="imp-hide">Verstecke &amp; witergäh →</button>
      </div>`);
    app.querySelector('#imp-hide').addEventListener('click', () => { revealIndex++; showPass(); });
  }

  function showDiscuss() {
    const starter = nameOf(round.starter);
    const minutes = settings.timer;
    render(`
      <div class="imp-card imp-center">
        <h2>Alli kenned ihri Rolle!</h2>
        <p class="imp-muted">Reihum seit jedi Person <strong>eis</strong> Wort, wo zum Begriff passt. Nöd z offensichtlich, suscht merkt de Impostor öppis!</p>
        <p class="imp-starter">🎲 <strong>${esc(starter)}</strong> fangt aa.</p>
        ${minutes ? `<div class="imp-timer" id="imp-timer-box"><span id="imp-clock">${minutes}:00</span><button type="button" class="btn btn-ghost btn-small" id="imp-timer-btn">▶ Timer starte</button></div>` : ''}
        <button type="button" class="btn btn-primary imp-big" id="imp-vote">Abstimme &amp; ufdecke</button>
      </div>`);
    if (minutes) {
      let remaining = minutes * 60;
      let running = false;
      let endAt = 0;
      const clock = app.querySelector('#imp-clock');
      const btn = app.querySelector('#imp-timer-btn');
      const box = app.querySelector('#imp-timer-box');
      btn.addEventListener('click', () => {
        if (running) {
          remaining = (endAt - Date.now()) / 1000;
          running = false;
          clearInterval(timerId);
          btn.textContent = '▶ Wiiter';
          return;
        }
        running = true;
        endAt = Date.now() + remaining * 1000;
        btn.textContent = '⏸ Pause';
        timerId = setInterval(() => {
          remaining = (endAt - Date.now()) / 1000;
          if (remaining <= 0) {
            clearInterval(timerId);
            clock.textContent = '0:00';
            box.classList.add('imp-time-up');
            btn.textContent = '⏰ Ziit um!';
            btn.disabled = true;
            toast('⏰ Ziit um! Jetzt wird abgstimmt.');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return;
          }
          const m = Math.floor(remaining / 60);
          const s = Math.floor(remaining % 60);
          clock.textContent = `${m}:${String(s).padStart(2, '0')}`;
        }, 250);
      });
    }
    app.querySelector('#imp-vote').addEventListener('click', showVote);
  }

  function showVote() {
    render(`
      <div class="imp-card imp-center">
        <h2>Wer isch de Impostor?</h2>
        <p class="imp-muted">Zählt uf drü und zeiged alli gliichziitig uf die verdächtigst Person. Denn deckt uf!</p>
        <div class="imp-countdown" id="imp-cd">3</div>
        <button type="button" class="btn btn-primary imp-big" id="imp-show">Impostor ufdecke 🔍</button>
      </div>`);
    const cd = app.querySelector('#imp-cd');
    let n = 3;
    timerId = setInterval(() => {
      n--;
      if (n <= 0) { cd.textContent = '👉'; clearInterval(timerId); return; }
      cd.textContent = String(n);
    }, 900);
    app.querySelector('#imp-show').addEventListener('click', showResult);
  }

  function showResult() {
    const names = round.impostors.map((i) => `<span class="imp-name">${esc(nameOf(i))}</span>`).join(' &amp; ');
    const plural = round.impostors.length > 1;
    render(`
      <div class="imp-card imp-center">
        <p class="imp-role-label">${plural ? 'D Impostors sind' : 'De Impostor isch'}</p>
        <h2 class="imp-result">${names}</h2>
        <div class="imp-solution">
          <p>S geheime Wort isch gsi: <strong>${esc(round.word)}</strong></p>
          ${settings.undercover ? `<p>De Impostor hät gha: <strong>${esc(round.decoy)}</strong></p>` : ''}
          <p class="imp-muted">Kategorie: ${esc(round.category)}</p>
        </div>
        <div class="btn-row imp-center-row">
          <button type="button" class="btn btn-primary" id="imp-again">🔁 Nomal spiele</button>
          <button type="button" class="btn btn-ghost" id="imp-setup">⚙️ Spieler & Iistellige</button>
        </div>
      </div>`);
    app.querySelector('#imp-again').addEventListener('click', startRound);
    app.querySelector('#imp-setup').addEventListener('click', showSetup);
  }

  showSetup();
})();
