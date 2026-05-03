# Implementation Notes

## Autonoma antaganden

- Appen är lokal-first och kräver ingen server eller inloggning.
- Svenska är initialt enda språk.
- Strukturerad data och filbilagor sparas lokalt i webbläsaren.
- Tillåtna filtyper är PNG, JPG, WebP och PDF upp till 10 MB.
- Kryptering är inte införd i grundversionen; den finns som markerad exploration enligt framing.
- Årsutgifter periodiseras per månad i översikter.
- Personer är betalare; avancerad kostnadsdelning ingår inte i första helversionen.
- Export stöder JSON, ZIP med bilagor, CSV och PDF-rapport.
- Premium/tillväxt hanteras som lokala feature-/planflaggor, inte verklig betalvägg.
- Grunddata laddas med vanliga hushållsleverantörer inom streaming, musik, ljudböcker, mobil/bredband, moln/mjukvara, nyheter, träning, försäkring och el. Befintlig lokal data berikas automatiskt utan att raderas.

## Story coverage

- EP-001 Kontext och dataseparering: skapa, växla, konfigurera tidsfönster och duplicera mall.
- EP-002 Snabbregistrering: skapa komplett eller ofullständig utgift, ny leverantör i flödet, betalare och flaggning.
- EP-003 Tidslinje: rader per utgift, månader som kolumner, kostnadsstaplar, detaljpanel, historikfilter och månadssummor.
- EP-004 Uppsägning: uppsägningstid, låst period, tidigaste kostnadsfria månad, varning och påminnelse.
- EP-005 Register: personer, leverantörer, logg-/filmetadata, uppsägningsinstruktioner och kategorier.
- EP-006 Export/import: hel kontext, import som ny kontext, filval, CSV och valideringsfel.
- EP-007 Lokal lagring: data utan konto, bilagor, metadata, lokal riskvarning, radera bilaga och krypterings-exploration.
- EP-008 Insikter: månadssumma, kategori, betalare, disponibel inkomst och potentiell besparing.
- EP-009 UX/onboarding: guidat första flöde, mobil layout, tomlägen/åtgärder, primär ny-utgift och filter.
- EP-010 Premium/tillväxt: simulering, PDF, mallar, obegränsade kontexter via planflagga och lokala besparingsförslag.

## Verifiering

- `pnpm test` täcker beräkningslogik och import/export-remappning.
- `pnpm build` kör TypeScript och produktionsbygge.
