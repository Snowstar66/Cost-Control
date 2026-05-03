# Discovery Loop Accelerated AI Handoff

This package is prepared for a downstream AI or agent group to run a faster governed discovery loop without stopping for approval at every ordinary refinement step.

## Handling rules
- Run a discovery loop from the Framing source of truth: inspect Outcome, Epics, Story Ideas, Journey Context, constraints, AI level and approval context before producing downstream artifacts.
- Do not ask for confirmation at every refinement step. Make reasonable documented assumptions, batch open questions, and continue until a meaningful refinement package exists.
- Use available specialist agents or BMAD-style roles when helpful, for example analyst, product, UX, architect, dev and QA perspectives, but keep one consolidated source-of-truth output.
- Escalate to the human only for governance-sensitive decisions, missing critical facts, material scope changes, high-risk data/security/privacy issues, or approval/sign-off boundaries.
- Return discovery outputs as traceable proposals linked back to Outcome -> Epic -> Story Idea -> Journey where applicable, plus assumptions, risks, suggested next experiments and validation checks.

## Structured Framing Payload
# Framing Brief

This package is intended as input to the next controlled AI-assisted step, for example BMAD-based design or structured refinement.

## Customer Handshake
Outcome key: OUT-001
Outcome title: Cost Control
Timeframe: 3 months back, 9 months forward Target Effects Ökad kontroll över återkommande privata kostnader. Minskad risk att missa uppsägning eller kostnadsbortfall. Säker och portabel lokal hantering av privat ekonomidata. Låg tröskel för registrering och fortsatt användning.
Value owner: Frasse Friday

### Problem Statement
Package Type: AAS Framing Import Package
Product: Utgiftskoll
Version: 0.2-import
Language: sv-SE
Phase: Framing
Target Next Phase: Design
Domain: Application Development
AI Acceleration Level: 1
Risk Profile: medium
Human Mandate: Människa ansvarar för prioritering, riskacceptans, AI-nivå, releasebeslut och beslut om hantering av verkliga användardata.

Problem Statement ID: PS-001
Problem Statement: Privatpersoner, familjer och mindre grupper saknar ofta en lågtröskelöversikt över återkommande kostnader, abonnemang, bindningstider, uppsägningstider och framtida ekonomiska åtaganden. Kalkylblad blir lätt manuella och sköra, medan breda budgetappar med bankkoppling kan skapa hög tröskel och integritetsoro. Det behövs en enkel lokal-first app som fokuserar på återkommande och tidsbundna kostnader, tidslinje, uppsägningslogik och kontextseparerad datalagring.
Baseline: Ingen befintlig app eller strukturerad datahantering finns. Baseline ska etableras genom första användartest, manuell jämförelse mot testfall och import/export-testsvit.
Impact Areas
- Överblick över kommande 9-12 månaders kostnader.
- Minskad risk att missa uppsägningsmöjligheter.
- Portabel lokal hantering av privat ekonomidata.
- Lägre tröskel för manuell registrering av återkommande kostnader.
Baseline Sources
- Första användartest | Tidtagning och enkät | Mäter tid till första fem registrerade kostnader och upplevd kontroll före/efter.
- Beräknings- och importtestsvit | Automatiserade tester | Verifierar månadsberäkning, uppsägningstid, kontextisolering och export/import.

### Outcome Statement
Användaren ska kunna förstå, registrera, följa och flytta sina privata återkommande och tidsbundna kostnader i en vald lokal kontext, med tydlig överblick över nuläge, historik, kommande månader, uppsägningsmöjligheter och dataseparering.

3 months back, 9 months forward Target Effects Ökad kontroll över återkommande privata kostnader. Minskad risk att missa uppsägning eller kostnadsbortfall. Säker och portabel lokal hantering av privat ekonomidata. Låg tröskel för registrering och fortsatt användning.

### Solution Context & Constraints
Solution context: Not captured yet
Constraints: ## General constraints
Imported constraints
- Configuration and planning constraints: Planning Unit: MVP Calculation Granularity: monthly Reporting Granularity: context and month Forecast Horizon: 3 months back, 9 months forward Flag Levels - necessary | Nödvändig - comfortable | Bekväm - luxury | Lyxi...
- Data model constraints: Data Model Candidates - Context: id, name, currency, monthsBack, monthsForward, createdAt, updatedAt - Person: id, contextId, firstName, lastName, monthlyAvailableIncome, active - Supplier: id, contextId, name, logoFi...
Imported design notes
- Journey context design input: Journey Contexts - J-001 | Första användning | Ny användare | Onboarding, första kontext, första utgift och första tidslinje. - J-002 | Lägga till kostnad | Återkommande användare | Snabbregistrering, leverantörsförsl...

## UX principles
UX direction
UX profile: Enterprise control plane (enterprise-control-plane)
Target surface: Responsive web app (responsive-web)
Color schema: Forest green (forest-green)
Style authority: AAS suggested style (aas-suggested-style)

