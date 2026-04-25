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
    bark: () => {
      if (!on || !ensure()) return;
      playNoise(0.18, 600, 'bandpass', 0.3);
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.1);
      envelope(o, g, t, 0.005, 0.18, 0.12);
    },
    meow: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(720, t + 0.18);
      o.frequency.exponentialRampToValueAtTime(380, t + 0.36);
      envelope(o, g, t, 0.02, 0.18, 0.4);
    },
    laugh: () => {
      if (!on || !ensure()) return;
      const t0 = ctx.currentTime;
      [0, 0.09, 0.18, 0.27].forEach((dt, i) => {
        const t = t0 + dt;
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'triangle';
        const f = 380 + i * 60;
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.06);
        envelope(o, g, t, 0.005, 0.18, 0.07);
      });
    },
    oof: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.18);
      envelope(o, g, t, 0.01, 0.28, 0.22);
      playNoise(0.22, 400, 'lowpass', 0.12);
    },
    zap: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.18);
      envelope(o, g, t, 0.002, 0.22, 0.18);
    },
    drip: () => {
      if (!on || !ensure()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(2200, t);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.12);
      envelope(o, g, t, 0.002, 0.18, 0.18);
    },
    none: () => { /* silent */ },
  };

  /* List of presets for UI dropdowns */
  const PRESET_NAMES = [
    'found', 'pop', 'ding', 'chirp', 'splash',
    'puff', 'squeak', 'thud', 'miss', 'win',
    'bark', 'meow', 'laugh', 'oof', 'zap', 'drip',
    'none'
  ];

  /* Categorized library for the picker UI */
  const PRESET_CATEGORIES = [
    { label: 'Game feedback', sounds: ['found', 'miss', 'win', 'pop', 'ding'] },
    { label: 'Animal',        sounds: ['chirp', 'squeak', 'bark', 'meow'] },
    { label: 'Human',         sounds: ['laugh', 'oof'] },
    { label: 'Nature',        sounds: ['splash', 'puff', 'drip'] },
    { label: 'Sound FX',      sounds: ['thud', 'zap'] },
    { label: 'Silent',        sounds: ['none'] },
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

  /* ————————————————————————————————————————
     Compress an uploaded audio file into a tiny WAV data URL.
     Decodes → trims → mixes to mono → downsamples → 16-bit PCM.
     Defaults: max 1.2 s, 16 kHz mono ≈ 38 KB max.
  ———————————————————————————————————————— */
  async function compressAudio(file, opts = {}) {
    const maxDuration = opts.maxDuration ?? 1.2;
    const targetRate  = opts.targetRate  ?? 16000;
    if (!ensure()) throw new Error('AudioContext not available');

    const arrBuf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrBuf.slice(0));

    // Trim and mix to mono
    const trimSec = Math.min(maxDuration, decoded.duration);
    const trimSamples = Math.floor(trimSec * decoded.sampleRate);
    const numCh = decoded.numberOfChannels;
    const monoData = new Float32Array(trimSamples);
    for (let c = 0; c < numCh; c++) {
      const ch = decoded.getChannelData(c);
      for (let i = 0; i < trimSamples; i++) monoData[i] += (ch[i] || 0) / numCh;
    }

    // Downsample to targetRate (linear interpolation)
    const ratio = decoded.sampleRate / targetRate;
    const outLen = Math.max(1, Math.floor(monoData.length / ratio));
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const srcIdx = i * ratio;
      const i0 = Math.floor(srcIdx);
      const i1 = Math.min(i0 + 1, monoData.length - 1);
      const frac = srcIdx - i0;
      out[i] = monoData[i0] * (1 - frac) + monoData[i1] * frac;
    }

    const wavBytes = encodeWav16(out, targetRate);
    const blob = new Blob([wavBytes], { type: 'audio/wav' });
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
    return {
      dataUrl,
      sizeBytes: wavBytes.byteLength,
      durationSec: trimSec,
      originalDurationSec: decoded.duration,
      originalSizeBytes: file.size,
    };
  }

  function encodeWav16(samples, sampleRate) {
    const numCh = 1, bps = 2;
    const dataLen = samples.length * bps;
    const buf = new ArrayBuffer(44 + dataLen);
    const v = new DataView(buf);
    const setStr = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
    setStr(0, 'RIFF');
    v.setUint32(4, 36 + dataLen, true);
    setStr(8, 'WAVE');
    setStr(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);                     // PCM
    v.setUint16(22, numCh, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * numCh * bps, true);
    v.setUint16(32, numCh * bps, true);
    v.setUint16(34, 16, true);
    setStr(36, 'data');
    v.setUint32(40, dataLen, true);
    for (let i = 0, off = 44; i < samples.length; i++, off += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Uint8Array(buf);
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
    PRESET_CATEGORIES,
    compressAudio,
    freesoundSearchUrl,
    haptic,
    SFX,
  };
})();
