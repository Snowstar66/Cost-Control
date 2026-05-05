# Mina Utgifter - komplett product regeneration package

Datum: 2026-05-05  
Syfte: Samlat underlag för att kunna generera om appen och jämföra resultatet mot nuvarande produktintent.  
Format: Outcome -> Epics -> User story ideas -> User journeys -> UX spec -> constraints.  
Spårbarhet: Alla epics, stories, journeys, UX-krav och constraints har stabila ID:n.

## 1. Outcome

| ID | Outcome title | Value outcome | Primary actor | Success signals |
| --- | --- | --- | --- | --- |
| OUT-001 | Trygg kontroll över privata återkommande kostnader och enskilda köp | En privatperson eller ett hushåll ska snabbt förstå vad som dras, vad som kan sägas upp, vad som köps enskilt och hur privatekonomin påverkas över tid, utan konto eller bankkoppling. | Privat användare, par eller hushållsansvarig | Användaren kan skapa en plånbok, registrera återkommande utgifter, importera eller lägga in enskilda köp, se tidslinje/statistik, markera signaler, exportera data och agera på uppsägningar eller besparingsmöjligheter. |

## 2. Epic Definitions

Alla epics nedan bidrar till `OUT-001`.

| Epic ID | Title | Purpose | Scope boundary | Local risk note |
| --- | --- | --- | --- | --- |
| EP-001 | Plånbok, onboarding och dataseparering | Ge användaren en begriplig startpunkt där varje ekonomiskt sammanhang hålls separat. | Inkluderar skapa, välja, duplicera och konfigurera plånbok samt första användare. Exkluderar kontobaserad multi-user-synk. | Om plånbok/kontext blandas riskerar statistik och export att bli fel. |
| EP-002 | Återkommande utgifter | Fånga abonnemang, räkningar och andra planerade kostnader med tillräcklig struktur för prognos. | Inkluderar belopp, period, leverantör, kategori, betalare, datum, status, signaler och anteckningar. Exkluderar fakturaskanning som automatisk källa. | Ofullständig data måste tillåtas utan att förstöra totals. |
| EP-003 | Tidslinje och översikt | Visa när kostnader gäller, hur månader påverkas och hur användaren kan navigera från totalbild till detalj. | Inkluderar desktop-tidslinje, mobilöversikt, filter, sök, totals och snabblänkar. Exkluderar avancerad kalenderplanering. | Responsiv layout är kritisk eftersom stora tabeller annars blir oanvändbara på mobil. |
| EP-004 | Uppsägning, låsning och påminnelser | Hjälpa användaren att förstå när en kostnad faktiskt kan bli fri och skapa minnesstöd. | Inkluderar uppsägningstid, låst period, tidigaste fria månad, avslut, påminnelse och kalenderexport. Exkluderar automatisk uppsägning hos leverantör. | Beräkningar måste vara deterministiska och försiktiga. |
| EP-005 | Register och återanvändbar metadata | Minska friktion genom att återanvända personer, leverantörer och kategorier över flöden. | Inkluderar personer, leverantörer, kategorier, färg/ikon, kontaktinfo och kategoriregler. Exkluderar full CRM eller dokumentarkiv. | Register ska förbättra flödet utan att bli obligatoriska stopp. |
| EP-006 | Enskilda köp och kontoutdragsimport | Ge faktisk konsumtionsbild bredvid återkommande prognos. | Inkluderar manuella köp, import från CSV/XLSX/PDF, importförhandsgranskning, deduplicering, kategorisering och köpdetalj. Exkluderar direkt bankintegration. | Import måste vara tydlig och reversibel innan commit. |
| EP-007 | Signaler, klassning och konvertering | Göra både återkommande utgifter och köp handlingsbara genom signaler och kopplingar. | Inkluderar Granska, Onödigt, Återkommande, Värt det, Business, namnbyte av business-signal, köp -> återkommande och återkommande -> köp. | Signaler får inte se aktiva ut när de är släckta. |
| EP-008 | Statistik och beslutsstöd | Omvandla data till prioriteringar: vad kostar mest, vad återkommer, var finns läckor och vad påverkar budgeten. | Inkluderar återkommande analys, köpstatistik, köpradar, budgetutfall, kategori/person/leverantör, topphandlare och periodtrender. | Rankning ska följa visat mått, inte råka styras av en intern sortering. |
| EP-009 | Dataexport, backup, datafil och sync | Göra lokal-first data flyttbar och skyddad mot browser-rensning. | Inkluderar localStorage, JSON/ZIP/CSV/PDF/ICS, datafil, delningsfil, import som ny plånbok och experimentell molnsync via egen endpoint. Exkluderar hosted backend som krav. | Användaren måste förstå att lokal data kan försvinna utan backup. |
| EP-010 | Responsiv UX, hjälp och tomlägen | Göra appen begriplig och snabb på både desktop och mobil. | Inkluderar navigering, modaler, drawer, tomlägen, hjälpvy, mobilanpassade kort och primära actions. Exkluderar marketing-landningssida. | Text, knappar och belopp får inte överlappa i mobilvy. |
| EP-011 | Simulering och scenarioanalys | Låta användaren prova effekten av att ta bort kostnader utan att ändra originaldatan. | Inkluderar simulera bort återkommande utgift, simulerad statistik och återställning. Exkluderar flerårig forecasting med osäkerhetsmodell. | Simulering måste vara tydligt markerad så den inte misstolkas som sparad verklighet. |
| EP-012 | Produktadministration och planflaggor | Ge en kontrollerad yta för appinställningar, etiketter, planläge och tekniska datafunktioner. | Inkluderar Data-vy, lokal varning, premium/free-flagga, köp på/av och namn på business-signal. Exkluderar riktig betalvägg. | Planflaggor får inte lova kommersiell funktion som inte finns. |

## 3. User Story Ideas

Varje story är en native story idea. `Value intent` beskriver varför den finns. `Expected behavior` beskriver observerbart beteende.

