import { useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  Check,
  Minus,
  Plus,
  X,
  Search,
  Trash2,
  ShoppingBag,
  ScanLine,
  Undo2,
} from "lucide-react";
import { recordSale, updateProduct } from "../services/dataService";
import { canManageProducts } from "../utils/roles";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import BarcodeCamera from "../components/BarcodeCamera";
import { beep } from "../utils/scanFeedback";
import { cameraSupported, preloadScanner, sameCode } from "../utils/scanner";
import "./SalePage.css";

const PAYMENT_METHODS = [
  { id: "CASH", label: "كاش", icon: Banknote },
  { id: "BANK_PALESTINE", label: "بنك فلسطين", icon: CreditCard },
  { id: "PALPAY", label: "بال بي", icon: Wallet },
  { id: "JAWWALPAY", label: "جوال بي", icon: Smartphone },
];

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2);
const unitLabel = (u) => (u === "kg" ? "كغ" : "قطعة");
const clampQty = (v, max) => Math.max(0, Math.min(max, +v.toFixed(3)));

function RowSkeleton() {
  return (
    <li className="sp-row">
      <div style={{ flex: 1 }}>
        <div className="sp-sk" style={{ width: "55%", height: 14, marginBottom: 8 }} />
        <div className="sp-sk" style={{ width: "35%", height: 11 }} />
      </div>
      <div className="sp-sk" style={{ width: 40, height: 40, borderRadius: "50%" }} />
    </li>
  );
}

