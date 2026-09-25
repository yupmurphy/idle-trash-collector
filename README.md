# Tato Trash Empire

Un idle game de la **Moonlit Tato**: Tato ratonul strânge gunoiul de pe alee și
îl transformă într-un imperiu de plastic reciclat.

HTML, CSS și JavaScript simplu. Fără framework, fără build step, fără
dependențe la runtime.

## Cum îl pornești

```bash
node serve.js
```

Apoi deschizi <http://localhost:8140>. `docs/index.html` merge și deschis
direct de pe disc, dar service worker-ul (jocul offline) se înregistrează doar
peste http.

## Cum e pus cap la cap

```
docs/          tot jocul - se numește "docs" pentru că GitHub Pages publică
               doar din rădăcina repo-ului sau dintr-un folder cu exact acest nume
  index.html   scheletul paginii
  style.css    tot aspectul
  js/format.js numerele mari: K, M, B, T, AA, AB ... ZZ, AAA
  js/data.js   TOT ce se poate regla - rânduri, manageri, misiuni, schimburi
  js/state.js  save-ul (localStorage) și încărcarea lui
  js/engine.js regulile: producție, cumpărare, misiuni, cufere, offline
  js/ui.js     ecranele
  js/main.js   sunetul, ceasul, pornirea
serve.js       server static minimal, fără dependențe
```

`ui.js` construiește nodurile o singură dată și după aceea rescrie doar textele
și lățimile barelor. Dacă ar reconstrui rândurile de zece ori pe secundă s-ar
pierde animația de tap și poziția de scroll.

## Cum funcționează jocul

### Lanțul

Plasticul (♻️) e scorul. Nimic nu-l produce în afară de pungi:

```
Bidoane  ->  Sticle  ->  Paie  ->  Pungi  ->  Plastic
```

Fiecare rând produce **unități** din rândul de deasupra lui, nu resursă brută.
Un bidon cumpărat azi se vede peste câteva minute ca un val de plastic. Efectul
ăsta de compunere e motorul genului.

### Ratonii

Ratonii sunt valuta cu care cumperi tot. Îi primești pe secundă și îi asignezi
pe rânduri (butonul CUMPĂRĂ). Rata crește din două locuri:

- **praguri de haită** — la 50, 5.000, 500.000 ... de ratoni adunați: +1/sec și
  x2 la tot;
- **schimburi** — dai gunoi strâns, primești permanent ratoni/sec.

### Manageri

Un rând produce singur **doar dacă îi ai managerul**. Până atunci apeși pe
grămada din stânga și Tato scoate cu mâna cât ar produce rândul în 3 secunde
(`CFG.clickSeconds`).

Cărțile de manager vin **numai din cufere**. Prima carte a unui manager îl
angajează (nivel 1, rândul se automatizează); duplicatele îl urcă în nivel, și
fiecare nivel e x2 viteză.

### Cufere și misiuni

Misiunea curentă e sus, cu bara ei. Când o termini, cufărul de lângă ea începe
să se agite. Recompensa se aplică abia când îl deschizi — așa rândul nou și
cărțile care îl automatizează ajung în același moment.

Lista scriptată e în `MISSIONS`. După ea jocul generează misiuni la nesfârșit,
ca să nu rămâi fără cufere între niveluri.

### Praguri de cantitate

Fiecare rând se dublează la 10, 25, 50, 100, 200 ... de unități deținute. De
asta cumpăratul în bloc (x10, x100, MAX) contează.

### Offline

La revenire se plătesc maximum `CFG.offlineHours` ore, rulate în 120 de pași ca
lanțul să se compună și cât timp ai fost plecat.

## Ce reglezi și unde

Totul stă în `docs/js/data.js`.

| valoare | ce face |
| --- | --- |
| `CFG.clickSeconds` | câte secunde de producție îți dă un tap |
| `CFG.offlineHours` | cât din timpul cât ai lipsit se plătește |
| `CFG.ratoniBase` | ratoni/sec la început |
| `CFG.startRatoni`, `CFG.startBags` | cu ce pornește un jucător nou |
| `TIERS[].rate` | cât produce o unitate pe secundă |
| `TIERS[].cost`, `.growth` | prețul primei unități și cu cât se scumpește |
| `QTY_STEPS` | pragurile care dublează un rând |
| `cardsForLevel()` | câte cărți costă nivelul următor de manager |
| `MISSIONS` | misiunile scriptate, cufărul lor, ce deblochează |
| `RAT_MILESTONES` | pragurile de haită |
| `TRADES` | schimburile: ce costă, cât dau, când apar |

Adaugi un rând nou punând un obiect în `TIERS`, un manager pentru el în
`MANAGERS` și o misiune cu `unlock: '<id-ul rândului>'` în `MISSIONS`. Restul
se construiește singur.

## Nivelul 1 (v1.0)

Cartierul de Plastic: pungi, paie, sticle, bidoane. Nivelurile următoare adaugă
rânduri noi și manageri noi în fondul de cărți.

## De făcut

- onboarding (primele tapuri, explicat în joc)
- nivelul 2 și o hartă între niveluri
- artă proprie în loc de emoji
- ambalare Android cu Capacitor, ca la Wobbly Raccoon
