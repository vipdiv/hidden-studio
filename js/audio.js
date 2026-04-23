/* ═══════════════════════════════════════════════════
   AUDIO — generated SFX + custom sound import
═══════════════════════════════════════════════════ */

window.SFX = (function() {
  let ctx = null;
  let on = true;
  const customBuffers = {}; // key -> AudioBuffer

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) { return false; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return !!ctx;
  }

  function setOn(v) { on = v; }
  function isOn() { return on; }

  /* ————————————————————————————————————————
     Generated sound helpers
  ———————————————————————————————————————— */
  function envelope(osc, gain, t, attack=0.02, peak=0.2, decay=0.28) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  function playNoise(duration, filterFreq, filterType = 'lowpass', peakGain = 0.2) {
    const t = ctx.currentTime;
    const bufSize = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.25));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.setValueAtTime(filterFreq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(peakGain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filt).connect(g).connect(ctx.destination);
    src.start(t);
    src.stop(t + duration);
  }

  /* ————————————————————————————————————————
     The SFX library — named presets
  ———————————————————————————————————————— */
  const SFX = {
    found: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 0.12);
      envelope(o, g, t, 0.02, 0.22, 0.28);
      const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(1320, t + 0.06);
      g2.gain.setValueAtTime(0.0001, t + 0.06);
      g2.gain.exponentialRampToValueAtTime(0.1, t + 0.08);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o2.connect(g2).connect(ctx.destination);
      o2.start(t + 0.06); o2.stop(t + 0.24);
    },
    miss: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
      envelope(o, g, t, 0.01, 0.15, 0.17);
    },
    win: () => {
      if (!on || !ensure()) return;
      const notes = [523, 659, 784, 1047];
      const t0 = ctx.currentTime;
      notes.forEach((f, i) => {
        const t = t0 + i * 0.12;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t);
        envelope(o, g, t, 0.02, 0.22, 0.35);
      });
    },
    chirp: () => {
      if (!on || !ensure()) return;
      const t0 = ctx.currentTime;
      [1800, 2400, 1800].forEach((f, i) => {
        const t = t0 + i * 0.08;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t);
        envelope(o, g, t, 0.005, 0.15, 0.08);
      });
    },
    splash: () => {
      if (!on || !ensure()) return;
      playNoise(0.3, 1200, 'bandpass', 0.25);
    },
    puff: () => {
      if (!on || !ensure()) return;
      playNoise(0.5, 300, 'lowpass', 0.2);
    },
    squeak: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(1400, t);
      o.frequency.exponentialRampToValueAtTime(2200, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
      envelope(o, g, t, 0.005, 0.08, 0.1);
    },
    pop: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(600, t);
      o.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
      envelope(o, g, t, 0.005, 0.18, 0.08);
    },
    ding: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1760, t);
      envelope(o, g, t, 0.005, 0.18, 0.4);
    },
    thud: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
      envelope(o, g, t, 0.005, 0.3, 0.15);
    },
    none: () => { /* silent */ },
  };

  /* List of presets for UI dropdowns */
  const PRESET_NAMES = [
    'found', 'pop', 'ding', 'chirp', 'splash',
    'puff', 'squeak', 'thud', 'miss', 'win', 'none'
  ];

  /* ————————————————————————————————————————
     Custom sound playback (imported MP3/WAV)
  ———————————————————————————————————————— */
  async function loadCustomSound(key, dataUrl) {
    if (!ensure()) return false;
    try {
      const response = await fetch(dataUrl);
      const arrBuf = await response.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrBuf);
      customBuffers[key] = audioBuf;
      return true;
    } catch(e) {
      console.warn('Could not load custom sound', key, e);
      return false;
    }
  }

  function playCustom(key) {
    if (!on || !ensure() || !customBuffers[key]) return false;
    const src = ctx.createBufferSource();
    src.buffer = customBuffers[key];
    const g = ctx.createGain();
    g.gain.value = 0.8;
    src.connect(g).connect(ctx.destination);
    src.start();
    return true;
  }

  /* Play by name — checks custom first, falls back to preset */
  function play(nameOrKey) {
    if (!on) return;
    ensure();
    if (customBuffers[nameOrKey]) {
      playCustom(nameOrKey);
    } else if (SFX[nameOrKey]) {
      SFX[nameOrKey]();
    }
  }

  /* Freesound search URL helper */
  function freesoundSearchUrl(query) {
    return `https://freesound.org/search/?q=${encodeURIComponent(query)}`;
  }

  /* Haptic (phone vibration) — co-located with audio for convenience */
  function haptic(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  return {
    ensure, setOn, isOn,
    play,
    loadCustomSound,
    playCustom,
    PRESET_NAMES,
    freesoundSearchUrl,
    haptic,
    SFX,
  };
})();
