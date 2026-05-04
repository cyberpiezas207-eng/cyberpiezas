/**
 * scannerSound.ts
 * Genera sonidos de escáner usando la Web Audio API nativa del navegador.
 * No requiere archivos de audio externos.
 */

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

/**
 * Beep de éxito: tono corto y agudo (880 Hz, 150 ms)
 * Se reproduce cuando el escáner detecta un código correctamente.
 */
export function playScanSuccess(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);

  gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.15);

  oscillator.onended = () => ctx.close();
}

/**
 * Beep de error: tono grave descendente (400 → 200 Hz, 300 ms)
 * Se reproduce cuando el código escaneado no se encuentra.
 */
export function playScanError(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(400, ctx.currentTime);
  oscillator.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);

  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.3);

  oscillator.onended = () => ctx.close();
}