| Story ID | Epic | Story idea title | Value intent | Expected behavior |
| --- | --- | --- | --- | --- |
| US-001 | EP-001 | Skapa första plånboken | Användaren ska snabbt komma från tom app till egen ekonomisk yta. | Onboarding låter användaren ange plånboksnamn, välja mall och skapa första kontexten. |
| US-002 | EP-001 | Kräva minst en första användare | Statistik per betalare och nya utgifter ska fungera direkt. | När första plånboken skapas promptas användaren att lägga till minst en person/betalare. |
| US-003 | EP-001 | Välja aktiv plånbok | Flera ekonomiska sammanhang ska kunna hållas isär. | Kontextväljaren byter aktiv plånbok och alla vyer filtreras till den. |
| US-004 | EP-001 | Konfigurera tidsfönster | Användaren ska kunna styra hur långt bakåt/framtåt planeringen visas. | Plånbokens månader bakåt och framåt kan ändras och påverkar tidslinje/statistik. |
| US-005 | EP-001 | Duplicera plånbok som mall | Återanvända struktur utan att bygga om register. | Appen kan skapa en ny plånbok med kopierad struktur enligt befintlig mall. |
| US-006 | EP-001 | Radera plånbok säkert | Ta bort fel eller testdata utan att lämna relationer kvar. | Radering tar bort relaterade personer, leverantörer, kategorier, utgifter, köp, filer, regler och filterreferenser. |
| US-007 | EP-001 | Visa tomt startläge | En ny användare ska förstå nästa steg. | Tom app visar tydlig startyta för ny plånbok eller demo/skip utan döda ytor. |
| US-008 | EP-002 | Skapa återkommande månadsutgift | Registrera vanligaste kostnadstypen. | Formulär sparar namn, belopp, månad, dragningsdag, period, kategori, betalare och leverantör. |
| US-009 | EP-002 | Skapa kvartals- och årsutgift | Återkommande kostnader med annan periodicitet ska periodiseras rätt. | Val av kvartal/år påverkar periodiserad statistik och kassaflöde korrekt. |
| US-010 | EP-002 | Skapa engångsperiod | Planerade engångskostnader ska kunna synas i rätt månad. | Periodtypen engång ger belopp i aktuell period utan att återkomma. |
| US-011 | EP-002 | Spara ofullständig utgift som utkast | Användaren ska kunna fånga något snabbt utan komplett data. | Saknas centrala fält sparas status `draft` och raden kan kompletteras senare. |
| US-012 | EP-002 | Redigera återkommande utgift | Felaktiga eller ändrade kostnader ska kunna korrigeras. | Redigering uppdaterar utgift och period utan att skapa dubbletter. |
| US-013 | EP-002 | Avsluta återkommande utgift | Avslutade kostnader ska sluta påverka framtid men finnas i historik. | Avslut sätter slutdatum/status och tidslinjen slutar räkna framtida månader. |
| US-014 | EP-002 | Ta bort återkommande utgift | Test eller felregistrering ska kunna rensas. | Borttagning tar bort utgift och relaterade perioder samt kopplar loss eventuella köp. |
| US-015 | EP-002 | Välja betalande person | Fördelning per person ska vara möjlig. | Utgift kan kopplas till person och synas i personsummeringar/filter. |
| US-016 | EP-002 | Välja kategori | Kostnadsmix ska bli begriplig. | Utgift kan kopplas till kategori med färg/ikon och räknas i kategoriöversikter. |
| US-017 | EP-002 | Välja eller skapa leverantör i flödet | Registrering ska gå fort utan att lämna formuläret. | Användaren kan välja befintlig leverantör eller skapa ny leverantör från utgiftsformuläret. |
| US-018 | EP-002 | Ange anteckning | Praktisk kontext ska kunna sparas utan separat dokument. | Anteckning lagras på utgift och visas i detalj. |
| US-019 | EP-002 | Bifoga underlag på utgift | Kvitto, avtal eller faktura ska kunna hållas nära posten. | Tillåtna filtyper kan bifogas och visas i utgiftsdetaljen. |
| US-020 | EP-003 | Visa återkommande tidslinje | Användaren ska se vilka månader varje utgift påverkar. | Desktop visar utgifter som rader och månader som kolumner med belopp/aktivitet. |
| US-021 | EP-003 | Visa mobil översikt | Mobilanvändaren ska kunna läsa samma data utan tabellkaos. | Mobilvy visar kompakta kort, månadsrader och expanderbara detaljer. |
| US-022 | EP-003 | Visa månadstotaler | Användaren ska förstå total belastning per månad. | Månadsrubriker eller sammanfattningar visar totals för vald period. |
| US-023 | EP-003 | Filtrera på kategori | Fokusera på en del av ekonomin. | Kategorifilter påverkar tidslinje, översikt och relevanta summeringar. |
| US-024 | EP-003 | Filtrera på betalare | Se vem som bär vilka kostnader. | Betalarfilter visar endast matchande utgifter/köp där relevant. |
| US-025 | EP-003 | Filtrera på signal | Användaren ska kunna se exempelvis Onödigt eller Business. | Signalfilter påverkar köp/översikt och släcks visuellt när det avmarkeras. |
| US-026 | EP-003 | Söka i utgifter och köp | Hitta poster snabbt. | Sök matchar namn, leverantör, handlare, kategori och relaterad text. |
| US-027 | EP-003 | Dölja historiska månader | Minska visuell belastning när fokus är framåt. | Toggle tar bort tidigare månader från tidslinjens fokus. |
| US-028 | EP-003 | Öppna detaljdrawer från tidslinje | Snabbt gå från översikt till åtgärd. | Klick på rad/cell öppnar detalj med redigera, avsluta, ta bort och filhantering. |
| US-029 | EP-003 | Snabbregistrera från global action | Ny data ska vara nära till hands oavsett vy. | Quick action erbjuder återkommande utgift, enskilt köp och import. |
| US-030 | EP-004 | Ange uppsägningstid | Förstå när bindning/uppsägning påverkar ekonomin. | Utgift kan ha uppsägningstid i dagar eller månader. |
| US-031 | EP-004 | Beräkna tidigaste kostnadsfria månad | Visa realistisk effekt av uppsägning. | Appen beräknar första månad utan kostnad baserat på dagens datum och uppsägningstid. |
| US-032 | EP-004 | Visa låst period | Undvika falsk besparingssignal. | Månader som inte kan frigöras än markeras låsta. |
| US-033 | EP-004 | Skapa uppsägningspåminnelse | Minska risken att missa deadline. | Relevant påminnelse skapas kopplat till utgift och kan markeras klar. |
| US-034 | EP-004 | Exportera påminnelser till kalender | Ta med åtgärder utanför appen. | Appen kan exportera `.ics` för påminnelser. |
| US-035 | EP-004 | Visa saknad uppsägningsinformation | Synliggöra svag data. | Poster utan uppsägningsdata eller instruktion kan flaggas som förbättringskandidater. |
| US-036 | EP-005 | Skapa och redigera person | Stödja hushåll och betalare. | Register låter användaren skapa, ändra och inaktivera personer. |
| US-037 | EP-005 | Ange månadsbudget per person | Möjliggöra budgetutfall. | Person kan ha disponibel månadsinkomst/budget som används i statistik. |
| US-038 | EP-005 | Skapa och redigera leverantör | Återanvänd företagsdata. | Register hanterar namn, typ, ikon, färg, kontaktinfo och notes. |
| US-039 | EP-005 | Spara uppsägningsinstruktion för leverantör | Göra faktisk uppsägning enklare. | Leverantör kan bära instruktion som visas vid relevant utgift. |
| US-040 | EP-005 | Skapa och redigera kategori | Hålla analysen begriplig. | Kategori har namn, ikon och färg och används i utgifter/köp. |
| US-041 | EP-005 | Skapa standardregister i ny plånbok | Ge bra startdata. | Ny state berikas med vanliga leverantörer och standardkategorier utan att radera användardata. |
| US-042 | EP-005 | Skapa handlare/kategoriregel | Importerade köp ska kunna föreslås rätt framåt. | Appen sparar mönster för handlare och kan återanvända kategori/leverantör. |
| US-043 | EP-006 | Skapa enskilt köp manuellt | Fånga konsumtion som inte är återkommande. | Formulär sparar datum, bokfört datum, handlare, belopp, kategori, betalare, typ, flaggor och anteckning. |
| US-044 | EP-006 | Redigera enskilt köp | Korrigera importerade eller manuella köp. | Köpmodalen kan ändra fält och spara utan att tappa import/koppling. |
| US-045 | EP-006 | Importera kontoutdrag | Snabbt få in många köp. | CSV, XLSX och PDF kan läsas och omvandlas till köptransaktioner. |
| US-046 | EP-006 | Förhandsgranska import | Undvika att fel rader skrivs in. | Appen visar antal köp, totalsumma, ignorerade rader och radlista före importcommit. |
| US-047 | EP-006 | Deduplicera importerade köp | Förhindra dubbla transaktioner. | Fingerprint på datum, bokfört datum, belopp och handlare används för att hoppa över dubbletter. |
| US-048 | EP-006 | Högerjustera belopp i import på mobil | Belopp ska inte skrivas över av handlarnamn. | Mobil importlista lägger belopp på egen/högerjusterad yta utan överlapp. |
| US-049 | EP-006 | Koppla köp till betalare | Konsumtion ska kunna summeras per person. | Importerade/manuella köp får defaultbetalare och kan ändras. |
| US-050 | EP-006 | Koppla köp till leverantör | Enskilt köp kan höra ihop med sparad leverantör. | Köp kan välja leverantör eller föreslå ny leverantör från handlare. |
| US-051 | EP-006 | Uppdatera kategori för samma handlare | Masskorrigera importfriktion. | Vid köpredigering kan användaren applicera kategori på alla köp från samma handlare utan tung boxad UI. |
| US-052 | EP-006 | Lista och filtrera köp | Hantera inköpshistorik. | Inköpsvyn visar köpradar, sök, lista, signaler och redigering. |
| US-053 | EP-007 | Markera Granska | Skapa arbetskö för okända köp. | Köp kan flaggas för granskning och visas i köpradar/filter. |
| US-054 | EP-007 | Markera Onödigt | Synliggöra konsumtion att lära av. | Köp/utgift kan signaleras som onödigt och räknas i signalstatistik. |
| US-055 | EP-007 | Markera Återkommande signal | Identifiera köp som sannolikt bör bli återkommande utgift. | Köp kan flaggas återkommande och visas med samma signalmönster som andra signaler. |
| US-056 | EP-007 | Markera Värt det | Skilja bra värde från läckor. | Värt det-signal kan sättas/släckas och summeras separat. |
| US-057 | EP-007 | Markera Business | Separera jobb/utlägg från privat konsumtion. | Business-signal kan sättas/släckas och påverka filter/statistik. |
| US-058 | EP-007 | Byta namn på Business-signal | Anpassa termen till användarens vardag. | Data-vyn låter användaren namnge business-signalen exempelvis Utlägg. |
| US-059 | EP-007 | Släcka signal visuellt när samma signal klickas igen | Undvika mobilförvirring. | Samma signal/tile togglar av och ser inte längre aktiv ut. |
| US-060 | EP-007 | Konvertera köp till återkommande utgift | Göra upptäckt mönster till prognos. | Ett köp kan skapa ny återkommande utgift med köpets datum som första betalningsdatum och köpets data förifylld. |
| US-061 | EP-007 | Koppla originalköp som första betalning | Undvika dubbelräkning och behålla historik. | När köp konverteras länkas originalköpet till den nya återkommande utgiften. |
| US-062 | EP-007 | Konvertera återkommande utgift till enskilt köp | Backa fel modellering. | En återkommande utgift kan göras om till enskilt köp och eventuella länkade köp kopplas loss. |
| US-063 | EP-007 | Välja transaktionstyp | Skilja one-off, återkommande betalning, transfer och ignorerad rad. | Köp har typfält och statistik/import filtrerar bort ignorerade rader. |
| US-064 | EP-008 | Visa återkommande analys | Förstå planerad kostnadsbas. | Statistik visar periodiserad period, månadssnitt, årstakt och signalmix. |
| US-065 | EP-008 | Visa kategori- och leverantörstoppar för återkommande | Prioritera stora återkommande poster. | Kategorier och leverantörer rankas på total periodkostnad och visar månads-/årstakt. |
| US-066 | EP-008 | Visa återkommande vs köp | Jämföra åtaganden och faktisk konsumtion. | Statistik visar periodtotal för återkommande och enskilda köp sida vid sida. |
| US-067 | EP-008 | Rankar handlare efter mest pengar | Stora engångsköp ska inte döljas av frekventa småköp. | Mest pengar sorterar strikt på totalbelopp över vald period. |
| US-068 | EP-008 | Rankar handlare efter flest transaktioner | Identifiera vanor och frekvens. | Flest transaktioner sorterar på antal, med total som tie-breaker. |
| US-069 | EP-008 | Rankar kategorier efter mest pengar och antal | Förstå konsumtionsmix både i pengar och aktivitet. | Kategorilistor sorterar separat efter totalbelopp respektive antal. |
| US-070 | EP-008 | Visa köpintelligens | Ge snabb helhetsbild för köp. | KPI:er visar total köpvolym, transaktioner, medelköp och antal handlare. |
| US-071 | EP-008 | Visa handlare efter påverkan | Hitta handlare som driver total, trend och snitt. | Handlarlista visar total, antal, aktiva månader, snitt och trend/sparkline. |
| US-072 | EP-008 | Visa köp per månad och år | Förstå periodmönster. | Periodsammanfattningar visar total, snitt och topphandlare per månad/år. |
| US-073 | EP-008 | Visa köpradar | Ge signalbaserad arbetsyta i inköpsvyn. | Köpradar visar Granska, Onödigt, Återkommande, Värt det och Business/Utlägg med antal eller belopp. |
| US-074 | EP-008 | Visa budgetutfall | Visa om disponibel budget räcker. | Statistik jämför budgetbidrag mot återkommande + köp och visar utfall per månad. |
| US-075 | EP-008 | Visa beslutsinsikter | Peka ut nästa rimliga åtgärd. | Panel visar prioriterade insikter kring leverantör, dragningsdag, köp, toppmånad eller uppsägningskandidat. |
| US-076 | EP-009 | Spara lokalt utan konto | Sänka tröskel och skydda integritet. | Appen fungerar lokalt med `localStorage` och kräver ingen inloggning. |
| US-077 | EP-009 | Exportera JSON | Göra komplett plånbok portabel. | Export innehåller kontext, register, utgifter, perioder, filer, köp och regler. |
| US-078 | EP-009 | Exportera ZIP med filer | Säkerhetskopiera både data och bilagor. | ZIP innehåller `context.json` och bifogade filer. |
| US-079 | EP-009 | Importera som ny plånbok | Undvika ID-krock och datatapp. | Import remappar ID:n och skapar ny kontext bredvid befintlig data. |
| US-080 | EP-009 | Exportera CSV | Analysera utanför appen. | CSV innehåller återkommande utgifter och köp med relevanta kolumner. |
| US-081 | EP-009 | Exportera PDF-rapport | Dela läsbar sammanfattning. | PDF genereras med plånbok, totals och rapportmetadata. |
| US-082 | EP-009 | Skapa fristående datafil | Minska risk med bara browser-cache. | Användaren kan spara en JSON-datafil via File System Access API där det stöds. |
| US-083 | EP-009 | Återansluta datafil | Fortsätta från samma lokala fil. | Appen kan öppna tidigare datafil och autospara efter ändringar när rättighet finns. |
| US-084 | EP-009 | Dela datafil/handoff | Flytta data mellan enheter eller miljöer. | Appen kan skapa delningsbar fil/HTML-handoff som kan läsas tillbaka. |
| US-085 | EP-009 | Konfigurera experimentell molnsync | Frivillig egen synk mellan enheter. | Användaren kan ange endpoint/token, pulla, pusha, se status och koppla från. |
| US-086 | EP-009 | Hantera molnkonflikt | Undvika tyst överskrivning. | Sync visar konflikt/error och stoppar automatisk write när revision inte matchar. |
| US-087 | EP-010 | Responsiv huvudnavigation | Vyer ska nås på desktop och mobil. | Nav innehåller Översikt, Inköp, Statistik, Register, Data och Hjälp där relevant. |
| US-088 | EP-010 | Visa hjälpvy | Användaren ska förstå koncepten utan extern manual. | Hjälp förklarar plånbok, återkommande utgifter, inköp, signaler, import och data. |
| US-089 | EP-010 | Visa tydliga tomlägen | Tomma listor ska guida nästa action. | Tomma paneler visar kort hjälptext och relevant primär action. |
| US-090 | EP-010 | Använda modaler för skapande/redigering | Fokusera på uppgiften utan sidbyte. | Utgift och köp öppnas i modal med stäng, avbryt och spara. |
| US-091 | EP-010 | Använda drawer för detaljer | Behålla översikten medan detaljer visas. | Utgiftsdetalj öppnas som sidopanel med åtgärder. |
| US-092 | EP-010 | Undvika överlappande text i mobil | Appen ska kännas stabil och läsbar. | Belopp, chips, kort och knappar bryter rad eller justeras så innehåll inte kolliderar. |
| US-093 | EP-010 | Ha konsekvent signaldesign | Användaren ska känna igen aktiva/inaktiva signaler. | Samma signaler använder samma ikon, färgton och aktivt/inaktivt läge över appen. |
| US-094 | EP-011 | Simulera bort återkommande utgift | Prova besparingsscenario utan att ändra data. | Användaren kan markera utgift som simulerat borttagen från första möjliga månad. |
| US-095 | EP-011 | Visa simulerad vy tydligt | Undvika att simulering misstas för verklighet. | Statistik visar banner och återställ-knapp när simulering är aktiv. |
| US-096 | EP-011 | Återställa simulering | Komma tillbaka till originaldata. | Alla simulerade borttagningar kan rensas i ett steg. |
| US-097 | EP-012 | Slå på/av inköpsmodul | Produkten ska kunna fokusera på kärnan. | Data/inställning kan aktivera eller dölja inköpsvyn där state stödjer det. |
| US-098 | EP-012 | Växla planflagga | Testa premiumrelaterade ytor. | Plånbok har `free`/`premium` som lokal flagga utan verklig betalvägg. |
| US-099 | EP-012 | Visa lokal datarisk | Användaren ska förstå backupansvar. | Data-vyn förklarar lokal lagring, browser-risk och backup/export. |
| US-100 | EP-012 | Rensa lokal data | Kunna börja om eller ta bort privat data. | Reset rensar lokal state, datafilskoppling och cloud config efter explicit handling. |

