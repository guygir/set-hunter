/* sounds.js — Set Hunter lo-fi procedural audio via Web Audio API
   No external files — all sounds synthesised at runtime.
   Ambient: lo-fi beat at 80 BPM (kick / snare / hi-hat / bass / chord pads)
   with tape-wobble LFO and state-reactive variations. */

'use strict';

const Sounds = (() => {
  let ctx = null;
  let masterGain = null;
  let _musicGain = null;
  let _mediaSrc = null;
  let _muted = false;

  /* ── Ambient state tracker (SFX only — no procedural beat engine) ── */
  let currentAmbState = 'normal';

  /* ── init ────────────────────────────────────────────────────── */
  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = _muted ? 0 : 2.0;
      masterGain.connect(ctx.destination);

      // Route MP3 music through the same AudioContext as SFX so both mix reliably.
      // (Separate <audio> element output + Web Audio destination can fail to blend on some setups.)
      const el = _getTrackEl();
      if (!_mediaSrc) {
        _mediaSrc = ctx.createMediaElementSource(el);
        _musicGain = ctx.createGain();
        _musicGain.gain.value = _muted ? 0 : 0.22;
        _mediaSrc.connect(_musicGain);
        _musicGain.connect(ctx.destination);
      }

      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      _playFile(_trackFile || DEFAULT_TRACK);
    } catch (e) { ctx = null; }
  }

  /* ── Ambient state tracker ───────────────────────────────────── */
  function setAmbientState(state) {
    currentAmbState = state;
  }

  /* ── Mute ────────────────────────────────────────────────────── */
  function setMuted(muted) {
    _muted = muted;
    if (masterGain && ctx) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(muted ? 0 : 2.0, ctx.currentTime);
    }
    if (_musicGain && ctx) {
      _musicGain.gain.cancelScheduledValues(ctx.currentTime);
      _musicGain.gain.setValueAtTime(muted ? 0 : 0.22, ctx.currentTime);
    }
    if (_trackEl) {
      if (muted) _trackEl.pause();
      else _trackEl.play().catch(() => {});
    }
  }

  function isMuted() { return _muted; }

  /** Warm graph + resume — call on the same user gesture as opening a pack when possible. */
  function prime() {
    if (!ctx) return;
    const kick = () => {
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = 0;
        o.connect(g);
        g.connect(masterGain);
        o.start();
        o.stop(ctx.currentTime + 0.001);
      } catch (e) { /* ignore */ }
    };
    if (ctx.state === 'running') kick();
    else {
      const pr = ctx.resume();
      if (pr !== undefined && typeof pr.then === 'function') pr.then(kick).catch(kick);
      else kick();
    }
  }

  /* ── Generic helpers ─────────────────────────────────────────── */
  function t0() { return ctx.currentTime + 0.028; }

  function osc(type, freq, startTime, duration, gainPeak, dest) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    o.connect(g); g.connect(dest);
    o.start(startTime); o.stop(startTime + duration + 0.02);
    return o;
  }

  function whiteNoise(startTime, duration, gainPeak, bpFreq, dest) {
    const bufLen = Math.ceil(ctx.sampleRate * duration);
    const buf  = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5);
    }
    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = bpFreq; filt.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainPeak, startTime);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    src.connect(filt); filt.connect(g); g.connect(dest);
    src.start(startTime);
    return src;
  }

  /* ── SFX ─────────────────────────────────────────────────────── */
  function playPackShake() {
    const t = t0();
    const thump = ctx.createOscillator();
    const tg = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(120, t);
    thump.frequency.exponentialRampToValueAtTime(58, t + 0.16);
    tg.gain.setValueAtTime(0.18, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    thump.connect(tg); tg.connect(masterGain);
    thump.start(t); thump.stop(t + 0.2);
    whiteNoise(t + 0.01, 0.16, 0.11, 2400, masterGain);
    whiteNoise(t + 0.06, 0.09, 0.06, 5200, masterGain);
  }

  function playPackOpen() {
    const t = t0();
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(180, t);
    o1.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    g1.gain.setValueAtTime(0.55, t);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o1.connect(g1); g1.connect(masterGain);
    o1.start(t); o1.stop(t + 0.35);
    whiteNoise(t + 0.05, 0.28, 0.35, 3200, masterGain);
    whiteNoise(t + 0.1,  0.18, 0.18, 8000, masterGain);
  }

  function playCardFlip() {
    const t = t0();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(980, t + 0.07);
    o.frequency.exponentialRampToValueAtTime(660, t + 0.14);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + 0.2);
    whiteNoise(t, 0.06, 0.15, 5000, masterGain);
  }

  function playLegendary() {
    const t = t0();
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(880, t);
    shimmer.frequency.exponentialRampToValueAtTime(3520, t + 0.6);
    sg.gain.setValueAtTime(0.14, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    shimmer.connect(sg); sg.connect(masterGain);
    shimmer.start(t); shimmer.stop(t + 0.7);
    const revGain = ctx.createGain();
    revGain.gain.value = 0.22;
    revGain.connect(masterGain);
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, i) => {
      const delay = i * 0.07;
      osc('triangle', freq,     t + delay,        1.6, 0.14, revGain);
      osc('sine',     freq * 2, t + delay + 0.02, 1.2, 0.05, revGain);
    });
  }

  /** Ace — rarest drop: longer, louder, fuller fanfare than legendary */
  function playAce() {
    const t = t0();
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(196, t);
    shimmer.frequency.exponentialRampToValueAtTime(4224, t + 0.92);
    sg.gain.setValueAtTime(0.24, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
    shimmer.connect(sg); sg.connect(masterGain);
    shimmer.start(t); shimmer.stop(t + 1.1);

    const body = ctx.createGain();
    body.gain.value = 0.38;
    body.connect(masterGain);
    [65.41, 98, 130.81, 164.81, 196].forEach((freq, i) => {
      const d = i * 0.035;
      osc('triangle', freq, t + d, 1.45, 0.17, body);
      osc('sine', freq * 2, t + d + 0.02, 1.1, 0.08, body);
    });

    const highs = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98, 2093];
    highs.forEach((freq, i) => {
      const d = 0.1 + i * 0.048;
      osc('triangle', freq, t + d, 0.62, 0.12, masterGain);
      osc('sine', freq * 2, t + d + 0.015, 0.38, 0.065, masterGain);
    });

    [2093, 2637, 3136].forEach((freq, i) => {
      osc('sine', freq, t + 0.62 + i * 0.07, 0.55, 0.1, masterGain);
    });

    whiteNoise(t + 0.015, 0.42, 0.26, 6800, masterGain);
    whiteNoise(t + 0.35, 0.28, 0.14, 11200, masterGain);
  }

  function playPity() {
    const t = t0();
    const shimmer = ctx.createOscillator();
    const sg = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(1760, t);
    shimmer.frequency.exponentialRampToValueAtTime(5280, t + 0.5);
    sg.gain.setValueAtTime(0.16, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    shimmer.connect(sg); sg.connect(masterGain);
    shimmer.start(t); shimmer.stop(t + 0.6);
    [392, 494, 587, 784].forEach((freq, i) => {
      osc('triangle', freq, t + i * 0.06, 1.2, 0.12, masterGain);
    });
  }

  function playCoin() {
    const t = t0();
    osc('triangle', 1400, t,        0.22, 0.28, masterGain);
    osc('sine',      700, t + 0.04, 0.18, 0.12, masterGain);
  }

  function playNegative() {
    const t = t0();
    osc('square', 220, t,       0.15, 0.18, masterGain);
    osc('square', 180, t + 0.1, 0.15, 0.16, masterGain);
  }

  function playComplete() {
    const t = t0();
    const melody = [
      [523.25, 0], [523.25, .14], [523.25, .28],
      [415.30, .42], [622.25, .52], [523.25, .76],
      [415.30, .90], [622.25, 1.0], [523.25, 1.24],
    ];
    melody.forEach(([freq, delay]) => {
      osc('square', freq, t + delay, 0.22, 0.10, masterGain);
    });
  }

  function playDayPass() {
    const t = t0();
    osc('sine', 660, t,        0.35, 0.14, masterGain);
    osc('sine', 880, t + 0.13, 0.35, 0.11, masterGain);
  }

  function playAuction() {
    const t = t0();
    [440, 550, 660].forEach((freq, i) => {
      osc('triangle', freq, t + i * 0.09, 0.18, 0.12, masterGain);
    });
  }

  function playAuctionSold() {
    const t = t0();
    osc('triangle', 2200, t, 0.14, 0.20, masterGain);
    [523, 659, 784, 1047].forEach((freq, i) => {
      osc('sine', freq, t + 0.12 + i * 0.07, 0.32, 0.10, masterGain);
    });
  }

  function playNpcAppear() {
    const t = t0();
    osc('sine', 523, t,        0.20, 0.16, masterGain);
    osc('sine', 659, t + 0.11, 0.28, 0.16, masterGain);
  }

  function playSellAll() {
    const t = t0();
    [1400, 1200, 1050, 900].forEach((freq, i) => {
      osc('triangle', freq, t + i * 0.05, 0.20, 0.14, masterGain);
    });
  }

  function playTutorialStep() {
    const t = t0();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.08);
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(masterGain);
    o.start(t); o.stop(t + 0.14);
  }

  /* ── Track mode (MP3 files per set) ─────────────────────────── */
  // Track files live in assets/audio/. One per biome set:
  //   home    → Morning_at_the_Gate     (lo-fi farm morning)
  //   aquatic → Tide_Pool_Mornings      (calm coastal ambient)
  //   desert  → The_Fox_On_The_Ridge    (desert folk/ambient)
  //   savanna → Where_the_Lion_Yawns    (african ambient)
  const SET_TRACKS = {
    home:    'Morning_at_the_Gate',
    aquatic: 'Tide_Pool_Mornings',
    desert:  'The_Fox_On_The_Ridge',
    savanna: 'Where_the_Lion_Yawns',
  };
  const DEFAULT_TRACK = 'Morning_at_the_Gate';

  let _trackEl   = null;
  let _trackFile = null;   // currently loaded filename (without .mp3)

  function _getTrackEl() {
    if (!_trackEl) {
      _trackEl = document.createElement('audio');
      _trackEl.loop = true;
      _trackEl.volume = 1;
      document.body.appendChild(_trackEl);
    }
    return _trackEl;
  }

  function _playFile(filename) {
    if (_trackFile === filename) return;
    _trackFile = filename;
    const el = _getTrackEl();
    el.src = `assets/audio/${filename}.mp3`;
    if (!_muted) el.play().catch(() => {});
  }

  // Call this whenever the active set changes (or before a set is selected)
  function setSet(setId) {
    const filename = SET_TRACKS[setId] || DEFAULT_TRACK;
    _playFile(filename);
  }

  /* ── Public API ──────────────────────────────────────────────── */
  function _dispatch(name) {
    switch (name) {
      case 'packShake':   playPackShake();    break;
      case 'packOpen':    playPackOpen();     break;
      case 'cardFlip':   playCardFlip();     break;
      case 'legendary':  playLegendary();    break;
      case 'ace':        playAce();          break;
      case 'pity':       playPity();         break;
      case 'coin':       playCoin();         break;
      case 'negative':   playNegative();     break;
      case 'complete':   playComplete();     break;
      case 'dayPass':    playDayPass();      break;
      case 'auction':    playAuction();      break;
      case 'auctionSold': playAuctionSold(); break;
      case 'npcAppear':  playNpcAppear();    break;
      case 'sellAll':    playSellAll();      break;
      case 'tutStep':    playTutorialStep(); break;
    }
  }

  function play(name) {
    if (!ctx) return;
    if (_muted) return;
    const run = () => {
      try { _dispatch(name); } catch (e) { console.warn('SFX error [' + name + ']:', e); }
    };
    if (ctx.state === 'running') {
      run();
    } else {
      const pr = ctx.resume();
      if (pr !== undefined && typeof pr.then === 'function') {
        pr.then(run).catch(() => run());
      } else {
        run();
      }
    }
  }

  // Keep AudioContext alive: resume it on any user click so SFX never miss.
  // This handles browsers that re-suspend the context after inactivity.
  if (typeof document !== 'undefined') {
    document.addEventListener('click', () => {
      if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    }, { passive: true, capture: true });
  }

  return { init, play, prime, setAmbientState, setMuted, isMuted, setSet };
})();
