import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { hasNativeDetector, loadZxing } from "../utils/scanner";
import "./BarcodeCamera.css";

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"];

export default function BarcodeCamera({ onDetect, onClose, continuous = true, children }) {
  const videoRef = useRef(null);
  const detectRef = useRef(onDetect);
  const closeRef = useRef(onClose);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(true);

  useEffect(() => {
    detectRef.current = onDetect;
    closeRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let stream;
    let timer;
    let controls;
    let stopped = false;
    let lastCode = "";
    let lastAt = 0;

    // نفس الكود خلال 2.5 ثانية = نفس المسحة (ما نضيفه مرتين)
    const emit = (code) => {
      const now = Date.now();
      if (!code || (code === lastCode && now - lastAt < 2500)) return false;
      lastCode = code;
      lastAt = now;
      detectRef.current(code);
      if (!continuous) closeRef.current();
      return true;
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("الكاميرا بتشتغل بس على رابط آمن (HTTPS).");
          setPreparing(false);
          return;
        }
        const streamPromise = navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            advanced: [{ focusMode: "continuous" }],
          },
          audio: false,
        });
        const native = hasNativeDetector();
        const enginePromise = native ? window.BarcodeDetector.getSupportedFormats() : loadZxing();

        stream = await streamPromise;
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        const engine = await enginePromise;
        if (stopped) return;
        setPreparing(false);

        if (native) {
          const detector = new window.BarcodeDetector({ formats: NATIVE_FORMATS.filter((f) => engine.includes(f)) });
          const tick = async () => {
            if (stopped) return;
            let wait = 150;
            try {
              const found = await detector.detect(video);
              if (emit(found[0]?.rawValue)) wait = 900;
            } catch {
            }
            timer = setTimeout(tick, wait);
          };
          tick();
        } else {
          const reader = new engine.BrowserMultiFormatReader(engine.hints, {
            delayBetweenScanAttempts: 120,
            delayBetweenScanSuccess: 900,
          });
          controls = await reader.decodeFromStream(stream, video, (result) => {
            if (result) emit(result.getText());
          });
          if (stopped) controls.stop();
        }
      } catch (e) {
        setPreparing(false);
        setError(
          e?.name === "NotAllowedError"
            ? "ما عطيت إذن استخدام الكاميرا."
            : e?.name === "NotFoundError"
              ? "ما لقينا كاميرا على هاد الجهاز."
              : "ما قدرنا نشغّل الكاميرا أو القارئ، جرّب مرة ثانية."
        );
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      try {
        controls?.stop();
      } catch {
        /* ignore */
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [continuous]);

  return (
    <div className="bc-overlay" role="dialog" aria-modal="true" aria-label="مسح الباركود بالكاميرا">
      <div className="bc-sheet">
        <div className="bc-view">
          <video ref={videoRef} muted playsInline />
          <div className="bc-frame" aria-hidden="true">
            <i />
          </div>
          <button className="bc-x" onClick={onClose} aria-label="إغلاق الكاميرا">
            <X size={20} />
          </button>
          {preparing && !error && <div className="bc-prep">جاري تجهيز القارئ...</div>}
          {error && <div className="bc-err">{error}</div>}
        </div>
        <div className="bc-body">{children}</div>
      </div>
    </div>
  );
}