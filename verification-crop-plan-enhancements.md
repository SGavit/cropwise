# Crop Plan enhancement verification

## Automated checks

- `pnpm test`: 62 passed, 1 skipped (optional Resend integration remains deferred).
- `pnpm exec tsc --noEmit`: passed.
- `NODE_OPTIONS=--max-old-space-size=3072 pnpm build`: passed after stopping the redundant TypeScript watch process.
- Farm-profile allocation migration: nullable `cropAreaAllocations` TEXT column added successfully; the generated TEXT default was corrected for TiDB compatibility.

## Visual checks

- Desktop 1280x720 dashboard remains stable with the Bhatodi location summary, current Kharif context, weather/market cards, and sidebar navigation visible.
- Mobile 375x812 dashboard remains readable with compact menu, location pill, language control, hero content, and no observed horizontal overflow in the captured viewport.
- Crop Plan enhancement UI is implemented in the workspace source with responsive allocation rows, seasonal suggestion cards, and stacked mobile export actions. The screenshot service remained on the default Overview tab, so the interactive Crop Plan controls were covered by automated helper/router tests and build validation rather than a direct tab capture.

## Notes

The development server’s health snapshot still showed earlier weather-provider fetch warnings and stale HMR TypeScript error text, but a fresh standalone TypeScript check and production build both passed after the final source changes.

## Direct Crop Plan preview

The live preview opened the Crop Plan tab successfully in Marathi. It visibly rendered the 3/3 multi-crop shortlist, seven crop choices, total farm area input, percentage/acre unit switch, three allocation inputs totaling 100%, area-plan save button, three Kharif combination cards, and both PDF download and print actions. The active Bhatodi, Beed, Maharashtra location remained visible. The planning controls fit within the captured desktop viewport and the translated labels were readable.

## Acreage validation interaction

In the live Crop Plan preview, switching from percentages to acres converted each selected crop to 1.50 acres. Editing the farm total to 5.5 acres and changing Maize and Groundnut to 2.0 acres recalculated their percentages and surfaced a clear 106.1% total warning, while the export buttons stayed blocked until the plan is corrected. This confirms the editor prevents exporting an over-allocated plan rather than silently producing an invalid offline document.

## Offline export interaction

With the corrected 5.5-acre plan totaling 100%, the live preview kept both `PDF download` and `Print plan` enabled. The preview also showed the three Kharif seasonal-combination cards and their apply actions in the Marathi interface. The PDF action was triggered from the live Crop Plan workspace without changing the visible plan state; the browser preview’s download UI is separate from the application and did not expose a local file path in the sandbox.