## 4. Traceability Map

### 4.1 Outcome to Epics

| Outcome | Epics |
| --- | --- |
| OUT-001 | EP-001, EP-002, EP-003, EP-004, EP-005, EP-006, EP-007, EP-008, EP-009, EP-010, EP-011, EP-012 |

### 4.2 Epics to Stories

| Epic | Stories |
| --- | --- |
| EP-001 | US-001, US-002, US-003, US-004, US-005, US-006, US-007 |
| EP-002 | US-008, US-009, US-010, US-011, US-012, US-013, US-014, US-015, US-016, US-017, US-018, US-019 |
| EP-003 | US-020, US-021, US-022, US-023, US-024, US-025, US-026, US-027, US-028, US-029 |
| EP-004 | US-030, US-031, US-032, US-033, US-034, US-035 |
| EP-005 | US-036, US-037, US-038, US-039, US-040, US-041, US-042 |
| EP-006 | US-043, US-044, US-045, US-046, US-047, US-048, US-049, US-050, US-051, US-052 |
| EP-007 | US-053, US-054, US-055, US-056, US-057, US-058, US-059, US-060, US-061, US-062, US-063 |
| EP-008 | US-064, US-065, US-066, US-067, US-068, US-069, US-070, US-071, US-072, US-073, US-074, US-075 |
| EP-009 | US-076, US-077, US-078, US-079, US-080, US-081, US-082, US-083, US-084, US-085, US-086 |
| EP-010 | US-087, US-088, US-089, US-090, US-091, US-092, US-093 |
| EP-011 | US-094, US-095, US-096 |
| EP-012 | US-097, US-098, US-099, US-100 |

