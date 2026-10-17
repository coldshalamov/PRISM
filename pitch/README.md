# PRISM pitch

The seven-slide deck is authored in `frontend/public/pitch/index.html`, `deck.css` and `deck.js`. Vite copies this directory into the application build. Serve the built application, then use `/pitch/` as the PitchDeckURL and `/pitch/PRISM-Pitch.pdf` for the portable PDF.

The selected track is Enterprise AI. The pitch addresses purpose-aware privacy and utility review for enterprise research teams before internal or partner sharing. Its oncology benchmark is a fictional example. The runtime is a deterministic scientific engine, with optional external diagnostic cross-checks; coding agents assisted development.

Desktop controls support previous/next, arrow keys, Page Up/Page Down, Space, Home and End. Overview reveals all slides. Mobile shows a vertical deck. Print styling includes all seven slides at 16:9. All fonts are bundled locally with their IBM Plex OFL licenses. The deck makes no external font or media requests.

`docs/SUBMISSION_COPY.md` includes the description, two-minute script, screenshot captions and claim boundaries. The chart is authored from `examples/kit_benchmark/reproduction.json`; it is not an application screenshot.

To regenerate the PDF and private preview images using installed Chrome and the existing `playwright-core`:

```powershell
node pitch/render.mjs
```

Final portable output: `frontend/public/pitch/PRISM-Pitch.pdf`. The `pitch/renders/` directory contains private visual checks, not submission screenshots. Real application screenshots must come from the deployed fictional demo.

The app and PDF demo links point to the verified canonical deployment at https://prism-healthcare-taupe.vercel.app/. The public repository is https://github.com/coldshalamov/PRISM. Archie Core provides PostgreSQL and GraphQL; Vercel hosts the frontend and Python compute. This pitch authoring workflow creates no repository, deployment or submission. Do not click Submit until the user explicitly asks.