Style priority:
The selected AAS UX direction is the primary source unless explicit customer UX rules are added in the additional instructions.
If customer UX rules are supplied, downstream AI must explicitly resolve conflicts using this style authority before applying AAS profile, color, or signature component guidance.

Core UX guidance:
Prioritize dashboard density, strong hierarchy, audit-ready status, table/list scanning, durable navigation, and clear ownership of decisions.

Downstream AI visual grammar:
The selected UX profile must materially change layout, components, density, navigation, and status treatment. Do not collapse this into a generic SaaS card UI.
- Use dense control-plane layouts with compact rectangular cards, tables, right rails, and persistent navigation.
- Prefer squared or small-radius controls, clear borders, muted surfaces, and high information density.
- Place owner, status, evidence, version, and governance action together so the decision context is never hidden.

Signature components to prefer when relevant:
Use these as primary building blocks before generic button/select/input examples. Generic controls should support the signature component, not define the experience.
- Approval matrix for comparing owners, evidence, risk, and approval state.
- Audit trail rail beside forms and review screens.
- Readiness scorecard for tollgate, release, or portfolio decisions.

Surface guidance:
Design from responsive web constraints with clear desktop density and a readable mobile layout for core review and input tasks.

Color guidance:
Use grounded greens with neutral surfaces, visible success states, and a trustworthy operations-oriented tone.

## Non-functional requirements
Imported non-functional requirements
- AI governance and risk constraints: Human Mandate: Människa ansvarar för prioritering, riskacceptans, AI-nivå, releasebeslut och beslut om hantering av verkliga användardata. Governance Requirements - AI Acceleration Level sätts initialt till Level 1 - ...

## Additional requirements
Imported additional requirements
- Additional requirements - MVP scope: MVP In Scope - Skapa och växla mellan separata kontexter. - Personregister med namn och frivillig tillgänglig inkomst. - Leverantörsregister med namn, logga och basinformation. - Kategoriregister. - Registrering av ut...
Data sensitivity: Not captured yet
Delivery type: AD
Application Development: frame a new application, service or meaningful functional expansion. Keep focus on outcome, scope and why the capability should exist.

## Baseline
Readiness: Ready
Definition: Baseline saknas idag och etableras i första användartest samt genom regressionsskydd för beräkning, uppsägning, lokal lagring och import/export.
Source: Första användartest | Tidtagning och enkät | Beräknings- och importtestsvit | Automatiserade tester
Measurement Method: Minst 80 % av testanvändarna ska inom 10 minuter kunna registrera minst fem återkommande kostnader och förstå total månadskostnad kommande 9 månader. | Minst 90 % av kostnader med uppsägningstid ska visa korrekt låst period och tidigaste möjliga kostnadsfria månad. | 100 % av testade exporter ska kunna importeras till ny kontext utan datatapp i grunddata, utgifter och metadata. | En enkel utgift ska kunna registreras på maximalt 30 sekunder av en van användare och 90 sekunder av en ny användare.

## AI and Risk
Execution pattern: orchestrated
AI level: LEVEL 3
Level 3 means orchestrated agentic delivery: AI executes multiple chained steps through workflows or agents with stronger governance.
Expected AI use across lifecycle: Hög accelleration 
Risk profile: low
Business impact: low: N/A
Data sensitivity: low: N/A
Blast radius: low: N/A
Decision impact: low: N/A
Level 3 justification: Vi testar högsta accellerlationen i Disovery Loop

## Framing Warnings
- No warnings were visible at export time.

## Epics and Story Ideas
### EPC-001 - Kontext och dataseparering
Scope boundary: Scope in: Skapa kontext, byta aktiv kontext, visa endast data från aktiv kontext, exportera/importera per kontext och hantera kontextspecifika inställningar.
Scope out: Not set
- Story Idea SC-001: Skapa ny kontext
  Value intent: Användaren ska kunna separera olika ekonomiska sammanhang, exempelvis privat, familj, resa eller delat boende.
  Expected behavior: Systemet ska skapa en kontext med namn och valuta och göra den valbar som aktiv kontext utan att blanda data med andra kontexter.
  UX sketches: None attached
- Story Idea SC-002: Växla aktiv kontext
  Value intent: Användaren ska kunna arbeta i rätt ekonomiskt sammanhang och bara se data som hör till det sammanhanget.
  Expected behavior: Systemet ska byta aktiv kontext och filtrera utgifter, personer, leverantörer, kategorier och inställningar till vald kontext.
  UX sketches: None attached
- Story Idea SC-003: Konfigurera tidslinjefönster per kontext
  Value intent: Användaren ska kunna anpassa hur mycket historik och framtid som visas beroende på kontextens behov.
  Expected behavior: Systemet ska spara antal månader bakåt och framåt per kontext och använda inställningen när tidslinjen renderas.
  UX sketches: None attached