## 5. User Journeys

### JNY-001 - Skapa första kontrollbilden

| Field | Content |
| --- | --- |
| Title | Skapa första kontrollbilden |
| Primary actor | Ny privat användare |
| Goal | Komma från tom app till en första begriplig vy över återkommande kostnader. |
| Trigger | Användaren öppnar appen första gången eller efter rensad data. |
| Outcome link | OUT-001 |
| Epic/story refs | EP-001, EP-002, EP-003; US-001, US-002, US-008, US-015, US-016, US-020, US-022 |

Steg:
1. Användaren skapar plånbok och lägger till minst en person.
2. Användaren väljer mall eller standardstruktur.
3. Användaren lägger in första återkommande utgift med belopp och period.
4. Appen visar tidslinje, månadstotal och utgiftsrad.
5. Användaren öppnar detalj och ser att posten kan redigeras eller kompletteras.

Expected journey behavior: Efter första minuten finns en sparad plånbok, minst en betalare, minst en kostnad och en synlig tidslinje som visar ekonomisk påverkan.

### JNY-002 - Hitta och agera på en uppsägningsmöjlighet

| Field | Content |
| --- | --- |
| Title | Hitta uppsägningsmöjlighet |
| Primary actor | Användare med flera abonnemang |
| Goal | Förstå när en kostnad kan tas bort och få minnesstöd. |
| Trigger | Användaren vill minska månadskostnad. |
| Outcome link | OUT-001 |
| Epic/story refs | EP-004, EP-008, EP-011; US-030, US-031, US-032, US-033, US-034, US-075, US-094 |

