// أدوات مسح الباركود بالكاميرا: القارئ المدمج بالمتصفح إن وُجد، وإلا مكتبة ZXing (بتتحمّل عند الحاجة بس)

export const hasNativeDetector = () => typeof window !== "undefined" && "BarcodeDetector" in window;

// بنخلّي الزر ظاهر حتى على رابط غير آمن، عشان نشرح للمستخدم السبب بدل ما يختفي
export function cameraSupported() {
  if (typeof navigator === "undefined") return false;
  return !!navigator.mediaDevices?.getUserMedia || (typeof window !== "undefined" && window.isSecureContext === false);
}

// نفس تطبيع قاعدة البيانات (norm_barcode) بالضبط: UPC-A (12) و EAN-13 (13) و GTIN-14 = نفس الكود (padding لـ 14).
// أي كود ثاني بيضل حرفي، فالأكواد القصيرة (001 و 1) ما بتتصادم.
export function normCode(c) {
  const s = String(c ?? "").trim();
  return /^\d{12,14}$/.test(s) ? s.padStart(14, "0") : s;
}
export const sameCode = (a, b) => normCode(a) === normCode(b);

// فحص رقم التحقق (EAN-8 / UPC-A / EAN-13 / GTIN-14).
// true = سليم، false = قراءة غلط (أو كود مطبوع غلط)، null = مش من هالأنواع فما منقدر نحكم (أكواد داخلية/نصية).
export function gtinCheck(code) {
  const s = String(code ?? "").trim();
  if (!/^(\d{8}|\d{12,14})$/.test(s)) return null;
  const d = s.split("").map(Number);
  const check = d.pop();
  let sum = 0;
  for (let i = d.length - 1, w = 3; i >= 0; i--, w = 4 - w) sum += d[i] * w;
  return (10 - (sum % 10)) % 10 === check;
}

let zxingPromise = null;

// تحميل ZXing مرة وحدة وبالتوازي مع فتح الكاميرا (ما بنستنى)
export function loadZxing() {
  zxingPromise =
    zxingPromise ||
    Promise.all([import("@zxing/browser"), import("@zxing/library")])
      .then(([browser, lib]) => {
        const hints = new Map();
        hints.set(lib.DecodeHintType.POSSIBLE_FORMATS, [
          lib.BarcodeFormat.EAN_13,
          lib.BarcodeFormat.EAN_8,
          lib.BarcodeFormat.UPC_A,
          lib.BarcodeFormat.UPC_E,
          lib.BarcodeFormat.CODE_128,
          lib.BarcodeFormat.CODE_39,
          lib.BarcodeFormat.ITF,
        ]);
        return { BrowserMultiFormatReader: browser.BrowserMultiFormatReader, hints };
      })
      .catch((err) => {
        zxingPromise = null; // نسمح بمحاولة ثانية
        throw err;
      });
  return zxingPromise;
}

// تحميل مسبق وقت الخمول من أول ما تفتح الصفحة، فلما تضغط الكاميرا بتكون المكتبة جاهزة.
// ما بنعمله إذا الجهاز عنده قارئ مدمج، أو موفّر البيانات شغّال.
export function preloadScanner() {
  if (typeof window === "undefined" || hasNativeDetector() || navigator.connection?.saveData) return;
  const run = () => loadZxing().catch(() => {});
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}