- Story Idea SC-004: Duplicera kontext som mall
  Value intent: Användaren ska kunna återanvända grundstruktur utan att kopiera historiska utgifter eller blanda verkliga kostnadsdata.
  Expected behavior: Systemet ska duplicera mallgrunddata enligt definierad regel och skapa en ny isolerad kontext utan historiska utgifter.
  UX sketches: None attached

### EPC-002 - Snabbregistrering av utgift
Scope boundary: Scope in: Ny utgift, leverantör, belopp, periodicitet, kategori, betalare, ny leverantör direkt i flödet samt direkt visning i tidslinjen.
Scope out: Not set
- Story Idea SC-005: Skapa månadsutgift
  Value intent: Användaren ska snabbt kunna registrera en vanlig återkommande månadskostnad.
  Expected behavior: Systemet ska spara leverantör, belopp, periodicitet och kategori och visa utgiften i rätt månader i tidslinjen.
  UX sketches: None attached
- Story Idea SC-006: Skapa leverantör i utgiftsflödet
  Value intent: Användaren ska slippa lämna snabbregistreringen när en leverantör saknas.
  Expected behavior: Systemet ska kunna skapa en ny leverantör från utgiftsformuläret och återanvända leverantören på senare utgifter.
  UX sketches: None attached
- Story Idea SC-007: Välj betalande person
  Value intent: Användaren ska kunna förstå vem som bär kostnaden i en kontext med flera personer.
  Expected behavior: Systemet ska koppla utgiften till vald betalare och använda kopplingen i personsummor och filtrering.
  UX sketches: None attached
- Story Idea SC-008: Flagga nödvändighetsnivå
  Value intent: Användaren ska kunna skilja nödvändiga kostnader från bekväma, lyxiga eller onödiga kostnader inför analys.
  Expected behavior: Systemet ska spara nödvändighetsflagga på utgiften och göra den användbar i filter och summeringar.
  UX sketches: None attached

### EPC-003 - Tidslinje och månadsöversikt
Scope boundary: Scope in: Utgifter som rader, månader som kolumner, standardvy 3 månader bakåt och 9 månader framåt, detaljexpansion och månadssummering.
Scope out: Not set
- No Story Ideas are linked to this Epic yet.

### EPC-004 - Uppsägningstid och låst period
Scope boundary: Scope in: Uppsägningstid i dagar eller månader, beräkning av tidigaste avslutsdatum, låst period i tidslinje och uppsägningsinformation i detaljpanel.
Scope out: Not set
- No Story Ideas are linked to this Epic yet.

### EPC-005 - Grunddataregister
Scope boundary: Scope in: Personer, leverantörer, leverantörslogga, uppsägningsinstruktioner, kategorier och standardkategorier.
Scope out: Not set
- No Story Ideas are linked to this Epic yet.

### EPC-006 - Export och import
Scope boundary: Scope in: Export av hel kontext, import som ny kontext, val om filer ska ingå, CSV-export och importvalidering.
Scope out: Not set
- No Story Ideas are linked to this Epic yet.

### EPC-007 - Lokal lagring och filhantering
Scope boundary: Scope in: Lokal persistens, bilagor, filmetadata, varning om datarensning, radering av filer och senare krypterad kontext som exploration.
Scope out: Not set
- No Story Ideas are linked to this Epic yet.

### EPC-008 - Summeringar och insikter
Scope boundary: Scope in: Månadssumma, kategorisumma, personsummor, disponibel inkomst efter kostnader och potentiell besparing från flaggor.
Scope out: Not set
- No Story Ideas are linked to this Epic yet.

### EPC-009 - Responsiv UX och onboarding
Scope boundary: Scope in: Responsiv layout, första-kontext-flöde, snabbregistrering, tomma lägen, tillgänglighet och läsbarhet.
Scope out: Not set
- No Story Ideas are linked to this Epic yet.

### EPC-010 - Premium- och tillväxtfunktioner
Scope boundary: Scope in: Simuleringar, PDF-rapporter, mallar, obegränsade kontexter och lokala besparingsförslag.
Scope out: Not set
- No Story Ideas are linked to this Epic yet.

### EPC-011 - Fallback Epic
Scope boundary: Describe what this Epic includes, excludes, or leaves for later.
- Story Idea SC-009: Spara ofullständig utgift
  Value intent: Användaren ska kunna fånga en kostnad snabbt även när alla detaljer inte är kända.
  Expected behavior: Systemet ska tillåta minimal utgiftsdata, markera posten som behöver kompletteras och göra den lätt att hitta senare.
  UX sketches: None attached
- Story Idea SC-010: Visa utgifter som rader och månader som kolumner
  Value intent: Användaren ska snabbt kunna se vilka kostnader som påverkar varje månad.
  Expected behavior: Systemet ska rendera en tidslinje där varje utgift är en rad och varje månad är en kolumn enligt kontextens tidsfönster.
  UX sketches: None attached