Steg:
1. Användaren öppnar statistik eller tidslinje och identifierar en påverkbar kostnad.
2. Användaren öppnar detaljen och anger eller kontrollerar uppsägningstid.
3. Appen visar låst period och tidigaste fria månad.
4. Användaren skapar/behåller påminnelse och exporterar kalenderfil vid behov.
5. Användaren kan simulera bort kostnaden och se effekt utan att spara avslut.

Expected journey behavior: Appen visar realistisk frigörelsetid, inte bara dagens belopp, och gör åtgärden minnesbar.

### JNY-003 - Importera kontoutdrag och rensa köplista

| Field | Content |
| --- | --- |
| Title | Importera och rensa köp |
| Primary actor | Användare med kontoutdrag |
| Goal | Få in faktisk konsumtion och sortera bort sådant som inte behöver granskas. |
| Trigger | Användaren har en CSV, XLSX eller PDF från kort/konto. |
| Outcome link | OUT-001 |
| Epic/story refs | EP-006, EP-007, EP-008, EP-010; US-045, US-046, US-047, US-048, US-052, US-053, US-054, US-056, US-057, US-073 |

Steg:
1. Användaren väljer importera kontoutdrag.
2. Appen tolkar filen och visar importförhandsgranskning.
3. Användaren kontrollerar antal, totalsumma och enskilda rader.
4. Användaren importerar och går till Inköp.
5. Användaren använder köpradar och signaler för att granska, markera onödigt, värt det eller business.

Expected journey behavior: Import känns kontrollerad; ingen rad skrivs in utan förhandsgranskning och mobilen visar belopp läsbart.

### JNY-004 - Göra ett köp till återkommande prognos

| Field | Content |
| --- | --- |
| Title | Skapa återkommande från köp |
| Primary actor | Användare som upptäcker abonnemang i kontoutdrag |
| Goal | Flytta ett återkommande mönster från historiskt köp till framtidsprognos. |
| Trigger | Ett köp markeras som Återkommande eller känns som abonnemang. |
| Outcome link | OUT-001 |
| Epic/story refs | EP-006, EP-007, EP-008; US-055, US-060, US-061, US-064, US-066 |

Steg:
1. Användaren öppnar köpmodalen.
2. Köpet är förifyllt med handlare, belopp, kategori, betalare och datum.
3. Användaren väljer skapa återkommande.
4. Appen skapar återkommande utgift med köpdatum som första betalningsdatum.
5. Originalköpet kopplas som första betalning och försvinner inte ur historiken.

Expected journey behavior: Användaren slipper dubbelinmatning och får både historik och prognos utan dubbelräkning.

