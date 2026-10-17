# PRISM pitch

The seven-slide deck is authored in `frontend/public/pitch/index.html`, `deck.css` and `deck.js`. Vite copies this directory into the application build. Serve the built application, then use `/pitch/` as the PitchDeckURL and `/pitch/PRISM-Pitch.pdf` for the portable PDF.

The selected track is Enterprise AI. The pitch addresses purpose-aware privacy and utility review for enterprise research teams before internal or partner sharing. Its oncology examples are fictional. Local semantic recognition and optional Jev 1.14 typed decisions interpret approved schema metadata; deterministic code performs the privacy, transformation and scientific-utility calculations. Coding agents assisted development separately from runtime Jev.

Desktop controls support previous/next, arrow keys, Page Up/Page Down, Space, Home and End. Overview reveals all slides. Mobile shows a vertical deck. Print styling includes all seven slides at 16:9. All fonts are bundled locally with their IBM Plex OFL licenses. The deck makes no external font or media requests.

`docs/SUBMISSION_COPY.md` includes the description, two-minute script, screenshot captions and claim boundaries. The chart is authored from `examples/kit_benchmark/reproduction.json`; it is not an application screenshot.

To regenerate the PDF and private preview images using installed Chrome and the existing `playwright-core`:

```powershell
node pitch/render.mjs
```

Final portable output: `frontend/public/pitch/PRISM-Pitch.pdf`. The `pitch/renders/` directory contains private visual checks, not submission screenshots. Real application screenshots must come from the deployed fictional demo.

The app and PDF demo links point to the canonical Archie deployment at https://41d0bdfd-0065-4b0b-a973-efbe1c1a9c5e.archie.site/. The deck and PDF remain at https://prism-healthcare-taupe.vercel.app/pitch/. The public repository is https://github.com/coldshalamov/PRISM. Archie hosts the HTML entry and Archie Core provides durable PostgreSQL/GraphQL state. Vercel serves immutable UI assets and Python compute. Optional Jev calls use OpenRouter's Decisions API. This is a split deployment, not an all-Archie compute claim. This pitch authoring workflow creates no repository, deployment or submission. Do not click Submit until the user explicitly asks.

The semantic revision updates slides 1, 3, 6 and 7 while preserving the reproduced 75-to-20 chart. Slide 6 separately labels the appointment fixture's 480-to-96 sample-uniqueness result. PDF authoring for this revision uses a local static server and CUA's Chrome DevTools `Page.printToPDF`. The changed `web-slide-*.png` preview frames are rendered from the final PDF at matching 1360 × 765 dimensions; their filenames are retained for the existing review set. All four changed frames are visually checked for clipping, wrapping and readability.