- Story Idea SC-011: Visa kostnadsstapel över giltig period
  Value intent: Användaren ska förstå när en kostnad gäller över tid.
  Expected behavior: Systemet ska visa kostnadsstapel endast för månader mellan start- och slutdatum eller enligt återkommande period.
  UX sketches: None attached
- Story Idea SC-012: Öppna detaljer från tidslinjerad
  Value intent: Användaren ska kunna granska underliggande data utan att tappa överblicken.
  Expected behavior: Systemet ska öppna en detaljpanel från vald rad eller cell med leverantör, belopp, kategori, betalare och period.
  UX sketches: None attached
- Story Idea SC-013: Göm historiska månader
  Value intent: Användaren ska kunna fokusera på kommande kostnader när historiken stör överblicken.
  Expected behavior: Systemet ska kunna dölja månader före aktuell månad och återställa vyn utan att ändra data.
  UX sketches: None attached
- Story Idea SC-014: Visa total kostnad per månad
  Value intent: Användaren ska förstå total månadspåverkan för vald period.
  Expected behavior: Systemet ska summera alla aktiva synliga utgifter per månad och visa totalen i tidslinjen.
  UX sketches: None attached
- Story Idea SC-015: Ange uppsägningstid
  Value intent: Användaren ska kunna registrera bindning eller uppsägning så att kostnaden kan analyseras korrekt.
  Expected behavior: Systemet ska spara uppsägningstid som värde och enhet och använda regeln i beräkningar.
  UX sketches: None attached
- Story Idea SC-016: Visa låst period
  Value intent: Användaren ska visuellt förstå när en kostnad inte kan falla bort ännu.
  Expected behavior: Systemet ska markera låst period i tidslinjen med särskild visuell behandling som inte enbart bygger på färg.
  UX sketches: None attached

### EPC-012 - Fallback Epic
Scope boundary: Describe what this Epic includes, excludes, or leaves for later.
- Story Idea SC-017: Beräkna tidigaste kostnadsfria månad
  Value intent: Användaren ska kunna se när en uppsagd kostnad tidigast slutar påverka månadsbudgeten.
  Expected behavior: Systemet ska beräkna tidigaste möjliga kostnadsfria månad deterministiskt utifrån uppsägningsregel och datum.
  UX sketches: None attached
- Story Idea SC-018: Varna när uppsägningsinformation saknas
  Value intent: Användaren ska uppmärksammas på abonnemang där beslutsunderlag saknas.
  Expected behavior: Systemet ska markera abonnemangsliknande utgifter utan uppsägningsinformation som behöver kompletteras.
  UX sketches: None attached
- Story Idea SC-019: Skapa påminnelse inför uppsägningsdeadline
  Value intent: Användaren ska kunna agera i tid innan en kostnad fortsätter längre än nödvändigt.
  Expected behavior: Systemet ska skapa en påminnelsedatumspunkt kopplad till utgiftens uppsägningsdeadline och visa den i relevant vy.
  UX sketches: None attached
- Story Idea SC-020: Skapa person
  Value intent: Användaren ska kunna representera betalare och eventuellt disponibel inkomst i kontexten.
  Expected behavior: Systemet ska spara person med förnamn, efternamn och frivillig inkomst och göra personen valbar som betalare.
  UX sketches: None attached
- Story Idea SC-021: Skapa och återanvänd leverantör
  Value intent: Användaren ska slippa skriva samma leverantörsdata flera gånger.
  Expected behavior: Systemet ska spara leverantörer per kontext och låta flera utgifter kopplas till samma leverantör.
  UX sketches: None attached
- Story Idea SC-022: Ladda upp leverantörslogga
  Value intent: Användaren ska kunna känna igen leverantörer snabbare i listor och detaljer.
  Expected behavior: Systemet ska acceptera godkända bildformat, lagra filmetadata och visa loggan vid leverantören.
  UX sketches: None attached
- Story Idea SC-023: Spara uppsägningsinstruktion för leverantör
  Value intent: Användaren ska ha praktisk information tillgänglig när en kostnad ska sägas upp.
  Expected behavior: Systemet ska spara uppsägningsinstruktion på leverantören och visa den i relevanta utgiftsdetaljer.
  UX sketches: None attached
- Story Idea SC-024: Skapa och ändra kategorier
  Value intent: Användaren ska kunna strukturera kostnader på ett sätt som passar kontexten.
  Expected behavior: Systemet ska låta användaren skapa och ändra kategorier och koppla dem till utgifter och filter.
  UX sketches: None attached

### EPC-013 - Fallback Epic
Scope boundary: Describe what this Epic includes, excludes, or leaves for later.
- Story Idea SC-025: Skapa standardkategorier i ny kontext
  Value intent: Användaren ska komma igång snabbare utan att behöva skapa all grundstruktur manuellt.
  Expected behavior: Systemet ska erbjuda eller skapa en uppsättning fördefinierade kategorier när en ny kontext skapas.
  UX sketches: None attached
