import { useEffect, useRef } from "react";

// قارئات الباركود (USB / بلوتوث) بتشتغل كأنها كيبورد: بتكتب الكود بسرعة كبيرة وبتختم بـ Enter.
// بنميّزها عن الكتابة العادية بالسرعة (الفرق بين الحروف أقل من maxGap).
// بتتجاهل أي كتابة داخل حقل (اسم الزبون، ملاحظات...) عشان ما نخرّب عليه.
export function useBarcodeScanner(onScan, { enabled = true, minLength = 4, maxGap = 100 } = {}) {
  const cb = useRef(onScan);
  useEffect(() => {
    cb.current = onScan;
  });

  useEffect(() => {
    if (!enabled) return;
    let buf = "";
    let last = 0;

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;

      const now = Date.now();
      if (now - last > maxGap) buf = "";
      last = now;

      if (e.key === "Enter") {
        if (buf.length >= minLength) {
          e.preventDefault(); // عشان Enter ما يضغط زر مركّز (متل "تأكيد البيع")
          const code = buf;
          buf = "";
          cb.current(code);
        } else buf = "";
        return;
      }
      if (e.key.length === 1) buf += e.key;
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled, minLength, maxGap]);
}