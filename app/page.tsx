"use client";

import { useEffect, useRef, useState } from "react";
import { addZip, dataUrl, GeneratedSong, GeneratedTrack, generateSong, genres, SwingLevel } from "../lib/generator";

const stages = ["Picking a tempo that can swim...", "Teaching the bassline to float...", "Sprinkling hooks into the chorus...", "Making the drums less awkward...", "Packing your MIDI suitcase..."];
type SoundfontInstrument = { play: (note: string | number, when?: number, options?: { duration?: number; gain?: number }) => unknown; stop?: () => void };
type SoundfontModule = { instrument: (ctx: AudioContext, name: string, options?: { soundfont?: string; nameToUrl?: (name: string, soundfont: string, format: string) => string }) => Promise<SoundfontInstrument> };
type PreviewState = { label: string; elapsed: number; duration: number; loading: boolean; playing: boolean };
const gmNames = ["acoustic_grand_piano", "bright_acoustic_piano", "electric_grand_piano", "honkytonk_piano", "electric_piano_1", "electric_piano_2", "harpsichord", "clavinet", "celesta", "glockenspiel", "music_box", "vibraphone", "marimba", "xylophone", "tubular_bells", "dulcimer", "drawbar_organ", "percussive_organ", "rock_organ", "church_organ", "reed_organ", "accordion", "harmonica", "tango_accordion", "acoustic_guitar_nylon", "acoustic_guitar_steel", "electric_guitar_jazz", "electric_guitar_clean", "electric_guitar_muted", "overdriven_guitar", "distortion_guitar", "guitar_harmonics", "acoustic_bass", "electric_bass_finger", "electric_bass_pick", "fretless_bass", "slap_bass_1", "slap_bass_2", "synth_bass_1", "synth_bass_2", "violin", "viola", "cello", "contrabass", "tremolo_strings", "pizzicato_strings", "orchestral_harp", "timpani", "string_ensemble_1", "string_ensemble_2", "synth_strings_1", "synth_strings_2", "choir_aahs", "voice_oohs", "synth_choir", "orchestra_hit", "trumpet", "trombone", "tuba", "muted_trumpet", "french_horn", "brass_section", "synth_brass_1", "synth_brass_2", "soprano_sax", "alto_sax", "tenor_sax", "baritone_sax", "oboe", "english_horn", "bassoon", "clarinet", "piccolo", "flute", "recorder", "pan_flute", "blown_bottle", "shakuhachi", "whistle", "ocarina", "lead_1_square", "lead_2_sawtooth", "lead_3_calliope", "lead_4_chiff", "lead_5_charang", "lead_6_voice", "lead_7_fifths", "lead_8_bass__lead", "pad_1_new_age", "pad_2_warm", "pad_3_polysynth", "pad_4_choir", "pad_5_bowed", "pad_6_metallic", "pad_7_halo", "pad_8_sweep", "fx_1_rain", "fx_2_soundtrack"];