- Story Idea SC-026: Exportera hel kontext
  Value intent: Användaren ska kunna säkerhetskopiera eller flytta en komplett ekonomisk kontext.
  Expected behavior: Systemet ska skapa en exportfil med personer, leverantörer, kategorier, utgifter och relevant metadata för vald kontext.
  UX sketches: None attached
- Story Idea SC-027: Importera export som ny kontext
  Value intent: Användaren ska kunna återställa eller dela data utan att riskera befintliga kontexter.
  Expected behavior: Systemet ska importera en giltig export till en ny kontext och aldrig skriva över befintlig data som standard.
  UX sketches: None attached
- Story Idea SC-028: Välj om filer ska ingå i export
  Value intent: Användaren ska kunna balansera komplett backup mot filstorlek och delningsrisk.
  Expected behavior: Systemet ska låta användaren exportera med eller utan bifogade filer och tydligt ange konsekvensen.
  UX sketches: None attached
- Story Idea SC-029: Exportera kostnader till CSV
  Value intent: Användaren ska kunna analysera kostnadsdata utanför appen.
  Expected behavior: Systemet ska skapa CSV med definierade kolumner, korrekta belopp och tillräcklig kontext för extern analys.
  UX sketches: None attached
- Story Idea SC-030: Visa valideringsfel före import
  Value intent: Användaren ska förstå varför en import inte kan sparas och undvika datakorruption.
  Expected behavior: Systemet ska validera format, version och obligatoriska fält innan import sparas och visa begripligt fel vid problem.
  UX sketches: None attached
- Story Idea SC-031: Spara data lokalt utan konto
  Value intent: Användaren ska kunna använda grundfunktionerna utan konto och utan serverberoende.
  Expected behavior: Systemet ska lagra strukturerad data lokalt och återläsa den efter omstart eller omladdning.
  UX sketches: None attached
- Story Idea SC-032: Bifoga fil till utgift
  Value intent: Användaren ska kunna koppla relevanta underlag till en kostnad.
  Expected behavior: Systemet ska låta användaren bifoga tillåtna filtyper till en utgift och lista dem i detaljvyn.
  UX sketches: None attached

### EPC-014 - Fallback Epic
Scope boundary: Describe what this Epic includes, excludes, or leaves for later.
- Story Idea SC-033: Visa filmetadata
  Value intent: Användaren ska kunna förstå vad som är bifogat utan att öppna varje fil.
  Expected behavior: Systemet ska visa filnamn, filtyp och storlek efter uppladdning och vid senare visning.
  UX sketches: None attached
- Story Idea SC-034: Varna om lokal datarisk
  Value intent: Användaren ska förstå att lokal webbläsardata kan förloras och att backup/export är användarens ansvar.
  Expected behavior: Systemet ska visa tydlig information om lokal lagring och datarensningsrisk i onboarding eller admin.
  UX sketches: None attached
- Story Idea SC-035: Radera bifogad fil
  Value intent: Användaren ska kunna ta bort privata filer som inte längre ska sparas i kontexten.
  Expected behavior: Systemet ska radera filkoppling och binärt innehåll enligt definierad regel och reflektera ändringen i export.
  UX sketches: None attached
- Story Idea SC-036: Utforska krypterad kontext
  Value intent: Användaren ska på sikt kunna skydda lokal data starkare, men bara om nyckelhantering och återställningsrisk är förstådda.
  Expected behavior: Systemet ska inte införa kryptering i MVP utan en separat exploration som dokumenterar säkerhets- och nyckelhanteringsrisker.
  UX sketches: None attached
- Story Idea SC-037: Visa total kostnad per månad
  Value intent: Användaren ska förstå total kostnad i vald period.
  Expected behavior: Systemet ska summera aktiva utgifter för varje månad i vald period och visa totalsumman.
  UX sketches: None attached
- Story Idea SC-038: Visa kostnader per kategori
  Value intent: Användaren ska kunna se vilka typer av kostnader som driver totalen.
  Expected behavior: Systemet ska summera kostnader per kategori baserat på registrerade utgifter i vald kontext och period.
  UX sketches: None attached
- Story Idea SC-039: Visa kostnader per betalande person
  Value intent: Användaren ska kunna förstå hur kostnader fördelas mellan personer i kontexten.
  Expected behavior: Systemet ska summera kostnader per betalare utifrån utgifternas personkoppling.
  UX sketches: None attached
- Story Idea SC-040: Visa disponibel inkomst efter kostnader
  Value intent: Användaren ska få en enkel bild av återstående utrymme efter registrerade kostnader.
  Expected behavior: Systemet ska beräkna disponibel inkomst minus registrerade kostnader när inkomstdata finns och tydligt visa om data saknas.
  UX sketches: None attached

### EPC-015 - Fallback Epic
Scope boundary: Describe what this Epic includes, excludes, or leaves for later.
- Story Idea SC-041: Visa potentiell besparing från flaggor
  Value intent: Användaren ska kunna identifiera kostnader som kan vara kandidater för besparing.
  Expected behavior: Systemet ska summera kostnader flaggade som lyxiga eller onödiga och presentera dem som beräkningsstöd, inte rådgivning.
  UX sketches: None attached
