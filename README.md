# VULCAN — Welded Joint Calculator

A browser-based welded joint design calculator. No backend server required — Python runs entirely in WebAssembly via Pyodide.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Styles**: Tailwind CSS v4 (via `@tailwindcss/vite`)
- **State**: Zustand stores (`pyodideStore`, `projectStore`, `resultsStore`, `uiStore`)
- **Python engine**: Pyodide 0.26 loaded from CDN; engines in `public/python/engines/`
- **Reference data**: JSON files in `public/python/data/` (AWS D1.1, AISC 360, materials, electrodes)
- **No backend**: everything runs client-side

## Run (development)

```bash
npm install
npm run dev
```

Open http://localhost:5173. On first load Pyodide downloads (~12 s); subsequent loads use the browser cache.

## Build for production

```bash
npm run build
npm run preview   # local preview of dist/
```

## Deploy to Vercel

1. Push to GitHub.
2. Import repo in Vercel — framework preset: **Vite**.
3. No environment variables required.
4. `vercel.json` handles SPA rewrites.

```bash
# Or via CLI
npx vercel --prod
```

## Smoke test items

After loading the app in a browser:

1. **Loader screen** — VULCAN splash with animated progress bar appears while Pyodide initialises.
2. **Default joint loaded** — WLD-001 visible in sidebar; T-Joint preview SVG renders in editor.
3. **Results panel** — structural results appear automatically (utilization %, required weld size, AWS checks).
4. **Geometry inputs** — change web thickness; results update within ~200 ms (debounced).
5. **ASD / LRFD toggle** — switching code basis changes F_w_allow and utilization.
6. **SI / US toggle** — unit labels in input fields change (mm ↔ in, N ↔ lbf).
7. **Add joint** — clicking "+ Add Joint" adds WLD-002; switching between joints updates all panels.
8. **Save / Open** — Ctrl+S downloads a `.vulcan` JSON file; Ctrl+O / Open button loads it back.
9. **AWS warnings** — set weld size below 8 mm for 16 mm material → red error appears in Code Checks.
10. **Weld symbol** — AWS fillet weld SVG symbol renders in results panel.