### JNY-005 - Backa felaktig modellering

| Field | Content |
| --- | --- |
| Title | Göra återkommande till enskilt köp |
| Primary actor | Användare som felklassat en kostnad |
| Goal | Korrigera en post som inte längre ska påverka återkommande prognos. |
| Trigger | Användaren upptäcker att en återkommande utgift egentligen var ett enskilt köp. |
| Outcome link | OUT-001 |
| Epic/story refs | EP-002, EP-006, EP-007; US-012, US-043, US-062, US-063 |

Steg:
1. Användaren öppnar utgiftsdetaljen.
2. Användaren väljer konvertera till enskilt köp.
3. Appen skapar köp med motsvarande data.
4. Återkommande utgift tas bort/avslutas enligt konverteringsregel och kopplade köp lossas.

Expected journey behavior: Fel klassning kan rättas utan manuell kopiering.

### JNY-006 - Förstå vart pengarna går

| Field | Content |
| --- | --- |
| Title | Analysera påverkan |
| Primary actor | Användare som vill prioritera nästa beslut |
| Goal | Se vilka kostnader, handlare, kategorier och perioder som påverkar mest. |
| Trigger | Användaren går till Statistik efter att ha lagt in/importerat data. |
| Outcome link | OUT-001 |
| Epic/story refs | EP-008; US-064, US-065, US-066, US-067, US-068, US-069, US-070, US-071, US-072, US-074, US-075 |

Steg:
1. Användaren öppnar Statistik.
2. Appen visar återkommande analys, köpvolym, budgetutfall och beslutsinsikter.
3. Användaren granskar "Mest pengar" och "Flest transaktioner" separat.
4. Användaren identifierar en topphandlare, kategori eller dragningsdag.
5. Användaren går tillbaka till relevant detalj eller filter.

Expected journey behavior: Pengalistor rankar efter det mått de säger: totalbelopp, antal eller medel som visad sekundärinformation.

### JNY-007 - Säkerhetskopiera och flytta data

| Field | Content |
| --- | --- |
| Title | Skydda lokal data |
| Primary actor | Användare som vill undvika datatapp |
| Goal | Exportera, spara eller flytta data utan konto. |
| Trigger | Användaren går till Data-vyn eller ska byta enhet/browser. |
| Outcome link | OUT-001 |
| Epic/story refs | EP-009, EP-012; US-076, US-077, US-078, US-079, US-080, US-081, US-082, US-083, US-084, US-099, US-100 |

Steg:
1. Användaren läser lokal datarisk i Data-vyn.
2. Användaren exporterar JSON/ZIP eller skapar datafil.
3. Vid ny miljö importerar användaren filen som ny plånbok eller ersätter state via datafil.
4. Vid behov skapas PDF/CSV för rapport eller vidare analys.

Expected journey behavior: Appen är lokal-first men gör backup och flytt tydligt och möjligt.

### JNY-008 - Anpassa appen till eget arbetssätt

| Field | Content |
| --- | --- |
| Title | Anpassa signaler och moduler |
| Primary actor | Power user eller hushållsansvarig |
| Goal | Göra appens språk och funktioner mer relevanta för vardagen. |
| Trigger | Användaren vill kalla Business för Utlägg eller dölja köpmodul. |
| Outcome link | OUT-001 |
| Epic/story refs | EP-007, EP-012; US-058, US-097, US-098 |

Steg:
1. Användaren öppnar Data/inställningar.
2. Användaren byter label på business-signalen.
3. Användaren slår på/av inköpsmodul eller testar planflagga.
4. Appen visar ny term i radar, filter, köpmodal och statistik.

Expected journey behavior: Anpassning ändrar språk och synlighet konsekvent utan att ändra historisk data.

## 6. UX Specification

### 6.1 UX Direction

| UX ID | Attribute | Spec | Linked refs |
| --- | --- | --- | --- |
| UX-001 | UX profile | Private finance control plane: tät, lugn, handlingsorienterad och jämförbar. | OUT-001, EP-008, EP-010 |
| UX-002 | Target surface | Responsive web app for desktop and mobile browser. | EP-003, EP-010 |
| UX-003 | Color direction | Grounded financial palette with blue as primary, teal/green for positive/value, amber for recurring/attention, red for risk/unnecessary and neutral gray for structure. | US-053-US-059, US-093 |
| UX-004 | Style authority | Appens befintliga AAS-liknande produktstil ska styra: paneler, tabeller, modaler, tydliga inputs och små ikonknappar. | EP-010 |
| UX-005 | Tone | Svensk, konkret, vardagsnära och trygg. Undvik bankjargong och överlöften. | OUT-001, CON-010 |

### 6.2 Information Architecture

| UX ID | Surface | Purpose | Primary content | Key actions | Story refs |
| --- | --- | --- | --- | --- | --- |
| UX-010 | Översikt | Snabb ekonomisk kontrollbild. | Sammanfattningar, tidslinje, mobilkort, köp-/signalsummering. | Ny utgift, nytt köp, import, filter, öppna detalj. | US-020-US-029 |
| UX-011 | Inköp | Hantera enskilda köp och import. | Sök, köpradar, importpreview, köplista. | Importera, redigera, flagga, konvertera. | US-043-US-063, US-073 |
| UX-012 | Statistik | Förstå påverkan och beslut. | Budgetutfall, återkommande analys, var pengarna går, köpradarstatistik, köpintelligens. | Filtrera, simulera, läsa rankningar. | US-064-US-075, US-094-US-096 |
| UX-013 | Register | Underhålla återanvändbar data. | Personer, leverantörer, kategorier. | Skapa, redigera, inaktivera/ta bort. | US-036-US-042 |
| UX-014 | Data | Backup, import/export och teknisk kontroll. | Lokal data, exportknappar, datafil, cloud sync, plan/signalinställningar. | Exportera, importera, spara datafil, sync, reset. | US-076-US-086, US-097-US-100 |
| UX-015 | Hjälp | Förklara produktmodell och trygg användning. | Begrepp, arbetsflöden, lokal lagring. | Läsa och gå tillbaka till relevant vy. | US-088, US-099 |

### 6.3 Core Components