- Story Idea SC-042: Skapa första kontext via guidat flöde
  Value intent: Ny användare ska förstå första steget och komma till värde utan tom yta eller förvirring.
  Expected behavior: Systemet ska guida ny användare genom första kontexten och vidare mot första utgiften.
  UX sketches: None attached
- Story Idea SC-043: Användbar mobil tidslinje
  Value intent: Mobilanvändare ska kunna använda kärnvyn utan horisontellt kaos.
  Expected behavior: Systemet ska anpassa tidslinjen för små skärmar med scroll, fokuserad månadsvy eller annan mobilanpassad struktur.
  UX sketches: None attached
- Story Idea SC-044: Visa hjälptexter i tomma lägen
  Value intent: Användaren ska förstå nästa steg när data saknas.
  Expected behavior: Systemet ska visa kontextuella tomlägen med tydliga nästa steg utan att skapa in-app dokumentationstyngd.
  UX sketches: None attached
- Story Idea SC-045: Gör ny utgift lätt att hitta
  Value intent: Användaren ska snabbt kunna återvända till appens viktigaste handling.
  Expected behavior: Systemet ska göra primär åtgärd för ny utgift synlig och åtkomlig från huvudvyer.
  UX sketches: None attached
- Story Idea SC-046: Filtrera tidslinjen utan tappad överblick
  Value intent: Användaren ska kunna fokusera på relevant data utan att tappa sammanhanget.
  Expected behavior: Systemet ska erbjuda filter som kan aktiveras och återställas tydligt i tidslinjen.
  UX sketches: None attached
- Story Idea SC-047: Simulera borttag av kostnader
  Value intent: Användaren ska kunna förstå möjlig ekonomisk effekt av att avsluta valda kostnader utan att ändra faktisk data.
  Expected behavior: Systemet ska skapa en temporär simulering där valda kostnader exkluderas från summeringar utan att originaldata ändras.
  UX sketches: None attached
- Story Idea SC-048: Skapa PDF-rapport
  Value intent: Användaren ska kunna dela eller arkivera en sammanställning av vald kontext och period.
  Expected behavior: Systemet ska skapa en PDF-rapport med valda perioder, summeringar och relevant kontextdata.
  UX sketches: None attached

### EPC-016 - Fallback Epic
Scope boundary: Describe what this Epic includes, excludes, or leaves for later.
- Story Idea SC-049: Använd mall för familj, resa eller sambo
  Value intent: Användaren ska kunna starta snabbare från en struktur som passar vanligt användningsfall.
  Expected behavior: Systemet ska skapa relevanta kategorier och inställningar från vald mall utan att lägga in verkliga kostnader.
  UX sketches: None attached
- Story Idea SC-050: Stöd obegränsade kontexter för betalande användare
  Value intent: Betalande användare ska kunna hantera fler separata sammanhang utan konstgjord begränsning.
  Expected behavior: Systemet ska kunna styra kontextbegränsning via plan eller feature flag utan att påverka dataseparering.
  UX sketches: None attached
- Story Idea SC-051: Visa lokala besparingsförslag
  Value intent: Användaren ska få hjälp att upptäcka potentiella besparingar baserat på egen registrerad data.
  Expected behavior: Systemet ska visa regelbaserade förslag lokalt och tydligt presentera dem som stöd, inte automatisk rådgivning.
  UX sketches: None attached

## Downstream AI Instructions

### Always-on Controls
- Preserve Epic -> Story -> Test traceability: Keep downstream AI outputs linked from Epic through Story to later test intent.
- Preserve AI-level-specific review expectations: Keep review strictness aligned with the current AI level.
- Preserve human approval on critical decisions: Do not let downstream AI remove human approval where decision impact or governance requires it.
- Preserve security/privacy/compliance constraints: Carry security, privacy, compliance, and data sensitivity constraints forward into downstream AI behavior.
- Preserve testability and binary acceptance intent: Keep downstream refinement tied to later testability and acceptance clarity.
- Preserve reproducibility expectations at higher AI levels: At higher AI levels, keep logs, reproducibility, and reviewability expectations visible in downstream work.

### Epic Refinement
- E1 Keep each Epic centered on one coherent capability/value area: YES (recommended YES)
- E2 Separate user-facing Epics from enabling/platform/compliance Epics: YES (recommended YES)
- E3 Minimize cross-Epic dependencies: YES (recommended YES)
- E4 Preserve Journey Context during Epic refinement: YES (recommended YES)
- E5 Prefer standard patterns before variants: YES (recommended YES)
- E6 Model transition/coexistence work as explicit Epics: NO (recommended NO)
- E7 Model operability/stability work as explicit Epics: NO (recommended NO)

