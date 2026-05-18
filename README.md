# JIWW - Jump In, Water's Wet

JIWW is a playful web app that generates complete multi-track MIDI song sketches from a single genre choice. Pick one of 16 genres, click **Jump In**, preview the generated arrangement in the browser, then download individual MIDI stems or a ZIP of the full song.

## Features

- 16 launch genres: House, Techno, Drum & Bass, UK Garage, Hip-Hop, Trap, Lo-Fi Hip-Hop, Synthwave, Ambient, Funk, Disco, Pop, Indie Rock, Reggaeton, Afrobeat, and Jazz Fusion.
- Seeded deterministic generation for repeatable results.
- Genre-aware BPM, swing, key, scale, arrangement, instruments, and track count.
- Full song structures with intro, verses, choruses, bridge/breakdown, final chorus, and outro.
- Generated drums, bass, chords, hooks, melodic parts, pads, arps, textures, and FX.
- Individual MIDI stem downloads.
- Full-arrangement MIDI download.
- ZIP download containing song metadata and MIDI files.
- Browser preview with General MIDI SoundFont samples for pitched instruments and a lightweight drum fallback.
- Compact responsive UI with preview elapsed time and duration display.

## Tech Stack

- Next.js
- React
- TypeScript
- JSZip
- soundfont-player
- Web Audio API
- Client-side MIDI rendering

The app is designed to be deployable on Vercel without persistent storage or background workers. Generation, MIDI rendering, ZIP creation, and preview playback happen in the browser.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Vercel Deployment

Use the default Next.js settings:

- Framework Preset: `Next.js`
- Root Directory: `./`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: default / empty
- Node.js Version: `20.x` or `22.x`

No environment variables are required for the current MVP.

## SoundFont Preview

Pitched preview instruments are loaded lazily from:

```txt
https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/
```

Because samples are loaded on demand, the first preview may take a few seconds. Preview playback requires the browser to have internet access to that SoundFont host.

Drums use a small built-in Web Audio fallback because the remote SoundFont set does not expose `standard_kit` in the same way as pitched GM instruments.

## Downloads

Generated songs include:

- Individual `.mid` files for each track.
- A full-arrangement `.mid` file.
- A ZIP file containing:
  - `song-info.json`
  - `full-arrangement.mid`
  - one MIDI file per track in `/tracks`

Downloads are generated in memory and do not require server-side file storage.

## Project Structure

```txt
app/
  globals.css      UI styling
  layout.tsx       Root app metadata/layout
  page.tsx         Generator UI, preview, downloads
lib/
  generator.ts     Genre profiles, song generation, MIDI/ZIP helpers
```

## Known Limitations

- Preview playback is a browser approximation, not rendered studio audio.
- Drum preview is synthesized rather than SoundFont-sampled.
- SoundFont playback depends on a third-party public sample host.
- Generated output is intended as a production starting point, not a finished mixed song.

## License

See `LICENSE`.
