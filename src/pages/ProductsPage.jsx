import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, AlertTriangle, PackageX, ScanLine, Barcode } from "lucide-react";
import { addProduct, updateProduct, deleteProduct } from "../services/dataService";
import { canManageProducts } from "../utils/roles";
import BarcodeCamera from "../components/BarcodeCamera";
import { cameraSupported, preloadScanner, sameCode } from "../utils/scanner";
import "./ProductsPage.css";

const emptyForm = { name: "", buyPrice: "", sellPrice: "", quantity: "", unit: "piece", alertThreshold: "", barcode: "" };
const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "low", label: "مخزون منخفض" },
  { id: "out", label: "نفد" },
  { id: "nobc", label: "بدون باركود" },
];

const unitLabel = (u) => (u === "kg" ? "كغ" : "قطعة");
const money = (n) => (Number.isFinite(n) ? n.toFixed(2) : "—");
const stockState = (p) => (p.quantity <= 0 ? "out" : p.quantity <= p.alertThreshold ? "low" : "ok");
const marginPct = (p) =>
  Number.isFinite(p.buyPrice) && p.sellPrice > 0 ? Math.round(((p.sellPrice - p.buyPrice) / p.sellPrice) * 100) : null;

function Sheet({ title, onClose, busy, small, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  return (
    <div className="pr-overlay" onMouseDown={() => !busy && onClose()}>
      <div
        className={`pr-sheet${small ? " pr-sheet--sm" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="pr-sheet-head">
          <h2>{title}</h2>
          <button className="pr-x" onClick={onClose} disabled={busy} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <li className="pr-row">
      <div className="pr-sk" style={{ width: "50%", height: 15 }} />
      <div className="pr-sk" style={{ width: "30%", height: 12 }} />
    </li>
  );
}

export default function ProductsPage({ token, role, mainProducts, productsLoading, refreshProducts, onApiError }) {
  const isAdmin = canManageProducts(role);
  const products = mainProducts || [];

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [cam, setCam] = useState(false);
  const camSupported = cameraSupported();
  useEffect(() => {
    if (camSupported) preloadScanner();
  }, [camSupported]);

  const counts = useMemo(() => {
    let low = 0;
    let out = 0;
    let value = 0;
    for (const p of products) {
      const s = stockState(p);
      if (s === "low") low++;
      if (s === "out") out++;
      if (Number.isFinite(p.buyPrice)) value += p.buyPrice * Math.max(p.quantity, 0);
    }
    return { low, out, value };
  }, [products]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === "low" && stockState(p) !== "low") return false;
      if (filter === "out" && stockState(p) !== "out") return false;
      if (filter === "nobc" && p.barcode) return false;
      return !q || (p.name || "").toLowerCase().includes(q) || String(p.barcode || "").includes(q);
    });
  }, [products, query, filter]);

  const showSkeleton = productsLoading && products.length === 0;

  function flash(type, text) {
    setToast({ type, text });
    setTimeout(() => setToast(null), type === "danger" ? 4000 : 2600);
  }

  function openAdd() {
    setForm({ ...emptyForm });
    setFormError("");
  }

  function openEdit(p) {
    setForm({
      id: p.id,
      name: p.name ?? "",
      buyPrice: Number.isFinite(p.buyPrice) ? p.buyPrice : "",
      sellPrice: p.sellPrice ?? "",
      quantity: p.quantity ?? "",
      unit: p.unit ?? "piece",
      alertThreshold: p.alertThreshold ?? "",
      barcode: p.barcode ?? "",
      expectedQuantity: p.quantity ?? 0,
    });
    setFormError("");
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    if (!isAdmin || saving) return;
    const payload = {
      name: form.name.trim(),
      buyPrice: parseFloat(form.buyPrice) || 0,
      sellPrice: parseFloat(form.sellPrice) || 0,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit,
      alertThreshold: parseFloat(form.alertThreshold) || 0,
      barcode: form.barcode.trim() || null,
      ...(form.id ? { expectedQuantity: form.expectedQuantity } : {}),
    };
    if (!payload.name) return setFormError("اسم المنتج مطلوب");
    if (payload.sellPrice <= 0) return setFormError("اكتب سعر البيع");
    const dup = payload.barcode && products.find((x) => x.id !== form.id && x.barcode && sameCode(x.barcode, payload.barcode));
    if (dup) return setFormError(`هاد الباركود مستخدم لـ "${dup.name}"`);

    setFormError("");
    setSaving(true);
    try {
      if (form.id) await updateProduct(form.id, payload, token);
      else await addProduct(payload, token);
      setForm(null);
      flash("success", form.id ? "تم حفظ التعديلات" : "تمت إضافة المنتج");
      await refreshProducts();
    } catch (err) {
      if (err?.code === "STOCK_CHANGED") refreshProducts();
      if (err?.code !== "SESSION_EXPIRED") setFormError(err.message || "حصل خطأ غير متوقع، حاول مرة ثانية.");
      else onApiError?.(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isAdmin || !toDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteProduct(toDelete.id, token);
      setToDelete(null);
      flash("success", "تم حذف المنتج");
      await refreshProducts();
    } catch (err) {
      setToDelete(null);
      if (err?.code !== "SESSION_EXPIRED") flash("danger", err.message || "ما قدرنا نحذف المنتج، حاول مرة ثانية.");
      else onApiError?.(err);
    } finally {
      setDeleting(false);
    }
  }

  // مؤشر الهامش داخل النموذج
  const b = parseFloat(form?.buyPrice);
  const s = parseFloat(form?.sellPrice);
  let hint = null;
  if (form && s > 0 && b >= 0) {
    hint =
      s < b
        ? { bad: true, text: `سعر البيع أقل من الشراء، رح تخسر ₪${money(b - s)} بكل ${unitLabel(form.unit)}` }
        : { bad: false, text: `الربح ₪${money(s - b)} بكل ${unitLabel(form.unit)} (${Math.round(((s - b) / s) * 100)}%)` };
  }

  return (
    <div className="pr-page">
      {toast && (
        <div className={`pr-toast pr-toast--${toast.type}`} role="status">
          {toast.text}
        </div>
      )}

      <header className="pr-head">
        <div className="pr-title">
          <h1>المنتجات</h1>
          <p>الأسعار والمخزون بمكان واحد.</p>
        </div>
        {isAdmin && (
          <button className="pr-add" onClick={openAdd}>
            <Plus size={18} />
            منتج جديد
          </button>
        )}
      </header>

      <div className="pr-stats">
        <button onClick={() => setFilter("all")}>
          <b>{products.length}</b>
          <span>منتج</span>
        </button>
        <button className="warn" onClick={() => setFilter("low")}>
          <b>{counts.low}</b>
          <span>مخزون منخفض</span>
        </button>
        <button className="danger" onClick={() => setFilter("out")}>
          <b>{counts.out}</b>
          <span>نفد</span>
        </button>
        <div>
          <b>₪{Math.round(counts.value).toLocaleString("en-US")}</b>
          <span>قيمة المخزون بسعر الشراء</span>
        </div>
      </div>

      <div className="pr-toolbar">
        <div className="pr-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            aria-label="بحث عن منتج"
          />
        </div>
        <div className="pr-pills" role="group" aria-label="فلتر المخزون">
          {FILTERS.map((f) => (
            <button key={f.id} className={filter === f.id ? "on" : ""} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pr-panel">
        <div className="pr-thead" aria-hidden="true">
          <span>المنتج</span>
          <span>سعر الشراء</span>
          <span>سعر البيع</span>
          <span>الهامش</span>
          <span>المخزون</span>
          <span />
        </div>

        <ul className="pr-list">
          {showSkeleton && Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}

          {!showSkeleton && products.length === 0 && (
            <li className="pr-empty">
              ما في منتجات بعد.
              {isAdmin && (
                <button className="pr-add" onClick={openAdd}>
                  <Plus size={18} />
                  أضف أول منتج
                </button>
              )}
            </li>
          )}
          {!showSkeleton && products.length > 0 && shown.length === 0 && (
            <li className="pr-empty">ما في منتجات بتطابق البحث.</li>
          )}

          {shown.map((p) => {
            const st = stockState(p);
            const m = marginPct(p);
            return (
              <li key={p.id} className={`pr-row pr-row--${st}`}>
                <div className="pr-name">
                  <span>{p.name}</span>
                  <small>
                    {p.unit === "kg" ? "بالكيلو" : "بالقطعة"}
                    {p.barcode && (
                      <span className="pr-has-bc" title={p.barcode}>
                        <Barcode size={13} />
                      </span>
                    )}
                  </small>
                </div>
                <div className="pr-cell" data-label="سعر الشراء">
                  ₪{money(p.buyPrice)}
                </div>
                <div className="pr-cell pr-cell--sell" data-label="سعر البيع">
                  ₪{money(p.sellPrice)}
                </div>
                <div className={`pr-cell${m !== null && m < 0 ? " pr-neg" : ""}`} data-label="الهامش">
                  {m === null ? "—" : `${m}%`}
                </div>
                <div className="pr-foot">
                  <span className={`pr-chip pr-chip--${st}`}>
                    {st === "out" ? <PackageX size={14} /> : st === "low" ? <AlertTriangle size={14} /> : null}
                    {st === "out" ? "نفد" : `${p.quantity} ${unitLabel(p.unit)}`}
                  </span>
                  {isAdmin && (
                    <span className="pr-actions">
                      <button onClick={() => openEdit(p)} aria-label={`تعديل ${p.name}`}>
                        <Pencil size={16} />
                      </button>
                      <button className="del" onClick={() => setToDelete(p)} aria-label={`حذف ${p.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ===== نموذج الإضافة / التعديل ===== */}
      {form && isAdmin && (
        <Sheet title={form.id ? "تعديل منتج" : "منتج جديد"} onClose={() => setForm(null)} busy={saving}>
          <form className="pr-form" onSubmit={handleSave} noValidate>
            <div className="pr-field">
              <label htmlFor="pr-name">اسم المنتج</label>
              <input id="pr-name" type="text" value={form.name} onChange={set("name")} autoFocus />
            </div>
            <div className="pr-field">
              <label htmlFor="pr-bc">
                الباركود <em>(اختياري، امسحه بالقارئ أو اكتبه)</em>
              </label>
              <div className="pr-bc">
                <input
                  id="pr-bc"
                  type="text"
                  dir="ltr"
                  inputMode="numeric"
                  value={form.barcode}
                  onChange={set("barcode")}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  spellCheck={false}
                />
                {camSupported && (
                  <button type="button" onClick={() => setCam(true)} aria-label="مسح بالكاميرا">
                    <ScanLine size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="pr-grid2">
              <div className="pr-field">
                <label htmlFor="pr-buy">سعر الشراء</label>
                <input id="pr-buy" type="number" inputMode="decimal" dir="ltr" value={form.buyPrice} onChange={set("buyPrice")} />
              </div>
              <div className="pr-field">
                <label htmlFor="pr-sell">سعر البيع</label>
                <input id="pr-sell" type="number" inputMode="decimal" dir="ltr" value={form.sellPrice} onChange={set("sellPrice")} />
              </div>
            </div>
            {hint && <div className={`pr-hint${hint.bad ? " bad" : ""}`}>{hint.text}</div>}

            <div className="pr-field">
              <label>الوحدة</label>
              <div className="pr-seg" role="radiogroup" aria-label="الوحدة">
                {[
                  { id: "piece", label: "قطعة" },
                  { id: "kg", label: "كيلوغرام" },
                ].map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    role="radio"
                    aria-checked={form.unit === u.id}
                    onClick={() => setForm((f) => ({ ...f, unit: u.id }))}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pr-grid2">
              <div className="pr-field">
                <label htmlFor="pr-qty">الكمية الحالية</label>
                <input id="pr-qty" type="number" inputMode="decimal" dir="ltr" value={form.quantity} onChange={set("quantity")} />
              </div>
              <div className="pr-field">
                <label htmlFor="pr-alert">حد التنبيه</label>
                <input id="pr-alert" type="number" inputMode="decimal" dir="ltr" value={form.alertThreshold} onChange={set("alertThreshold")} />
              </div>
            </div>
            <div className="pr-help">بنتنبّه لما الكمية تنزل لهاد الرقم أو تحته.</div>

            {formError && <div className="pr-err" role="alert">{formError}</div>}

            <div className="pr-btns">
              <button type="button" className="pr-btn" onClick={() => setForm(null)} disabled={saving}>
                إلغاء
              </button>
              <button type="submit" className="pr-btn pr-btn--primary" disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {cam && (
        <BarcodeCamera
          continuous={false}
          onDetect={(code) => setForm((f) => (f ? { ...f, barcode: code } : f))}
          onClose={() => setCam(false)}
        >
          <p className="pr-cam-hint">وجّه الكاميرا نحو الباركود وبيتعبّى الحقل لحاله.</p>
        </BarcodeCamera>
      )}

      {/* ===== تأكيد الحذف ===== */}
      {toDelete && isAdmin && (
        <Sheet title="حذف منتج" onClose={() => setToDelete(null)} busy={deleting} small>
          <p className="pr-confirm">
            متأكد بدك تحذف <b>{toDelete.name}</b>؟ رح يختفي من قائمة البيع.
          </p>
          <div className="pr-btns">
            <button className="pr-btn" onClick={() => setToDelete(null)} disabled={deleting}>
              إلغاء
            </button>
            <button className="pr-btn pr-btn--danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "جاري الحذف..." : "حذف المنتج"}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

