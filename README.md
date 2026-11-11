# Passordsjekker

Sjekk om et passord har vært med i en kjent datalekkasje, uten at selve passordet blir sendt noe sted.

Siden bruker [Pwned Passwords](https://haveibeenpwned.com/Passwords) fra Have I Been Pwned. Den er laget med vanlig HTML, CSS og JavaScript, uten rammeverk og uten avhengigheter.

## Hva den gjør

- **Lekkasjesjekk.** Forteller om passordet finnes i kjente datalekkasjer, og hvor mange ganger det er sett.
- **Styrkeindikator.** Et grovt anslag som regnes ut lokalt mens du skriver.
- **Forklaring.** Viser nøyaktig hva som sendes over nettet, slik at du kan se det selv i stedet for å ta det på tro.

## Slik fungerer det

Tjenesten bruker k-anonymitet, som betyr at den aldri får vite hvilket passord du spør om:

1. Nettleseren gjør passordet om til en SHA-1-hash. For `password` er det `5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8`.
2. Bare de fem første tegnene (`5BAA6`) sendes: `GET https://api.pwnedpasswords.com/range/5BAA6`.
3. Tjenesten svarer med alle hashene som starter med `5BAA6`, uten de fem første tegnene. Det er vanligvis flere hundre linjer på formen `SUFFIKS:ANTALL`.
4. Nettleseren leter etter resten av hashen (`1E4C9B93F3F0682250B6CF8331B7EE68FD8`) i listen. Står den der, er passordet lekket, og tallet sier hvor mange ganger det er sett.

Passordet og resten av hashen forlater aldri maskinen din. Tjenesten ser bare at du spurte om ett av de mange passordene som deler de samme fem tegnene.

Sjekken mot lekkasjer kjøres bare når du trykker på knappen, ikke for hver tast. Det er det API-dokumentasjonen ber om. Styrkeindikatoren kjøres for hver tast, men den bruker ikke nettverket.

## Kjør lokalt

Siden bruker ES-moduler, og nettleseren laster ikke moduler fra `file://`. Start en enkel webserver i mappen:

```
python -m http.server 8000
```

På Mac og Linux heter kommandoen ofte `python3`. Åpne så <http://localhost:8000>.

`localhost` regnes som en sikker adresse, så nettleseren lar siden bruke `crypto.subtle`, som trengs for å regne ut SHA-1. Åpner du siden via en vanlig `http://`-adresse på nettverket (for eksempel `http://192.168.1.20:8000`), får du en forklaring i stedet for en sjekk.

Prøv passordet `password`. Det er et av de mest brukte passordene, så du skal få et stort tall.

## Tester

Krever Node.js 20 eller nyere. Det er ingenting å installere.

```
npm test
```

eller uten npm:

```
node --test
```

Testene dekker:

- SHA-1 mot kjente verdier, også med æøå.
- Tolking av svaret fra API-et, inkludert svar som ikke ser ut som en hash-liste.
- Hele sjekken med en falsk `fetch`, slik at ingen ekte nettverkskall brukes. En av testene bekrefter at bare de fem første tegnene sendes.
- Styrkeestimatet.
- At id-ene `app.js` leter etter finnes i `index.html`, og at siden ikke skriver HTML med `innerHTML`.

Siden og det ekte API-et er ikke dekket av testene. Det må du prøve selv i nettleseren.

## Filer

| Fil | Innhold |
| --- | --- |
| `index.html` | Siden |
| `style.css` | Utseende, med lys og mørk modus |
| `app.js` | Kobler siden til logikken |
| `pwned.js` | SHA-1, k-anonymitet, tolking av svaret og selve sjekken |
| `strength.js` | Grovt anslag på styrke |
| `test/` | Tester |

`pwned.js` og `strength.js` har ingen kode som rører siden, så de kan testes med Node. Alt som rører siden ligger i `app.js`.

## Personvern og sikkerhet

- Passordet sendes aldri. Bare de fem første tegnene i hashen går ut.
- Siden lagrer ingenting: ingen cookies og ingen `localStorage`.
- Passordfeltet har ikke `name`, så passordet kan ikke havne i adressefeltet selv om JavaScript skulle feile.
- En `Content-Security-Policy` i `index.html` tillater bare sidens egne filer og kall til `api.pwnedpasswords.com`.
- `Referer` er slått av, så tjenesten ikke får vite hvilken side forespørselen kom fra.
- Tekst skrives med `textContent`, ikke `innerHTML`.
- Hvis svaret fra API-et ikke ser ut som en hash-liste, for eksempel en innloggingsside på et gjestenett, viser siden en feilmelding i stedet for «ikke funnet».

## Begrensninger

- «Ikke funnet» betyr ikke at passordet er trygt, bare at det ikke finnes i dette datasettet.
- Styrkeindikatoren er et grovt overslag: lengde ganger tegntyper, med trekk for gjentakelser, rekker som `abc` og `123`, og en kort liste med vanlige passord. Den kjenner ikke igjen kjente setninger eller ordbokord, og gir ofte setninger høyere styrke enn de fortjener. [zxcvbn](https://github.com/dropbox/zxcvbn) er et mer nøyaktig alternativ hvis du trenger det. Rådene fokuserer på lengde og ikke på krav om spesialtegn, i tråd med NIST sine retningslinjer for passord (SP 800-63B).
- SHA-1 brukes fordi API-et krever det. Det er ikke et vern for passordet.
- Fem tegn av hashen sendes. Det er nok til at tjenesten ikke kan vite hvilket passord du spør om, men ikke ingenting.

## Legg ut på GitHub Pages

1. Lag et repository på GitHub og last opp filene.
2. Gå til **Settings** og **Pages**.
3. Velg **Deploy from a branch**, branchen `main` og mappen `/ (root)`.
4. Etter et minutt ligger siden på `https://<brukernavn>.github.io/<repo>/`.

## Videre arbeid

- Send headeren `Add-Padding: true`, slik at alle svar får omtrent samme størrelse. Da blir det vanskeligere å gjette hvilken prefiks som ble spurt om ut fra størrelsen på svaret. Rader med antall 0 er bare fyll og må ignoreres (`findCount` gjør det allerede). Test at nettleseren slipper headeren gjennom (CORS) før du legger den inn.
- Bytt styrkeestimatet med zxcvbn.
- Legg til engelsk som språkvalg.

## Kilder

- [Pwned Passwords API, Have I Been Pwned API v3](https://haveibeenpwned.com/API/v3)
- Passorddata fra [Have I Been Pwned](https://haveibeenpwned.com/Passwords). Prosjektet er ikke tilknyttet tjenesten.
