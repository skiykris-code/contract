# Contracte de închiriere online — ghid de instalare (RO)

Site unde chiriașul își alege casa, completează datele, semnează electronic,
și primește automat pe email PDF-ul cu contractul AST (Assured Shorthold Tenancy),
complet cu datele tale și ale lui. Tu primești o copie automat (BCC).

## Cum funcționează

1. `index.html` — site-ul public (în engleză, pentru chiriași)
2. `config.json` — **datele tale + casele tale** (editezi doar acest fișier)
3. `api/contract.js` — backend serverless: validează datele, generează PDF-ul, trimite emailul

Totul rulează **gratuit pe Vercel** (ca GitHub Pages, dar cu backend inclus).

## Pasul 1 — Completează config.json

Deschide `config.json` și pune:
- datele tale reale la `landlord` (nume, adresă, telefon, email)
- schema reală de protecție a depozitului la `depositScheme` (DPS / TDS / mydeposits — cea pe care o folosești tu)
- casele tale la `properties` — copiezi un bloc `{...}` pentru fiecare casă nouă.
  `id`-ul trebuie să fie unic (ex. `prop-3`). Pui `"available": false` când o casă e ocupată și dispare de pe site.

## Pasul 2 — Gmail App Password (pentru trimiterea emailurilor)

1. Intră pe https://myaccount.google.com/security → activează **2-Step Verification** (dacă nu e deja)
2. Apoi https://myaccount.google.com/apppasswords → creezi o parolă de aplicație (16 caractere)
3. O păstrezi pentru pasul 4 — NU o pune niciodată în cod sau pe GitHub

## Pasul 3 — Urcă pe GitHub

Ca la proiectele tale anterioare: repo nou (ex. `rental-contracts`), urci toate fișierele.

## Pasul 4 — Deploy pe Vercel

1. https://vercel.com → Sign up with GitHub (gratuit)
2. **Add New → Project** → alegi repo-ul `rental-contracts` → Deploy
3. În proiect: **Settings → Environment Variables** → adaugi:
   - `GMAIL_USER` = emailul tău Gmail
   - `GMAIL_APP_PASSWORD` = parola de aplicație de la pasul 2
4. **Deployments → Redeploy** (ca să prindă variabilele)

Gata — primești un link de tip `rental-contracts.vercel.app` pe care îl dai chiriașilor.
Poți lega și un domeniu propriu gratuit din Settings → Domains.

## Testare

Intră pe site, alege o casă, completează cu datele tale de test și emailul tău.
În ~30 de secunde primești PDF-ul. Verifică și folderul Spam prima dată.

## Important — partea legală (citește!)

- Contractul generat e un **AST standard pentru Anglia**, cu clauzele uzuale (chirie, depozit,
  obligații, notice, Tenant Fees Act etc.). E un punct de pornire solid, dar **nu sunt avocat** —
  merită să-l verifici o dată cu un solicitor sau cu asociația de landlorzi (NRLA are modele verificate),
  mai ales dacă ai situații speciale (HMO, garanți, chirie prin universal credit).
- Semnătura electronică (nume tastat + declarație bifată) **este validă în Anglia** pentru AST-uri,
  iar PDF-ul include înregistrarea semnării (dată, oră, IP, declarația bifată).
- Nu uita obligațiile tale ca landlord, care există indiferent de contract: protejarea depozitului
  în 30 de zile + prescribed information, Gas Safety Certificate, EICR, EPC, ghidul "How to Rent",
  Right to Rent check pentru fiecare chiriaș. Fără astea, notice-ul de Section 21 devine invalid.
- Recomandare: înainte să consideri contractul "bătut în cuie", verifică identitatea chiriașului
  (Right to Rent e oricum obligatoriu) — site-ul semnează pe baza datelor declarate de el.

## Vrei să adaugi mai târziu?

Idei ușor de adăugat: poze la case, garant (guarantor) ca semnatar al doilea,
salvarea contractelor în Firebase (știi deja Firestore), sau notificare pe WhatsApp.