function ProductRow({ p, qty, mode, raw, onStep, onType, onMode }) {
  const isKg = p.unit === "kg";
  const out = p.quantity <= 0;
  const low = !out && p.quantity <= p.alertThreshold;
  const shown = raw ?? (qty ? String(mode === "shekel" ? +(qty * p.sellPrice).toFixed(2) : qty) : "");

  return (
    <li className={`sp-row${qty > 0 ? " is-in" : ""}${out ? " is-out" : ""}`}>
      <div className="sp-row-info">
        <div className="sp-row-name">{p.name}</div>
        <div className="sp-row-meta">
          <span>
            ₪{p.sellPrice} / {unitLabel(p.unit)}
          </span>
          <span className={out || low ? "sp-stock sp-stock--low" : "sp-stock"}>
            {out ? "نفد" : `متبقي ${p.quantity}`}
          </span>
        </div>
      </div>

      {out ? null : qty === 0 ? (
        <button className="sp-add" onClick={() => onStep(p, 1)} aria-label={`إضافة ${p.name}`}>
          <Plus size={18} />
        </button>
      ) : (
        <div className="sp-ctl">
          <div className="sp-stepper">
            <button onClick={() => onStep(p, -1)} aria-label="تقليل">
              <Minus size={16} />
            </button>
            {isKg ? (
              <input
                type="number"
                inputMode="decimal"
                dir="ltr"
                className="sp-kg-input"
                value={shown}
                onChange={(e) => onType(p, e.target.value)}
                aria-label={mode === "shekel" ? "المبلغ بالشيكل" : "الوزن بالكيلو"}
              />
            ) : (
              <span className="sp-qty">{qty}</span>
            )}
            <button className="is-plus" onClick={() => onStep(p, 1)} disabled={qty >= p.quantity} aria-label="زيادة">
              <Plus size={16} />
            </button>
          </div>
          {isKg && (
            <div className="sp-unit-toggle" role="group" aria-label="وحدة الإدخال">
              <button className={mode === "kg" ? "on" : ""} onClick={() => onMode(p, "kg")}>
                كغ
              </button>
              <button className={mode === "shekel" ? "on" : ""} onClick={() => onMode(p, "shekel")}>
                ₪
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// موبايل/تابلت: التسجيل بيطلع كنافذة سفلية. ديسكتوب: عمود ثابت
function useIsMobile() {
  const query = "(max-width: 967px)";
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

// ربط باركود جديد بمنتج موجود (للمدير والمالك)
function LinkSheet({ code, products, busy, onPick, onClose }) {
  const [q, setQ] = useState("");
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products
      .filter((p) => !t || (p.name || "").toLowerCase().includes(t))
      .sort((a, b) => Number(!!a.barcode) - Number(!!b.barcode));
  }, [products, q]);

  return (
    <div className="sp-ov" onMouseDown={() => !busy && onClose()}>
      <div className="sp-lk" role="dialog" aria-modal="true" aria-label="ربط الباركود" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sp-lk-head">
          <div>
            <h2>اربط الباركود بمنتج</h2>
            <bdi>{code}</bdi>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن المنتج..." autoFocus />
        <ul>
          {list.map((p) => (
            <li key={p.id}>
              <button disabled={busy} onClick={() => onPick(p)}>
                <span>{p.name}</span>
                <small>{p.barcode ? "رح يتبدّل باركوده" : "بدون باركود"}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function SalePage({ token, role, mainProducts, productsLoading, refreshProducts, onApiError }) {
  const [cart, setCart] = useState({});
  const [kgMode, setKgMode] = useState({});
  const [rawInput, setRawInput] = useState({});
  const [query, setQuery] = useState("");
  const [isDebt, setIsDebt] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [payment, setPayment] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [toast, setToast] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const isMobile = useIsMobile();
  const [scanQty, setScanQty] = useState("1");
  const [lastScan, setLastScan] = useState(null);
  const [unknownCode, setUnknownCode] = useState(null);
  const [linking, setLinking] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const camSupported = useMemo(() => cameraSupported(), []);
  useEffect(() => {
    if (camSupported) preloadScanner();
  }, [camSupported]);
  const canLink = canManageProducts(role);
  const nameRef = useRef(null);
  const toastTimer = useRef(null);

  const items = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = mainProducts.find((p) => p.id === id);
          return product ? { id, qty, product, line: qty * product.sellPrice } : null;
        })
        .filter(Boolean),
    [cart, mainProducts]
  );
  const total = items.reduce((sum, i) => sum + i.line, 0);

  const sheetOpen = checkoutOpen && isMobile && items.length > 0;
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e) => e.key === "Escape" && setCheckoutOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? mainProducts.filter((p) => (p.name || "").toLowerCase().includes(q)) : mainProducts;
  }, [mainProducts, query]);

  function flash(type, text) {
    setToast({ type, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), type === "danger" ? 4000 : 2600);
  }

  function setQty(id, qty) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty > 0) next[id] = qty;
      else delete next[id];
      return next;
    });
  }

  function clearRaw(id) {
    setRawInput((r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });
  }

  function step(p, dir) {
    const size = p.unit === "kg" ? 0.5 : 1;
    clearRaw(p.id);
    setQty(p.id, clampQty((cart[p.id] || 0) + dir * size, p.quantity));
  }

  function typeKg(p, text) {
    setRawInput((r) => ({ ...r, [p.id]: text }));
    const val = parseFloat(text) || 0;
    const kg = kgMode[p.id] === "shekel" ? (p.sellPrice > 0 ? val / p.sellPrice : 0) : val;
    setQty(p.id, clampQty(kg, p.quantity));
  }

  function changeMode(p, mode) {
    clearRaw(p.id);
    setKgMode((m) => ({ ...m, [p.id]: mode }));
  }

  // ===== مسح الباركود =====
  function addScanned(p) {
    const n = parseFloat(scanQty) > 0 ? parseFloat(scanQty) : 1;
    const prev = cart[p.id] || 0;
    const next = clampQty(prev + n, p.quantity);
    if (next <= prev) {
      beep(false);
      flash("danger", p.quantity <= 0 ? `${p.name} نفد من المخزون` : `المتوفر من ${p.name}: ${p.quantity} بس`);
      return;
    }
    clearRaw(p.id);
    setQty(p.id, next);
    setLastScan({ id: p.id, name: p.name, added: +(next - prev).toFixed(3), prev, unit: p.unit, line: (next - prev) * p.sellPrice });
    setUnknownCode(null);
    setScanQty("1");
    beep(true);
  }

  function handleScan(raw) {
    const code = String(raw).trim();
    if (!code) return;
    const p = mainProducts.find((x) => x.barcode && sameCode(x.barcode, code));
    if (p) return addScanned(p);
    beep(false);
    setLastScan(null);
    setUnknownCode(code);
  }

  // قارئ الباركود لما يكون حقل البحث مركّز: الكود بيوصل للحقل، وEnter بيضيفه للفاتورة
  function onSearchKey(e) {
    if (e.key !== "Enter") return;
    const code = query.trim();
    if (!code) return;
    const known = mainProducts.some((x) => x.barcode && sameCode(x.barcode, code));
    if (known || /^\d{6,}$/.test(code)) {
      e.preventDefault();
      handleScan(code);
      setQuery("");
    }
  }

  function undoScan() {
    if (!lastScan) return;
    clearRaw(lastScan.id);
    setQty(lastScan.id, lastScan.prev);
    setLastScan(null);
  }

  async function linkBarcode(p) {
    setLinkBusy(true);
    try {
      await updateProduct(
        p.id,
        {
          name: p.name,
          buyPrice: Number.isFinite(p.buyPrice) ? p.buyPrice : 0,
          sellPrice: p.sellPrice,
          quantity: p.quantity,
          unit: p.unit,
          alertThreshold: p.alertThreshold,
          barcode: unknownCode,
        },
        token
      );
      setLinking(false);
      addScanned(p);
      flash("success", `تم ربط الباركود بـ ${p.name}`);
      await refreshProducts();
    } catch (err) {
      if (err?.code !== "SESSION_EXPIRED") flash("danger", err.message || "ما قدرنا نربط الباركود، حاول مرة ثانية.");
      else onApiError?.(err);
    } finally {
      setLinkBusy(false);
    }
  }

  useBarcodeScanner(handleScan, { enabled: !linking && !camera });

  function resetAll() {
    setCart({});
    setKgMode({});
    setRawInput({});
    setCustomerName("");
    setNotes("");
    setIsDebt(false);
    setPayment("CASH");
    setNameError(false);
    setCheckoutOpen(false);
    setLastScan(null);
    setUnknownCode(null);
  }

  async function handleConfirm() {
    if (items.length === 0 || confirming) return;
    if (isDebt && !customerName.trim()) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }
    setConfirming(true);
    try {
      await recordSale(
        {
          customerName: customerName.trim() || null,
          isDebt,
          paymentMethod: isDebt ? null : payment,
          items: items.map((i) => ({ productId: i.id, qty: i.qty, unitPrice: i.product.sellPrice })),
          notes: notes.trim() || null,
          total,
        },
        token
      );
      flash("success", isDebt ? "تم تسجيل البيع كدين" : "تم تسجيل البيع بنجاح");
      resetAll();
      await refreshProducts();
    } catch (err) {
      if (err?.code !== "SESSION_EXPIRED") flash("danger", err.message || "حصل خطأ غير متوقع، حاول مرة ثانية.");
      else onApiError?.(err);
    } finally {
      setConfirming(false);
    }
  }

  const showSkeleton = productsLoading && mainProducts.length === 0;

  return (
    <div className="sp-page">
      {toast && (
        <div className={`sp-toast sp-toast--${toast.type}`} role="status">
          {toast.text}
        </div>
      )}

      {/* ===== المنتجات ===== */}
      <section className="sp-main">
        <div className="sp-scanbar">
          <div className="sp-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="ابحث عن منتج أو امسح الباركود..."
              aria-label="بحث عن منتج أو مسح باركود"
            />
            {query && (
              <button className="sp-search-x" onClick={() => setQuery("")} aria-label="مسح البحث">
                <X size={16} />
              </button>
            )}
          </div>
          <label className={`sp-qtybox${scanQty !== "1" && scanQty !== "" ? " is-set" : ""}`}>
            <span>×</span>
            <input
              type="number"
              inputMode="decimal"
              dir="ltr"
              min="0"
              step="any"
              value={scanQty}
              onChange={(e) => setScanQty(e.target.value)}
              aria-label="كمية الصنف اللي رح تمسحه"
            />
          </label>
          {camSupported && (
            <button className="sp-cam" onClick={() => setCamera(true)} aria-label="مسح بالكاميرا">
              <ScanLine size={20} />
            </button>
          )}
        </div>

        {lastScan && (
          <div className="sp-scan-ok" role="status">
            <Check size={16} />
            <span className="sp-scan-name">
              <b>{lastScan.name}</b> × {lastScan.added}
              {lastScan.unit === "kg" ? " كغ" : ""}
            </span>
            <span className="sp-scan-line">₪{fmt(lastScan.line)}</span>
            <button onClick={undoScan}>
              <Undo2 size={14} />
              تراجع
            </button>
          </div>
        )}
        {unknownCode && (
          <div className="sp-scan-bad" role="alert">
            <span>
              الباركود <bdi>{unknownCode}</bdi> مش مسجّل بأي منتج.
            </span>
            {canLink ? <button onClick={() => setLinking(true)}>ربطه بمنتج</button> : <small>بلّغ المدير ليضيفه.</small>}
            <button className="sp-scan-x" onClick={() => setUnknownCode(null)} aria-label="إغلاق">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="sp-listhead">
          <span>المنتجات</span>
          <span>{filtered.length} منتج</span>
        </div>

        <ul className="sp-list">
          {showSkeleton && Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}
          {!showSkeleton && mainProducts.length === 0 && <li className="sp-empty">ما في منتجات بعد.</li>}
          {!showSkeleton && mainProducts.length > 0 && filtered.length === 0 && (
            <li className="sp-empty">ما في منتج باسم "{query}".</li>
          )}
          {filtered.map((p) => (
            <ProductRow
              key={p.id}
              p={p}
              qty={cart[p.id] || 0}
              mode={kgMode[p.id] || "kg"}
              raw={rawInput[p.id]}
              onStep={step}
              onType={typeKg}
              onMode={changeMode}
            />
          ))}
        </ul>
      </section>

      {/* ===== الفاتورة ===== */}
      {sheetOpen && <div className="sp-backdrop" onClick={() => setCheckoutOpen(false)} />}
      <div
        className={`sp-cart${sheetOpen ? " is-open" : ""}`}
        role={sheetOpen ? "dialog" : undefined}
        aria-modal={sheetOpen ? true : undefined}
        aria-label={sheetOpen ? "إتمام البيع" : undefined}
      >
        <div className="sp-sheet-head">
          <h2>إتمام البيع</h2>
          <button onClick={() => setCheckoutOpen(false)} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="sp-panel">
          <div className={`sp-seg${isDebt ? " is-debt" : ""}`} role="radiogroup" aria-label="طريقة الدفع">
            <button role="radio" aria-checked={!isDebt} onClick={() => setIsDebt(false)}>
              دفع الآن
            </button>
            <button role="radio" aria-checked={isDebt} onClick={() => setIsDebt(true)}>
              دين
            </button>
          </div>

          <div className="sp-field">
            <label htmlFor="sp-name">
              اسم الزبون <em>{isDebt ? "(مطلوب)" : "(اختياري)"}</em>
            </label>
            <input
              id="sp-name"
              ref={nameRef}
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (e.target.value.trim()) setNameError(false);
              }}
              placeholder="اكتب اسم الزبون..."
              aria-invalid={nameError}
            />
            {nameError && <div className="sp-err">اسم الزبون لازم لتسجيل دين</div>}
          </div>

          {isDebt ? (
            <div className="sp-note">رح تتسجل هاي العملية كدين على اسم الزبون وتظهر بصفحة الديون.</div>
          ) : (
            <div className="sp-methods" role="radiogroup" aria-label="وسيلة الدفع">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    role="radio"
                    aria-checked={payment === m.id}
                    className={payment === m.id ? "on" : ""}
                    onClick={() => setPayment(m.id)}
                  >
                    <Icon size={16} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="sp-field">
            <label htmlFor="sp-notes">
              ملاحظات <em>(اختياري)</em>
            </label>
            <textarea
              id="sp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظة على هاي العملية..."
            />
          </div>
        </div>

        <div className="sp-receipt-wrap">
          <div className="sp-receipt">
            <div className="sp-r-head">
              <span>الفاتورة</span>
              {items.length > 0 && (
                <button className="sp-clear" onClick={resetAll}>
                  <Trash2 size={14} />
                  تفريغ
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="sp-r-empty">ما في أصناف بعد. اختار من القائمة.</div>
            ) : (
              <ul className="sp-r-list">
                {items.map((i) => (
                  <li key={i.id}>
                    <button
                      className="sp-r-x"
                      onClick={() => {
                        clearRaw(i.id);
                        setQty(i.id, 0);
                      }}
                      aria-label={`حذف ${i.product.name}`}
                    >
                      <X size={14} />
                    </button>
                    <div className="sp-r-name">
                      <div>{i.product.name}</div>
                      <small>
                        {i.qty} {unitLabel(i.product.unit)} × ₪{i.product.sellPrice}
                      </small>
                    </div>
                    <div className="sp-r-line">₪{fmt(i.line)}</div>
                  </li>
                ))}
              </ul>
            )}

            <div className="sp-r-total">
              <span>الإجمالي</span>
              <span>₪{fmt(total)}</span>
            </div>
          </div>
        </div>

        <div className="sp-confirm-wrap">
        <button
          className={`sp-confirm${isDebt ? " is-debt" : ""}`}
          onClick={handleConfirm}
          disabled={items.length === 0 || confirming}
        >
          <Check size={18} />
          {confirming ? "جاري التسجيل..." : isDebt ? "تسجيل كدين" : "تأكيد البيع"}
        </button>
        </div>
      </div>

      {camera && (
        <BarcodeCamera onDetect={handleScan} onClose={() => setCamera(false)}>
          <div className="sp-cam-sum">
            {lastScan ? (
              <div className="sp-scan-ok">
                <Check size={16} />
                <span className="sp-scan-name">
                  <b>{lastScan.name}</b> × {lastScan.added}
                </span>
                <span className="sp-scan-line">₪{fmt(lastScan.line)}</span>
                <button onClick={undoScan}>
                  <Undo2 size={14} />
                  تراجع
                </button>
              </div>
            ) : unknownCode ? (
              <div className="sp-scan-bad" role="alert">
                <span>
                  الباركود <bdi>{unknownCode}</bdi> مش مسجّل بأي منتج.
                </span>
              </div>
            ) : (
              <div className="sp-cam-hint">وجّه الكاميرا نحو الباركود</div>
            )}
            <div className="sp-cam-total">
              <span>
                {items.length} {items.length === 1 ? "صنف" : "أصناف"}
              </span>
              <b>₪{fmt(total)}</b>
            </div>
            <button
              className="sp-cam-done"
              onClick={() => {
                setCamera(false);
                if (items.length) setCheckoutOpen(true);
              }}
            >
              إنهاء المسح ومتابعة
            </button>
          </div>
        </BarcodeCamera>
      )}
      {linking && unknownCode && (
        <LinkSheet code={unknownCode} products={mainProducts} busy={linkBusy} onPick={linkBarcode} onClose={() => setLinking(false)} />
      )}

      {/* شريط سفلي بالموبايل */}
      {items.length > 0 && (
        <div className="sp-bar">
          <div>
            <div className="sp-bar-count">
              {items.length} {items.length === 1 ? "صنف" : "أصناف"}
            </div>
            <div className="sp-bar-total">₪{fmt(total)}</div>
          </div>
          <button onClick={() => setCheckoutOpen(true)}>
            <ShoppingBag size={17} />
            مراجعة وتأكيد
          </button>
        </div>
      )}
    </div>
  );
}