let ctx;

// صوت قصير + اهتزاز: البائع بيعرف إنه المسح نجح أو فشل بدون ما يطلع عالشاشة
export function beep(ok = true) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = ctx || new AC();
    if (ctx.state === "suspended") ctx.resume();
    const dur = ok ? 0.12 : 0.3;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = ok ? 1320 : 200;
    g.gain.setValueAtTime(0.09, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {
    /* الصوت مش متاح */
  }
  try {
    navigator.vibrate?.(ok ? 25 : [70, 40, 70]);
  } catch {
    /* مش متاح */
  }
}