### Story Idea Refinement
- S1 Keep each Story Idea centered on one primary intent: YES (recommended YES)
- S2 Tie each Story Idea to an actor, journey step, or trigger: YES (recommended YES)
- S3 Split large Story Ideas before Design if verification would be hard: YES (recommended YES)
- S4 Require future testability when refining Story Ideas: YES (recommended YES)
- S5 Keep architecture direction lightweight at Story Idea level: YES (recommended YES)
- S6 Force Story Type classification during refinement: YES (recommended YES)
- S7 Force AI Usage Scope visibility when downstream AI is expected: YES (recommended YES)
- S8 Require rollback/fallback thinking for risky Story Ideas: NO (recommended NO)

### Journey Usage
- J1 Use Journey Context as a primary refinement source when present: YES (recommended YES)
- J2 Preserve journey-to-story traceability when Journey Context exists: YES (recommended YES)
- J3 Allow AI to suggest missing journey/story mappings: YES (recommended YES)
- J4 Prefer actor and flow continuity when Journey Context exists: YES (recommended YES)
- J5 Allow Story Ideas to stand without Journey Context when Journey Context is absent: YES (recommended YES)

### Design Guidance
- D1 Optimize for modularity and future changeability: YES (recommended YES)
- D2 Prefer reuse when fit-for-purpose: NO (recommended NO)
- D3 Prefer integration discipline over shortcuts: YES (recommended YES)
- D4 Make data ownership and classification explicit: YES (recommended YES)
- D5 Preserve security/privacy/compliance in design proposals: YES (recommended YES)
- D6 Make observability and operability part of Design: YES (recommended YES)
- D7 Separate experimentation zones from stable zones: YES (recommended YES)
- D8 Prefer continuity over architectural purity when needed: NO (recommended NO)
- D9 Prefer phased rollout over big bang: NO (recommended NO)

### Build Guidance
- B1 Require Story and Epic traceability for all implementation work: YES (recommended YES)
- B2 Require traceability for AI-generated implementation artifacts: YES (recommended YES)
- B3 Enforce AI-level-specific review and reproducibility rules: YES (recommended YES)
- B4 Require test strategy proportional to Story risk/type: YES (recommended YES)
- B5 Require architecture/security checks in review or CI/CD: YES (recommended YES)
- B6 Prefer automatically generated release evidence: YES (recommended YES)
- B7 Treat support/runbook/handover updates as part of done: NO (recommended NO)
- B8 Prefer low blast radius and reversibility in rollout: NO (recommended NO)
- B9 Allow emergency handling only with retroactive traceability: NO (recommended NO)

### Custom Instructions
- High General: Discovery loop accelerator
  Downstream AI should run an accelerated discovery loop from this Framing package instead of asking for approval at every ordinary refinement step.
Start by inspecting Outcome, Epics, Story Ideas, Journey Context, constraints, AI level, risk posture and approval context.
Use available specialist agents or BMAD-style roles when helpful, for example analyst, product, UX, architect, dev and QA perspectives, but return one consolidated source-of-truth output.
Make reasonable documented assumptions, batch open questions, and continue until a meaningful refinement package exists.
Escalate to the human only for governance-sensitive decisions, missing critical facts, material scope changes, high-risk data/security/privacy issues, or approval/sign-off boundaries.
Return traceable discovery outputs linked back to Outcome -> Epic -> Story Idea -> Journey where applicable, plus assumptions, risks, suggested next experiments and validation checks.

### Deviations from Recommended Defaults
- No preferences currently deviate from the recommended defaults.

### Warnings / Validation Notes
- No hard validation issues or warnings are currently active.