export default function Home() {
  const [genre, setGenre] = useState(genres[0].id);
  const [seed, setSeed] = useState("");
  const [trackCount, setTrackCount] = useState("");
  const [bpm, setBpm] = useState("");
  const [swingLevel, setSwingLevel] = useState<SwingLevel | "">("");
  const [density, setDensity] = useState("0.8");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [song, setSong] = useState<GeneratedSong | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewState>({ label: "Idle", elapsed: 0, duration: 0, loading: false, playing: false });
  const audio = useRef<AudioContext | null>(null);
  const timers = useRef<number[]>([]);
  const progressTimer = useRef<number | null>(null);
  const instruments = useRef<Record<string, SoundfontInstrument>>({});
  const profile = genres.find((g) => g.id === genre) ?? genres[0];

  useEffect(() => {
    if (!loading) return;
    setStage(0);
    const id = window.setInterval(() => setStage((s) => Math.min(stages.length - 1, s + 1)), 520);
    return () => clearInterval(id);
  }, [loading]);

  async function jump() {
    setError("");
    setLoading(true);
    stop();
    await new Promise((r) => setTimeout(r, 500));
    try {
      const made = generateSong({ genreId: genre, seed, advancedOptions: { trackCount: trackCount ? Number(trackCount) : undefined, bpm: bpm ? Number(bpm) : undefined, swingLevel: swingLevel || undefined, density: Number(density) } });
      setStage(4);
      setSong(await addZip(made));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The song slipped on the pool tiles. Try generating again.");
    } finally {
      setLoading(false);
    }
  }

  function stop() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = null;
    Object.values(instruments.current).forEach((i) => i.stop?.());
    audio.current?.close();
    audio.current = null;
    setPreview((p) => ({ ...p, elapsed: 0, loading: false, playing: false, label: p.label === "Idle" ? "Idle" : "Stopped" }));
  }

  async function play(track?: GeneratedTrack) {
    stop();
    if (!song) return;
    const tracks = track ? [track] : song.tracks;
    const duration = previewDuration(tracks, song.bpm);
    const label = track ? track.name : "Full song";
    setPreview({ label, elapsed: 0, duration, loading: true, playing: false });
    setError("");
    try {
      const ctx = new AudioContext();
      audio.current = ctx;
      const mod = await import("soundfont-player");
      const Soundfont = (((mod as { default?: unknown }).default ?? mod) as SoundfontModule);
      const master = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor();
      master.gain.value = track ? 0.75 : 0.42;
      limiter.threshold.value = -15;
      limiter.knee.value = 20;
      limiter.ratio.value = 10;
      limiter.attack.value = 0.004;
      limiter.release.value = 0.2;
      master.connect(limiter).connect(ctx.destination);
      const needed = [...new Set(tracks.filter((t) => !t.drum).map(soundfontName))];
      await Promise.all(needed.map(async (name) => {
        if (!instruments.current[name]) instruments.current[name] = await loadInstrument(Soundfont, ctx, name);
      }));
      setPreview({ label, elapsed: 0, duration, loading: false, playing: true });
      const startedAt = performance.now();
      progressTimer.current = window.setInterval(() => {
        const elapsed = Math.min(duration, (performance.now() - startedAt) / 1000);
        setPreview((p) => ({ ...p, elapsed, playing: elapsed < duration }));
        if (elapsed >= duration && progressTimer.current) clearInterval(progressTimer.current);
      }, 250);
      tracks.forEach((t) => {
        const inst = t.drum ? null : instruments.current[soundfontName(t)];
        t.events.slice(0, 1400).forEach((e) => {
          const eventTime = Number.isFinite(e.time) ? Math.max(0, e.time) : 0;
          const eventDuration = Number.isFinite(e.duration) ? Math.max(0.05, e.duration) : 0.12;
          const secondsPerBeat = 60 / song.bpm;
          const gain = previewGain(t, tracks.length) * Math.max(0.25, Math.min(1, e.velocity));
          const timer = window.setTimeout(() => {
            if (t.drum) playDrum(ctx, master, e.note, gain);
            else inst?.play(e.note, ctx.currentTime, { duration: eventDuration * secondsPerBeat, gain });
          }, eventTime * secondsPerBeat * 1000);
          timers.current.push(timer);
        });
      });
    } catch (e) {
      setPreview({ label: "Idle", elapsed: 0, duration: 0, loading: false, playing: false });
      setError(e instanceof Error ? `The preview floatie popped: ${e.message}` : "The preview floatie popped. Try again.");
    }
  }

  return (
    <main className="page shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">JIWW</p>
          <h1>Jump In, Water&apos;s Wet</h1>
        </div>
        <p>Genre in. Full MIDI song out.</p>
      </header>

      <section className="workspace">
        <aside className="panel generator">
          <div className="panel-head">
            <h2>Generator</h2>
            <span>{profile.bpmRange[0]}-{profile.bpmRange[1]} BPM</span>
          </div>
          <div className="genre-list" aria-label="Genre selector">
            {genres.map((g) => (
              <button key={g.id} className={`genre-chip ${genre === g.id ? "selected" : ""}`} onClick={() => setGenre(g.id)} aria-pressed={genre === g.id}>
                <strong>{g.icon} {g.displayName}</strong>
                <span>{g.groove}</span>
              </button>
            ))}
          </div>
          <div className="mini-form">
            <label>Seed<input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="optional" /></label>
            <label>Tracks<input type="number" min="4" max="16" value={trackCount} onChange={(e) => setTrackCount(e.target.value)} placeholder={`${profile.trackCountRange[0]}-${profile.trackCountRange[1]}`} /></label>
            <label>BPM<input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder={`${profile.bpmRange[0]}-${profile.bpmRange[1]}`} /></label>
            <label>Swing<select value={swingLevel} onChange={(e) => setSwingLevel(e.target.value as SwingLevel | "")}><option value="">Auto</option><option>straight</option><option>light</option><option>medium</option><option>heavy</option></select></label>
          </div>
          <label className="density">Density <input type="range" min="0.4" max="1" step="0.05" value={density} onChange={(e) => setDensity(e.target.value)} /></label>
          <button className="cta compact" onClick={jump}>Jump In</button>
        </aside>

        <section className="maincol">
          {error && <div className="notice bad">{error}</div>}
          <PreviewBar preview={preview} stop={stop} />
          {song ? <Results song={song} play={play} stop={stop} regenerate={jump} /> : <EmptyState />}
        </section>
      </section>

      {loading && <LoadingModal stage={stage} onCancel={() => setLoading(false)} />}
    </main>
  );
}

