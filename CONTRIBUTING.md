# Contributing

Start with README.md and AGENTS.md. Keep the project conversation-first and preserve artistic freedom. Demonstration composition is not a global visual template.

## Development

Node.js 22+ is required; there are no npm dependencies. Browser/media integration also requires a Chromium browser and FFmpeg/FFprobe.

```sh
npm test
node tools/cli.mjs doctor
npm run check
```

Tests use fresh fixture directories under ignored `qa/`. Runtime/browser changes require actual rendered-frame and continuous-playback review of the demo, not only unit tests. Report host or sandbox limitations rather than silently declaring success.

Use lowercase English/ASCII paths for public source, documentation and commands. Multilingual document content and user media filenames are supported. Never commit `projects/`, private reference media, model credentials or generated QA. Public demo assets must have clear redistribution rights and provenance.

## Changes and reports

Describe the concrete problem, resulting behavior and relevant validation. Include a small reproducer with original/public-domain media when possible; avoid demanding a user's entire private song for a bug report. Do not add fixed scene counts, palettes or token animations to the core workflow.

For style and artwork contributions, include source, actual video, client/model, prompt, timing provenance, manual edits and licenses. Do not claim a single prompt produced a manually revised result. Respect each project's requested scope and preserve previous revisions.
