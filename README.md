# bananebrot.ch 🍌

Die persönliche Website von Oliver Thalmann: reines HTML, CSS und JavaScript, ohne Baukasten und ohne Kosten. Läuft auf GitHub Pages.

## Was ist drin?

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite mit Bananenbrot-Maskottchen, Rezept-Zettel, Bananen-Fakten und Kontakt |
| `ueber-mich.html` | Steckbrief, Werdegang und Interessen |
| `projekte.html` | Projekt-Karten mit Filter |
| `spiel.html` | Mini-Game «Bananebrot-Bäcker» |
| `rezept.html` | Das Bananenbrot-Rezept mit Reife-Check, Mengen-Umschalter, Abhak-Liste und Back-Timer |
| `404.html` | Lustige Fehlerseite (wird von GitHub Pages automatisch verwendet) |
| `css/style.css` | Das ganze Design inkl. Schoggi-Modus |
| `js/main.js` | Schoggi-Modus, Menü, Fakten, Filter, Easter Eggs |
| `js/game.js` | Das Back-Spiel |
| `js/rezept.js` | Die interaktiven Teile der Rezeptseite |
| `CNAME` | Deine Domain für GitHub Pages |

**Versteckte Features:** Das Brot auf der Startseite reagiert, wenn man es anklickt. Beim Scrollen zeigt ein Ofen-Thermometer die Temperatur, beim Klicken fliegen Brösmeli. Wer «banane» tippt, sieht eine fliegende Banane, «schoggi» schaltet den Schoggi-Modus um und «orca» lässt einen Orca springen. Der Konami-Code (↑↑↓↓←→←→BA) oder fünf schnelle Klicks aufs Logo lösen einen Bananen-Regen aus.

## Texte anpassen

Alle Stellen, die du noch ausfüllen solltest, sind **orange markiert** (`<span class="todo">…</span>`) oder mit `<!-- ✏️ … -->` kommentiert. Den Text ersetzen und das `<span class="todo">` drumherum löschen. Fertig.

- **Foto:** Lade ein Bild als `img/oliver.jpg` hoch und ersetze in `ueber-mich.html` das `OT` im Avatar durch `<img src="img/oliver.jpg" alt="Oliver Thalmann">`.
- **E-Mail / LinkedIn:** in `index.html` im Abschnitt «Kontakt».

## Online stellen mit GitHub Pages

1. Auf [github.com](https://github.com) ein Konto erstellen.
2. Oben rechts **+ → New repository**. Name z. B. `bananebrot`, Sichtbarkeit **Public** (GitHub Pages ist im Gratis-Konto nur für öffentliche Repositories verfügbar). **Create repository**.
3. Auf **uploading an existing file** klicken und **den Inhalt** dieses Ordners (nicht den Ordner selbst) ins Fenster ziehen, inklusive der Ordner `css` und `js` und der Datei `CNAME`. Unten **Commit changes**.
4. Im Repository: **Settings → Pages**. Bei *Source* «Deploy from a branch», Branch **main** und Ordner **/ (root)** wählen, **Save**.
5. Ebenfalls unter **Settings → Pages**: Bei *Custom domain* `bananebrot.ch` eintragen und **Save**.

## Domain bei Infomaniak verbinden

1. Im [Infomaniak Manager](https://manager.infomaniak.com) zu **Domains → bananebrot.ch → DNS-Zone** gehen.
2. Vorhandene **A**- und **AAAA**-Einträge für die Hauptdomain (`@` / leer) und für `www` löschen, falls sie auf Infomaniak zeigen.
   ⚠️ **MX-, TXT- und SPF-Einträge nicht anfassen**, die braucht deine E-Mail!
3. Diese Einträge hinzufügen:

| Typ | Name | Wert |
|---|---|---|
| A | (leer / @) | `185.199.108.153` |
| A | (leer / @) | `185.199.109.153` |
| A | (leer / @) | `185.199.110.153` |
| A | (leer / @) | `185.199.111.153` |
| AAAA | (leer / @) | `2606:50c0:8000::153` |
| AAAA | (leer / @) | `2606:50c0:8001::153` |
| AAAA | (leer / @) | `2606:50c0:8002::153` |
| AAAA | (leer / @) | `2606:50c0:8003::153` |
| CNAME | `www` | `DEIN-GITHUB-NAME.github.io` |

4. Warten. Meist dauert es Minuten, manchmal bis zu 24 Stunden. Danach in GitHub unter **Settings → Pages** das Häkchen **Enforce HTTPS** setzen (sobald es anklickbar ist).

## Später etwas ändern

Im GitHub-Repository eine Datei anklicken, auf den Stift ✏️ klicken, ändern und **Commit changes**. Nach ca. einer Minute ist die Änderung online.