function PreviewBar({ preview, stop }: { preview: PreviewState; stop: () => void }) {
  const pct = preview.duration ? Math.min(100, (preview.elapsed / preview.duration) * 100) : 0;
  return (
    <div className="panel preview-bar">
      <div>
        <strong>{preview.loading ? "Loading preview" : preview.playing ? "Now playing" : "Preview"}</strong>
        <span>{preview.label}</span>
      </div>
      <div className="timebox">
        <span>{formatTime(preview.elapsed)} / {formatTime(preview.duration)}</span>
        <div className="timeline"><div style={{ width: `${pct}%` }} /></div>
      </div>
      <button className="small alt" onClick={stop}>Stop</button>
    </div>
  );
}

function EmptyState() {
  return <div className="panel empty"><h2>Ready for a splash.</h2><p>Pick a genre, tweak anything optional, then generate a structured MIDI arrangement with stems, hooks, and downloads.</p></div>;
}

function Results({ song, play, stop, regenerate }: { song: GeneratedSong; play: (t?: GeneratedTrack) => void; stop: () => void; regenerate: () => void }) {
  const total = song.tracks.reduce((n, t) => n + t.noteCount, 0);
  return (
    <div className="results compact-results">
      <section className="panel result-head">
        <div>
          <p className="eyebrow">{song.genreName}</p>
          <h2>{song.title}</h2>
        </div>
        <div className="actions"><button className="small" onClick={() => play()}>Play full</button><button className="small alt" onClick={stop}>Stop</button><button className="small" onClick={regenerate}>Regenerate</button></div>
        <div className="stat-grid">
          <span>BPM <strong>{song.bpm}</strong></span><span>Key <strong>{song.key}</strong></span><span>Swing <strong>{song.swingLevel} {song.swingAmount}%</strong></span><span>Tracks <strong>{song.tracks.length}</strong></span><span>Length <strong>{song.lengthBars} bars</strong></span><span>Notes <strong>{total.toLocaleString()}</strong></span>
        </div>
        <div className="actions"><a className="small" href={dataUrl(song.fullMidiBase64, "audio/midi")} download={`JIWW_${song.genreName}_${song.seed}_FullArrangement.mid`}>Full MIDI</a><a className="small alt" href={dataUrl(song.zipBase64, "application/zip")} download={song.zipFileName}>Download ZIP</a></div>
      </section>

      <section className="panel arrangement-card">
        <h3>Arrangement</h3>
        <div className="arrangement slim">{song.arrangement.map((s) => <div className="section" key={s.name} style={{ flexGrow: s.bars }}><strong>{s.name}</strong><span>{s.bars} bars</span></div>)}</div>
      </section>

      <section className="panel track-card">
        <h3>Tracks</h3>
        <div className="tracks compact-tracks">{song.tracks.map((t) => <TrackRow key={t.id} track={t} play={play} stop={stop} />)}</div>
      </section>
    </div>
  );
}

