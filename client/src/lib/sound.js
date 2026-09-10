/**
 * Feedback cues: two short synthesised tones (no audio assets to ship) plus a
 * haptic buzz where the device supports it. Both are opt-out via the header.
 */
let ctx = null;

function audioContext() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ frequency, duration = 0.12, type = 'sine', gain = 0.08, delay = 0 }) {
  const audio = audioContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const startAt = audio.currentTime + delay;

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startAt);
  amp.gain.setValueAtTime(gain, startAt);
  amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(amp).connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

export function playCorrect(enabled) {
  if (!enabled) return;
  tone({ frequency: 660, duration: 0.1 });
  tone({ frequency: 990, duration: 0.16, delay: 0.09 });
  vibrate(30);
}

export function playWrong(enabled) {
  if (!enabled) return;
  tone({ frequency: 220, duration: 0.22, type: 'sawtooth', gain: 0.05 });
  vibrate([25, 40, 25]);
}

export function playTick(enabled) {
  if (!enabled) return;
  tone({ frequency: 440, duration: 0.05, gain: 0.03 });
}

export function playFanfare(enabled) {
  if (!enabled) return;
  [523, 659, 784, 1047].forEach((frequency, i) =>
    tone({ frequency, duration: 0.18, delay: i * 0.12 }),
  );
  vibrate([40, 60, 40]);
}
