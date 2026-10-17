# Lyric Motion

This is a conversation-first MV toolkit for Codex and Claude Code. Read README.md and docs/workflows.md. The former private single-song production is preserved under projects/legacy-night-play; do not use it as the public starter or copy its lyrics into a release.

- User work belongs in independent projects/ directories. Preserve original inputs and previous good revisions.
- Creation is open ended: choose composition, typography, shot duration, materials and implementation for the current song. The demo is not a mandatory visual template. Do not read or copy sibling projects.
- Use the real audio duration and supplied lyric timing. TXT is unaligned until an actual alignment method provides times. Do not invent beats or claim word alignment from evenly divided text.
- src/ is the shared runtime; project artwork.js is the generated artwork. templates/artwork.js deliberately blocks export. Set its module readyToRender=true only after creating the work.
- For the bundled exporter expose __ready, __meta, __seek(t), __freeze(); wait for assets/fonts and support out-of-order deterministic seeking. Another framework needs equivalent reproducible export and instructions.
- Inspect full-size frames and actual continuous playback, then fix visible problems. Contact sheets and technical tests do not prove visual quality or subjective listening. Record actual coverage and limitations in the project's qa/.
- Use the user's requested scope: reference analysis can end with a style bundle, and creation can start with no reference. Keep platform/model credentials out of project files.
- Public package files and directories use ASCII English names. User-provided filenames and multilingual content are supported and must not be silently rewritten.
- Publishing a user project requires an explicit request for that media and destination. The maintainer-selected rendered excerpts in docs/media/showcase/ are a specific public showcase; this does not authorize publishing other user inputs, full recordings, full lyric files, private artwork projects or QA. Song/recording rights remain separate from the code license.
- Run npm test for logic changes; inspect and render the original demo when changing runtime/export. npm run package uses an explicit public allowlist, excluding private projects and generated review files.
