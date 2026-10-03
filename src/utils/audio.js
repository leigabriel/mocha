import { CONFIG } from '../constants/index.js';

let audioCtx = null;
let lastSoundTime = 0;

export function playChime(intensity = 0.5) {
  if (!CONFIG.sound) return;
  const nowMs = performance.now();
  if (nowMs - lastSoundTime < 45) return;
  lastSoundTime = nowMs;

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const freqs = [3800, 5400, 7200, 8800];
    const gainVal = Math.min(0.024 * intensity, 0.040);

    freqs.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq + (Math.random() * 40 - 20), now);
      filter.Q.setValueAtTime(36, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const delay = idx * 0.002;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(gainVal / (idx + 1), now + delay + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + delay + 0.055);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.07);
    });
  } catch {
    // Audio unavailable
  }
}