| UX ID | Component | Behavior | Story refs |
| --- | --- | --- | --- |
| UX-020 | Context switcher | Visar aktiv plånbok, kan byta eller skapa/duplicera plånbok. | US-003, US-005 |
| UX-021 | Quick action menu | Exponerar återkommande utgift, enskilt köp och import som snabbvägar. | US-029 |
| UX-022 | Timeline grid | Desktop-rutnät med månader, rader, belopp, låsta perioder och klickbara celler. | US-020, US-022, US-028, US-032 |
| UX-023 | Mobile timeline cards | Ersätter bred tabell med kort och expanderbara månadsposter. | US-021, US-092 |
| UX-024 | Expense modal | Skapa/redigera återkommande utgift med grupperade fält och tydliga primära knappar. | US-008-US-019 |
| UX-025 | Expense drawer | Detaljvy för utgift med actionknappar, metadata, bilagor och uppsägningsinfo. | US-028, US-030-US-035 |
| UX-026 | Purchase modal | Skapa/redigera köp med flaggor, avancerade fält och konvertering. | US-043, US-044, US-051, US-060 |
| UX-027 | Signal chips/cards | Ikon + label + aktivt tillstånd. Samma signal ska se likadan ut över appen. | US-053-US-059, US-093 |
| UX-028 | Import preview list | Visar filnamn, totals, ignorerade rader och radkort/tabell före commit. | US-045-US-048 |
| UX-029 | Ranking rows | Visar label, sekundär information, belopp/antal och progressbar. | US-067-US-072 |
| UX-030 | Simulation banner | Visas endast när simulering är aktiv och ger återställning. | US-095, US-096 |
| UX-031 | Data panels | För backup/sync/export med status, fel och tydliga konsekvenser. | US-076-US-086, US-099 |

### 6.4 Interaction Rules

| UX ID | Rule | Rationale | Story refs |
| --- | --- | --- | --- |
| UX-040 | Primär action ska alltid vara synlig nära arbetsytan. | Registrering är appens viktigaste loop. | US-029, US-087 |
| UX-041 | Modal används för skapande/redigering; drawer används för läsning/åtgärd från översikt. | Minskar navigationstapp. | US-090, US-091 |
| UX-042 | Signal toggles måste visuellt spegla state direkt. | Användaren ska inte behöva byta signal för att se att något släckts. | US-059, US-093 |
| UX-043 | Import måste ha förhandsgranskning före commit. | Filimport har hög felrisk. | US-046 |
| UX-044 | Rankningsrubrik ska matcha sorteringsmått. | "Mest pengar" får inte sorteras på antal eller snitt. | US-067-US-069 |
| UX-045 | Konvertering ska återanvända befintlig data och visa möjlighet att ändra. | Förifylld data sparar tid men får inte låsa användaren. | US-060-US-062 |
| UX-046 | Simulerad data ska alltid markeras. | Skyddar mot feltolkning. | US-095 |
| UX-047 | Destruktiva actions ska vara sekundära och tydliga. | Privat ekonomidata är känslig. | US-006, US-014, US-100 |

### 6.5 Responsive Requirements

| UX ID | Requirement | Expected behavior | Story refs |
| --- | --- | --- | --- |
| UX-050 | Mobile first readability | Knappar, chips, belopp och namn får inte överlappa. | US-048, US-092 |
| UX-051 | Dense desktop efficiency | Desktop får använda tabeller/rutnät för scanning och jämförelse. | US-020, US-022 |
| UX-052 | Touch targets | Mobilens signaler och actions ska vara tryckbara utan precision. | US-052, US-059, US-087 |
| UX-053 | Stable dimensions | Knappar och kort ska inte hoppa när state ändras. | US-059, US-092 |
| UX-054 | Horizontal overflow avoidance | Breda dataområden ska brytas ned i kort eller scrollas kontrollerat. | US-021, US-048 |

### 6.6 Accessibility and Content

| UX ID | Requirement | Expected behavior | Story refs |
| --- | --- | --- | --- |
| UX-060 | Semantic buttons | Interaktiva kort ska vara knappar med tydliga accessible names. | US-052, US-073 |
| UX-061 | Labels on inputs | Formfält ska ha synliga eller semantiska labels. | US-008, US-043 |
| UX-062 | Icon plus text for uncommon actions | Finansiella/signalbaserade actions ska inte bara vara ikon. | US-053-US-058 |
| UX-063 | Error and empty copy | Tomma/fel-lägen ska säga vad som hände och vad användaren kan göra. | US-046, US-089, US-099 |
| UX-064 | Swedish locale | Datum, pengar och copy ska vara svensk-anpassade. | OUT-001 |

## 7. Functional Calculation Rules

| Rule ID | Rule | Applies to | Story refs |
| --- | --- | --- | --- |
| CALC-001 | Periodiserad månadskostnad för månad/kvartal/år/engång ska beräknas deterministiskt per synlig månad. | Återkommande analys, tidslinje. | US-008-US-010, US-064 |
| CALC-002 | Kassaflöde ska ta hänsyn till dragningsdag och faktisk debiteringsmånad. | Budgetutfall, dragningsdagar. | US-022, US-074 |
| CALC-003 | Uppsägningstid ska ge tidigaste fria månad från dagens datum. | Uppsägning, simulering. | US-030-US-032, US-094 |
| CALC-004 | Ignorerade transaktioner och belopp <= 0 ska inte räknas i köpstatistik. | Inköp/statistik. | US-063, US-067-US-073 |
| CALC-005 | "Mest pengar" ska sortera på totalbelopp; "Flest transaktioner" på antal. | Var pengarna går. | US-067-US-069 |
| CALC-006 | Medelköp är sekundär information och ska inte styra ranking om rubriken säger total eller antal. | Köpstatistik. | US-067-US-070 |
| CALC-007 | Budgetutfall = budgetbidrag - återkommande kassaflöde - köp. | Statistik. | US-074 |
| CALC-008 | Simulerade borttagningar påverkar vyberäkningar men inte originaldata. | Simulering. | US-094-US-096 |

## 8. Data, Storage and Technical Constraints

