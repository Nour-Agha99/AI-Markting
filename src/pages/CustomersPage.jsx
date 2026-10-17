import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X, MessageCircle, AlertTriangle } from "lucide-react";
import { getCustomers, saveCustomer } from "../services/dataService";
import "./CustomersPage.css";

const money = (n) => `₪${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const emptyForm = { id: undefined, name: "", phone: "", creditLimit: "", notes: "", isActive: true };

const hue = (name) => {
  let h = 0;
  for (const c of name || "؟") h = c.charCodeAt(0) + ((h << 5) - h);
  return Math.abs(h) % 4;
};
const digits = (s) => String(s || "").replace(/\D/g, "");
// wa.me needs the international number without + or 00; a local number (059...) is Palestinian (+970)
const waNumber = (s) => digits(s).replace(/^00/, "").replace(/^0/, "970").replace(/^(5\d{8})$/, "970$1");

function Sheet({ title, onClose, busy, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);
  return (
    <div className="cu-overlay" onMouseDown={() => !busy && onClose()}>
      <div className="cu-sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="cu-sheet-head">
          <h2>{title}</h2>
          <button className="cu-x" onClick={onClose} disabled={busy} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CustomersPage({ token, onApiError }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  function sessionExpired(err) {
    try {
      onApiError?.(err);
    } catch {
      /* انتهت الجلسة */
    }
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setCustomers(await getCustomers(token));
    } catch (err) {
      if (err?.code === "SESSION_EXPIRED") sessionExpired(err);
      else setError(err.message || "ما قدرنا نجيب الزبائن.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [token]);

  function flash(text, type = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), type === "danger" ? 4000 : 2600);
  }

  const counts = useMemo(() => {
    const c = { all: customers.length, owing: 0, owingNoPhone: 0, noPhone: 0, inactive: 0 };
    for (const u of customers) {
      if (!u.isActive) c.inactive++;
      if (!u.phone) c.noPhone++;
      if (u.outstanding > 0) {
        c.owing++;
        if (!u.phone) c.owingNoPhone++;
      }
    }
    return c;
  }, [customers]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qd = digits(search);
    return customers.filter((u) => {
      if (filter === "owing" && !(u.outstanding > 0)) return false;
      if (filter === "owingNoPhone" && !(u.outstanding > 0 && !u.phone)) return false;
      if (filter === "noPhone" && u.phone) return false;
      if (filter === "inactive" && u.isActive) return false;
      if (filter !== "inactive" && filter !== "all" && !u.isActive) return false;
      if (!q) return true;
      return (u.name || "").toLowerCase().includes(q) || (qd && digits(u.phone).includes(qd));
    });
  }, [customers, filter, search]);

  const filters = [
    ["all", "الكل"],
    ["owing", "عليهم دين"],
    ["owingNoPhone", "مدينين بدون رقم"],
    ["noPhone", "بدون رقم"],
    ["inactive", "معطّل"],
  ];

  function openAdd() {
    setForm({ ...emptyForm });
    setFormError("");
  }
  function openEdit(u) {
    setForm({
      id: u.id,
      name: u.name,
      phone: u.phone || "",
      creditLimit: u.creditLimit ?? "",
      notes: u.notes || "",
      isActive: u.isActive,
      outstanding: u.outstanding,
    });
    setFormError("");
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    if (busy) return;
    const name = form.name.trim();
    if (!name) return setFormError("اسم الزبون مطلوب");
    const limitText = String(form.creditLimit).trim();
    if (limitText !== "" && !(Number(limitText) >= 0)) return setFormError("حد الدين لازم يكون رقم، أو اتركه فاضي لبدون حد");

    setBusy(true);
    setFormError("");
    try {
      await saveCustomer(
        {
          id: form.id || undefined,
          name,
          phone: form.phone.trim() || null,
          creditLimit: limitText === "" ? null : Number(limitText),
          notes: form.notes.trim() || null,
          ...(form.id ? { isActive: form.isActive } : {}),
        },
        token
      );
      setForm(null);
      flash(form.id ? "تم حفظ التعديلات" : "تمت إضافة الزبون");
      await refresh();
    } catch (err) {
      if (err?.code === "SESSION_EXPIRED") sessionExpired(err);
      else setFormError(err.message || "حصل خطأ غير متوقع، حاول مرة ثانية.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cu-page">
      {toast && (
        <div className={`cu-toast cu-toast--${toast.type}`} role="status">
          {toast.text}
        </div>
      )}

      <header className="cu-head">
        <div className="cu-title">
          <h1>الزبائن</h1>
          <p>أرقام الهواتف وحدود الدين.</p>
        </div>
        <button className="cu-add" onClick={openAdd}>
          <Plus size={18} />
          زبون جديد
        </button>
      </header>

      {error && (
        <div className="cu-error" role="alert">
          {error}
          <button onClick={refresh}>إعادة المحاولة</button>
        </div>
      )}

      {counts.owingNoPhone > 0 && (
        <button className="cu-warn" onClick={() => setFilter("owingNoPhone")}>
          <AlertTriangle size={18} />
          <span>
            {counts.owingNoPhone} {counts.owingNoPhone === 1 ? "زبون عليه" : "زبائن عليهم"} دين وما إلهم رقم هاتف، ما رح يوصلهم أي تذكير.
          </span>
        </button>
      )}

      <div className="cu-stats">
        <div>
          <span>الزبائن</span>
          <b>{counts.all}</b>
        </div>
        <div>
          <span>عليهم دين</span>
          <b className={counts.owing ? "warn" : ""}>{counts.owing}</b>
        </div>
        <div>
          <span>بدون رقم</span>
          <b>{counts.noPhone}</b>
        </div>
      </div>

      <div className="cu-toolbar">
        <div className="cu-search">
          <Search size={18} aria-hidden="true" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الرقم..." aria-label="بحث" />
        </div>
        <div className="cu-pills" role="group" aria-label="فلتر الزبائن">
          {filters.map(([id, label]) => (
            <button key={id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>
              {label}
              <em>{counts[id]}</em>
            </button>
          ))}
        </div>
      </div>

      <ul className="cu-list">
        {loading &&
          customers.length === 0 &&
          Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="cu-row">
              <span className="cu-sk" style={{ width: 44, height: 44, borderRadius: "50%" }} />
              <span className="cu-info">
                <span className="cu-sk" style={{ width: "45%", height: 14 }} />
                <span className="cu-sk" style={{ width: "30%", height: 11 }} />
              </span>
            </li>
          ))}
        {!loading && customers.length > 0 && shown.length === 0 && <li className="cu-empty">ما في نتيجة مطابقة.</li>}
        {!loading && customers.length === 0 && !error && <li className="cu-empty">ما في زبائن بعد. بيتسجلوا تلقائياً لما تبيع بالدين.</li>}

        {shown.map((u) => (
          <li key={u.id}>
            <button className={`cu-row${u.isActive ? "" : " is-off"}`} onClick={() => openEdit(u)}>
              <span className={`cu-av cu-av-${hue(u.name)}`}>{(u.name || "؟").trim().charAt(0)}</span>
              <span className="cu-info">
                <span className="cu-name">{u.name}</span>
                <span className="cu-sub">
                  {u.phone ? <bdi>{u.phone}</bdi> : <span className="cu-nophone">بدون رقم</span>}
                  {u.creditLimit != null && <span>الحد {money(u.creditLimit)}</span>}
                </span>
              </span>
              {!u.isActive ? (
                <span className="cu-badge cu-badge--off">معطّل</span>
              ) : u.outstanding > 0 ? (
                <span className="cu-badge cu-badge--debt">{money(u.outstanding)}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {form && (
        <Sheet title={form.id ? "تعديل زبون" : "زبون جديد"} onClose={() => setForm(null)} busy={busy}>
          <form className="cu-form" onSubmit={handleSave} noValidate>
            <div className="cu-field">
              <label htmlFor="cu-name">الاسم</label>
              <input id="cu-name" type="text" value={form.name} onChange={set("name")} autoFocus />
            </div>

            <div className="cu-field">
              <label htmlFor="cu-phone">
                رقم الهاتف <em>(اختياري)</em>
              </label>
              <div className="cu-phone">
                <input id="cu-phone" type="tel" dir="ltr" inputMode="tel" placeholder="0599123456" value={form.phone} onChange={set("phone")} />
                {digits(form.phone).length >= 9 && (
                  <a href={`https://wa.me/${waNumber(form.phone)}`} target="_blank" rel="noopener noreferrer" aria-label="فتح واتساب">
                    <MessageCircle size={18} />
                  </a>
                )}
              </div>
              <div className="cu-help">بيتحوّل لصيغة دولية لحاله (+970). لرقم من دولة ثانية اكتبه كامل بـ + .</div>
            </div>

            <div className="cu-field">
              <label htmlFor="cu-limit">
                حد الدين <em>(اتركه فاضي لبدون حد)</em>
              </label>
              <input id="cu-limit" type="number" dir="ltr" inputMode="decimal" min="0" step="any" placeholder="بدون حد" value={form.creditLimit} onChange={set("creditLimit")} />
              {form.id && form.outstanding > 0 && <div className="cu-help">عليه حالياً {money(form.outstanding)}.</div>}
            </div>

            <div className="cu-field">
              <label htmlFor="cu-notes">
                ملاحظات <em>(اختياري)</em>
              </label>
              <textarea id="cu-notes" rows={2} maxLength={500} value={form.notes} onChange={set("notes")} />
            </div>

            {form.id && (
              <button
                type="button"
                className="cu-switch"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              >
                <span>
                  <b>زبون فعّال</b>
                  <small>{form.isActive ? "بيظهر بالمبيعات والديون" : "معطّل: ما بيظهر للاختيار"}</small>
                </span>
                <i className={form.isActive ? "on" : ""} aria-hidden="true" />
              </button>
            )}

            {formError && (
              <div className="cu-err" role="alert">
                {formError}
              </div>
            )}
            <div className="cu-btns">
              <button type="button" className="cu-btn" onClick={() => setForm(null)} disabled={busy}>
                إلغاء
              </button>
              <button type="submit" className="cu-btn cu-btn--primary" disabled={busy}>
                {busy ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </div>
  );
}