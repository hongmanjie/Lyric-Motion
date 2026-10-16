# README media and demos

## Four creative directions

The optional creative profiles and their source examples live in `examples/styles/`: **Playground**, **Flowing Poetry**, **Digital Sculpture**, and **Story Sketch**. They illustrate four different approaches to typography, materials, movement and storytelling. To build original, shareable demonstrations from a clean checkout:

```sh
node tools/make-style-examples.mjs --public-demo --out projects/public-kinetic-previews
node tools/showcase-styles.mjs
```

The first command refuses an existing destination. The second renders missing `main.mp4` files and creates `docs/media/styles/{id}/poster.png`, `demo.gif`, `demo.mp4`, a **2 × 2 overview** and a provenance manifest. Poster times are chosen for each direction: 6.3s, 6.5s, 6.6s and 5.2s respectively. If you change example artwork, copy/regenerate it into a new study and re-render the affected `main` explicitly before capturing new media. An existing render is never assumed to reflect changed source.

The public studies use a **14.3-second excerpt** of the original instrumental, a short audio fade-out, and four original editorial phrases: **BREAK THROUGH THE NOISE**, **MAKE TOMORROW BRIGHT**, **DIVE INTO THE NIGHT**, and **TAKE MY HAND**. There is **no added silent ending hold**. Text and subphrase timings are authored editorial cues, not transcribed or aligned vocals. The local sung comparison uses supplied media and translations; its audio, lyrics, frames and videos remain under ignored `projects/`.

For your own supplied media, first prepare a reliable timed project, then create an independent same-excerpt study:

```sh
node tools/make-style-examples.mjs --audio /path/audio.mp3 --timeline /path/timeline.json --start 20 --duration 14.3 --out projects/my-style-study
```

This example command expects the prepared timeline and audio to use the same clock; choose a range within both. It clips supplied timing rather than aligning vocals. The demonstration code illustrates these art directions; normal `init --style` copies only creative preferences and still requires an original implementation for the new lyrics.

`src/compare.html` is an optional local playback surface for a project's `comparison.json` with items `{name, file: "renders/NAME.mp4"}`. It supports switching versions at the same time; it has no generation or upload service.

## Original toolkit demo

The separate `examples/demo` composition remains a 16-second original typography and vector-animation demonstration. Its media is rendered directly from the editable example. No screen recording is needed to produce clean footage.

```sh
npm run demo
npm run render
npm run showcase
```

`demo` rebuilds the original score and timeline. `render` exports the actual artwork; use a new render name or explicit `--overwrite` when one already exists. `showcase` takes `examples/demo/renders/main.mp4` and creates:

| File | Use |
| --- | --- |
| `docs/media/demo.gif` | Silent inline animation in both READMEs |
| `docs/media/demo.mp4` | Downloadable H.264 video with the original score |
| `docs/media/poster.png` | Full-size WAVES still from the exported video |
| `docs/media/move.png`, `together.png`, `yours.png` | Additional real scene stills |
| `docs/media/social-preview.png` | 1280×640 repository social preview image |
| `docs/media/manifest.json` | Provenance, input hashes, export metadata and media sizes |

README uses a relative GIF image plus an MP4 link, so it does not depend on an external video hosting account. Native GitHub attachment players require an uploaded attachment URL; the repository does not pretend a relative MP4 Markdown image is guaranteed to embed as a player.

The GIF is a display artifact, not evidence that someone inspected playback. Before publishing a changed demo, inspect full-size frames, run the actual video continuously, fix visible issues and record actual coverage in the project's `qa/`. Do not claim subjective listening from screenshots.

The included example is an original procedural instrumental with authored text and editorial timing. It does not demonstrate automatic synchronization to a sung voice. A future vocal showcase needs a redistributable recording and honest alignment evidence.

## Adding community examples

Share the result plus the reusable source/style materials, where permitted. State the client/model, inputs, prompt, duration, generation time, manual edits and asset licenses. Show multiple genuinely different directions rather than repeatedly changing the words in the same demo.

The maintainers can capture images, render videos and produce GIFs themselves. Manual screenshots are only needed for an external interface or asset unavailable to the toolkit. Public sharing of someone else's song or reference requires its appropriate permissions; local reference analysis and public redistribution are separate decisions.
