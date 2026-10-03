import { CONFIG } from '../constants/index.js';

let audioCtx = null;
let lastSoundTime = 0;

export function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Auto-unlock audio on the first user interaction (touch/pointer/key)
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

export function playChime(intensity = 0.5) {
  if (!CONFIG.sound) return;
  const nowMs = performance.now();
  if (nowMs - lastSoundTime < 35) return;
  lastSoundTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Harmonic metallic frequencies audible on phones, laptops, and speakers
    const freqs = [1420, 2180, 3150, 4400];
    const baseVol = Math.max(0.04, Math.min(0.18 * intensity, 0.22));

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(baseVol, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    masterGain.connect(ctx.destination);

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq + (Math.random() * 30 - 15), now);

      const delay = idx * 0.003;
      const partVol = 1 / (idx + 1.2);
      oscGain.gain.setValueAtTime(0.0001, now + delay);
      oscGain.gain.linearRampToValueAtTime(partVol, now + delay + 0.003);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.12);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.14);
    });
  } catch {
    // Audio unavailable or blocked
  }
}