### Generated Downstream Guidance
#### Epic Refinement Guide
- Interpret Epic refinement through the AD delivery posture at AI Level 3.
- Keep the main delivery structure Outcome -> Epic -> Story -> Test intact.
- Keep each Epic centered on one coherent capability/value area: AI should refine Epics into coherent value/capability containers.
- Separate user-facing Epics from enabling/platform/compliance Epics: AI should split enabling work into distinct Epics.
- Minimize cross-Epic dependencies: AI should reduce coupling between Epics.
- Preserve Journey Context during Epic refinement: AI should preserve journey influence in Epic refinement.
- Prefer standard patterns before variants: AI should challenge local variants and seek reusable Epic patterns.
- Model transition/coexistence work as explicit Epics: AI may mix transition work into target-state Epics.
- Model operability/stability work as explicit Epics: AI may keep focus on visible change only.
- Always-on controls remain active: Preserve Epic -> Story -> Test traceability; Preserve AI-level-specific review expectations; Preserve human approval on critical decisions; Preserve security/privacy/compliance constraints; Preserve testability and binary acceptance intent; Preserve reproducibility expectations at higher AI levels.
#### Story Idea Refinement Guide
- Refine Story Ideas so they remain mappable to later implementation and test intent.
- Keep each Story Idea centered on one primary intent: AI should split oversized Story Ideas into focused candidates.
- Tie each Story Idea to an actor, journey step, or trigger: AI should preserve role/flow/trigger context.
- Split large Story Ideas before Design if verification would be hard: AI should split Story Ideas that would be hard to verify.
- Require future testability when refining Story Ideas: AI must reformulate Story Ideas so they can become testable later.
- Keep architecture direction lightweight at Story Idea level: AI should avoid premature architecture lock-in.
- Force Story Type classification during refinement: AI should classify Story Ideas explicitly.
- Force AI Usage Scope visibility when downstream AI is expected: AI should mark expected AI usage scope explicitly.
- Require rollback/fallback thinking for risky Story Ideas: AI may postpone rollback/fallback thinking.
- Do not let downstream AI remove testability, traceability, or human review expectations.
#### Journey Usage Guide
- No Journey Context is present. Downstream AI should still proceed using Outcome, Epics, Story Ideas, constraints, and other Framing inputs.
- Use Journey Context as a primary refinement source when present: AI should actively use Journey Context to refine Epics and Story Ideas.
- Preserve journey-to-story traceability when Journey Context exists: AI should preserve visible traceability between Journey elements and Story Ideas.
- Allow AI to suggest missing journey/story mappings: AI should propose likely Story/Epic mappings where missing.
- Prefer actor and flow continuity when Journey Context exists: AI should favor actor/flow continuity when refining.
- Allow Story Ideas to stand without Journey Context when Journey Context is absent: AI should proceed normally even if no Journey Context exists.
- If Journey Context is absent, do not block Story Idea refinement solely because journey data is missing.
#### Design AI Guidance
- In Design, inherit the Source of Truth from Outcome, Problem, Baseline, Solution Context, Constraints, UX Principles, Non-functional Requirements, Additional Requirements, Data Sensitivity, Journey Context when present, Epics, Story Ideas, and optional references.
- Optimize for modularity and future changeability: AI should prefer changeable modular structures.
- Prefer reuse when fit-for-purpose: AI may propose more net-new implementation.
- Prefer integration discipline over shortcuts: AI should avoid tactical shortcuts in integration design.
- Make data ownership and classification explicit: AI must keep data ownership/classification explicit.
- Preserve security/privacy/compliance in design proposals: AI must embed security/privacy/compliance constraints in design proposals.
- Make observability and operability part of Design: AI should include observability/operability in design thinking.
- Separate experimentation zones from stable zones: AI should preserve exploration vs. stable separation.
- Prefer continuity over architectural purity when needed: AI may favor cleaner target architecture over safer transition.
- Prefer phased rollout over big bang: AI may allow larger cutover plans.
- Security, privacy, compliance, and data classification constraints must stay active in every design proposal.
#### Build AI Guidance
- In Build, preserve Story and Epic lineage, review discipline, test expectations, release evidence, and rollout control.
- Require Story and Epic traceability for all implementation work: AI must preserve explicit Story/Epic traceability.
- Require traceability for AI-generated implementation artifacts: AI output must remain traceable.
- Enforce AI-level-specific review and reproducibility rules: AI must tailor Build guidance to AI level.
- Require test strategy proportional to Story risk/type: AI must require verification proportional to risk and type.
- Require architecture/security checks in review or CI/CD: AI should include structural/security checks in Build guidance.
- Prefer automatically generated release evidence: AI should assume evidence generation where practical.
- Treat support/runbook/handover updates as part of done: AI may focus mainly on code/test.
- Prefer low blast radius and reversibility in rollout: AI may allow broader-impact changes.
- Allow emergency handling only with retroactive traceability: AI may normalize emergency shortcuts.
- Review strictness and reproducibility must remain aligned with AI Level 3.

## Tollgate 1 Approval Context
Approval status: Approved
Approved version: 28
Approved at: 2026-05-01T07:10:18.994Z
- aqa (supplier)
  Person: Denzel Washington
  Role title: AI Quality Authority
  Approved at: 2026-05-01T07:10:16.980Z
  Motivation: Låg risk motiverar hög accelleration
- value owner (customer)
  Person: Anne Hathaway
  Role title: Value Owner
  Approved at: 2026-05-01T07:09:52.961Z
  Motivation: OK. Blir spännande att se!

## Recommended Use In The Next Step
Use this Framing package as the governed source of truth when you move into design, story refinement or structured delivery planning with BMAD or another AI tool.
- Treat the customer handshake, baseline and AI/risk posture as the framing source of truth.
- Treat Epics and Story Ideas as directional input for design and later delivery refinement, not as fixed implementation steps.
- If later steps create Delivery Stories or extra work items, keep them traceable back to this Framing package or record them explicitly as feedback-loop additions.
- Use the approval section to understand whether this Framing version is already signed off for Tollgate 1.
- Use the UX sketch references where they exist to preserve visual intent in the next step.

## Export Metadata
Lifecycle state: active
Origin type: imported
Exported at: 2026-05-01T07:10:39.577Z