| Constraint ID | Constraint | Detail | Linked refs |
| --- | --- | --- | --- |
| CON-001 | Local-first | Appen ska fungera utan server, konto eller bankkoppling. Primär lagring är browser `localStorage` med nyckel `cost-control.state.v1`. | US-076, US-099 |
| CON-002 | Data model | State består av Context, Person, Supplier, Category, Expense, ExpenseCostPeriod, Attachment, Reminder, PurchaseTransaction och MerchantRule. | EP-001-EP-009 |
| CON-003 | Context isolation | Alla entiteter som hör till plånbok ska bära `contextId` eller relation via expense/period och filtreras därefter. | US-003, US-006 |
| CON-004 | Attachments | Tillåtna filer: PNG, JPG/JPEG, WebP och PDF upp till 10 MB. Filer lagras som data URL i state/export. | US-019, US-078 |
| CON-005 | Bank statement import | Kontoutdragsimport är filbaserad CSV/XLSX/PDF, inte bankkoppling. Import ska ignorera rubriker, summeringar och irrelevanta rader. | US-045-US-047 |
| CON-006 | Export/import | JSON/ZIP ska vara fullständig kontextexport; import som ny plånbok ska remappa ID:n för att undvika krock. | US-077-US-079 |
| CON-007 | Data file | File System Access API kan användas där browsern stödjer det. IndexedDB används för att komma ihåg file handle. | US-082, US-083 |
| CON-008 | Cloud sync | Molnsync är experimentell och kräver egen endpoint/token. Revision conflict ska stoppa tyst överskrivning. | US-085, US-086 |
| CON-009 | Privacy | Ingen känslig ekonomidata ska skickas externt om inte användaren aktivt konfigurerar export/sync/delning. | OUT-001, US-076 |
| CON-010 | Security honesty | Appen får inte antyda kryptering eller bankklassad säkerhet om det inte är implementerat. | US-099 |
| CON-011 | Technology | React + TypeScript + Vite, lokal domänlogik i `src/domain`, actions i `src/app`, storage i `src/storage`, UI i `src/ui`. | All |
| CON-012 | Testing | Beräkningar, actions, import/export, lokal store och centrala UI-flöden ska ha automatiserade tester. | CALC-001-CALC-008 |
| CON-013 | No destructive default | Import, reset, borttag och sync ska inte tyst förstöra data utan tydlig användarhandling. | US-006, US-079, US-086, US-100 |
| CON-014 | Swedish first | UI och dokumentation är svenska i första versionen. | UX-064 |
| CON-015 | Premium as flag | `free`/`premium` är lokal planflagga, inte faktisk betalvägg eller abonnemangshantering. | US-098 |

## 9. Regeneration Acceptance Checklist

En omgenererad app bör minst visa följande för att anses matcha detta paket:

| Check ID | Acceptance check | Required refs |
| --- | --- | --- |
| ACC-001 | Ny användare kan skapa plånbok och minst en person innan första riktiga användning. | OUT-001, US-001, US-002 |
| ACC-002 | Återkommande utgift kan skapas, visas i tidslinje, redigeras och avslutas. | EP-002, EP-003 |
| ACC-003 | Uppsägningstid påverkar låsning och tidigaste fria månad. | EP-004, CALC-003 |
| ACC-004 | Enskilda köp kan skapas/importeras och hanteras i Inköp. | EP-006 |
| ACC-005 | Köp kan flaggas och signalfilter/tile toggles visar rätt aktivt/inaktivt läge. | EP-007, UX-042 |
| ACC-006 | Köp kan konverteras till återkommande och återkommande kan backas till enskilt köp. | US-060-US-062 |
| ACC-007 | Statistikens "Mest pengar" rankar på totalbelopp och "Flest transaktioner" på antal. | US-067-US-069, CALC-005 |
| ACC-008 | Mobil importpreview och listor visar belopp utan textkollision. | US-048, UX-050 |
| ACC-009 | JSON/ZIP/CSV/PDF/export och import som ny plånbok finns. | EP-009 |
| ACC-010 | Data-vyn förklarar lokal-first risk och ger backup/sync-kontroller. | US-099, CON-001 |
| ACC-011 | Simulering är tydligt markerad och kan återställas. | EP-011 |
| ACC-012 | UX känns som en produktiv ekonomiyta, inte en marketing-sida. | UX-001-UX-005 |

## 10. Known Scope Notes and Gaps

| Gap ID | Note | Impact | Suggested decision |
| --- | --- | --- | --- |
| GAP-001 | Leverantörslogga finns i datamodellen men normalflödet lutar mer på ikon/färg. | Kan avvika från krav om riktig logga önskas. | Antingen bygg leverantörslogga-uppladdning eller dokumentera ikon/färg som avsiktlig förenkling. |
| GAP-002 | Uppsägninginstruktion finns i modell men bör exponeras tydligare i registerflödet. | Praktisk uppsägning blir svagare. | Lägg till tydlig redigering och visning. |
| GAP-003 | Kryptering är inte implementerad. | Lokal-first data är privat men inte krypterad av appen. | Behåll ärlig copy eller genomför separat krypteringsdesign. |
| GAP-004 | Premium är bara lokal flagga. | Ska inte användas som faktisk kommersiell begränsning. | Besluta om premium ska vara demo, scope senare eller tas bort. |
| GAP-005 | Molnsync är experimentell egen endpoint. | Kräver mer säkerhets- och konfliktanalys om den ska bli officiell. | Markera beta eller flytta till future epic. |

## 11. Downstream Generation Prompt Contract

När detta paket används för att generera om appen:

1. Behandla `OUT-001` som enda överordnat värde.
2. Implementera epics i ordning EP-001 -> EP-012 om inget annat anges.
3. Bevara ID:n i tickets, tester och traceability.
4. Varje story ska kunna spåras till minst ett UI-beteende eller en beräkningsregel.
5. Prioritera lokal-first, svensk UX, responsiv läsbarhet och ärlig säkerhetscopy.
6. Bygg faktisk arbetsyta som första skärm, inte landing page.
7. Lägg tester på beräkningar, import/export, signal-toggle, konvertering och statistikrankning.
8. Dokumentera explicit om en story ersätts av ett enklare eller annorlunda produktbeslut.