function TrackRow({ track, play, stop }: { track: GeneratedTrack; play: (t?: GeneratedTrack) => void; stop: () => void }) {
  const active = Object.entries(track.sectionParticipation).filter(([, v]) => v).map(([k]) => k.replace(" Chorus", " Ch.")).join(", ");
  return (
    <article className="track-row">
      <div><strong>{track.id.slice(-2)}. {track.name}</strong><span>{track.role} | {track.drum ? "GM Drum Kit" : `GM ${track.program}`} | Ch. {track.channel + 1}</span><em>{active}</em></div>
      <div className="actions"><button className="small" onClick={() => play(track)}>Solo</button><button className="small alt" onClick={stop}>Stop</button><a className="small" href={dataUrl(track.midiBase64, "audio/midi")} download={track.fileName}>MIDI</a></div>
    </article>
  );
}

function LoadingModal({ stage, onCancel }: { stage: number; onCancel: () => void }) {
  return <div className="modal" role="dialog" aria-modal="true" aria-label="Generating song"><div className="panel loader"><div className="ripple" /><h2>The water&apos;s getting musical...</h2><p>{stages[stage]}</p><div className="bar"><div style={{ width: `${((stage + 1) / stages.length) * 100}%` }} /></div><button className="small alt" onClick={onCancel}>Cancel</button></div></div>;
}

async function loadInstrument(Soundfont: SoundfontModule, ctx: AudioContext, name: string) {
  const options = { soundfont: "FluidR3_GM", format: "mp3", nameToUrl: (instrument: string, soundfont: string, format: string) => `https://gleitz.github.io/midi-js-soundfonts/${soundfont}/${instrument}-${format || "mp3"}.js` } as { soundfont: string; format: string; nameToUrl: (instrument: string, soundfont: string, format: string) => string };
  try { return await Soundfont.instrument(ctx, name, options); } catch { return Soundfont.instrument(ctx, "acoustic_grand_piano", options); }
}
function soundfontName(track: GeneratedTrack) { return gmNames[Math.max(0, Math.min(gmNames.length - 1, track.program ?? 0))] ?? "acoustic_grand_piano"; }
function playDrum(ctx: AudioContext, out: AudioNode, note: number, gain: number) { const now = ctx.currentTime; const g = ctx.createGain(); g.gain.setValueAtTime(Math.min(0.28, gain * 0.5), now); g.gain.exponentialRampToValueAtTime(0.0001, now + (note < 40 ? 0.18 : 0.06)); if (note < 40) { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(120, now); o.frequency.exponentialRampToValueAtTime(52, now + 0.12); o.connect(g).connect(out); o.start(now); o.stop(now + 0.2); return; } const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length); const src = ctx.createBufferSource(); src.buffer = buffer; const filter = ctx.createBiquadFilter(); filter.type = note < 42 ? "bandpass" : "highpass"; filter.frequency.value = note < 42 ? 180 : 5000; src.connect(filter).connect(g).connect(out); src.start(now); src.stop(now + 0.08); }
function previewGain(track: GeneratedTrack, trackCount: number) { const mixScale = 1 / Math.sqrt(Math.max(1, trackCount)); if (track.drum) return 0.9 * mixScale; if (track.role === "bass") return 0.7 * mixScale; if (["pad", "chords"].includes(track.role)) return 0.5 * mixScale; if (track.role === "fx" || track.role === "texture") return 0.38 * mixScale; return 0.56 * mixScale; }
function previewDuration(tracks: GeneratedTrack[], bpm: number) { const beats = Math.max(0, ...tracks.flatMap((t) => t.events.map((e) => e.time + e.duration))); return beats * 60 / bpm; }
function formatTime(seconds: number) { if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"; const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m}:${String(s).padStart(2, "0")}`; }
