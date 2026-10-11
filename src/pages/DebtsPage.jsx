import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ChevronLeft, Check } from "lucide-react";
import * as api from "../services/dataService";
import "./DebtsPage.css";

const DAY = 86400000;

const LEDGERS = {
  customers: {
    label: "ديون الزبائن",
    nameKey: "customerName",
    owed: "مستحق لك من الزبائن",
    placeholder: "ابحث باسم الزبون...",
    payLabel: "تسجيل دفعة",
    load: (t) => api.getDebts(t),
    pay: (n, a, t) => api.recordPayment(n, a, t),
  },
  suppliers: {
    label: "ديون الموردين",
    nameKey: "supplierName",
    owed: "مستحق عليك للموردين",
    placeholder: "ابحث باسم المورد...",
    payLabel: "تسجيل دفعة للمورد",
    load: (t) => api.getSupplierDebts(t),
    pay: (n, a, t) => api.paySupplier(n, a, t),
  },
};

const money = (n) => `₪${Number(n || 0).toFixed(2)}`;
const daysSince = (d) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / DAY));
const hue = (name) => {
  let h = 0;
  for (const c of name || "؟") h = c.charCodeAt(0) + ((h << 5) - h);
  return Math.abs(h) % 4;
};
const ageText = (n) => (n === null ? "" : n === 0 ? "اليوم" : n === 1 ? "أمس" : `منذ ${n} يوم`);
const ageTone = (n) => (n >= 60 ? "late" : n >= 30 ? "warn" : "ok");
const entryDate = (d) => {
  const x = new Date(d);
  return `${x.toLocaleDateString("ar-EG")} ${x.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
};

function oldestUnpaid(timeline) {
  const sorted = [...timeline].sort((a, b) => new Date(a.date) - new Date(b.date));
  let paid = sorted.filter((e) => e.type === "payment").reduce((s, e) => s + e.amount, 0);
  for (const e of sorted.filter((x) => x.type === "purchase")) {
    if (paid >= e.amount - 0.001) paid -= e.amount;
    else return e.date;
  }
  return null;
}

function RowSkeleton() {
  return (
    <li className="dg-row dg-row--sk">
      <div className="dg-sk" style={{ width: 44, height: 44, borderRadius: "50%" }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="dg-sk" style={{ width: "50%", height: 14 }} />
        <div className="dg-sk" style={{ width: "30%", height: 11 }} />
      </div>
      <div className="dg-sk" style={{ width: 64, height: 18 }} />
    </li>
  );
}

function LedgerSheet({ debt, cfg, onClose, onPay }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const value = amount.trim() === "" ? debt.remaining : parseFloat(amount);
    if (!(value > 0)) return setError("اكتب مبلغ صحيح");
    if (value > debt.remaining + 0.001) return setError(`المبلغ أكبر من المتبقي (${money(debt.remaining)})`);
    setError("");
    setBusy(true);
    try {
      await onPay(value);
    } catch (err) {
      setError(err.message || "حصل خطأ غير متوقع، حاول مرة ثانية.");
    } finally {
      setBusy(false);
    }
  }

  const timeline = [...debt.timeline].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="dg-overlay" onMouseDown={() => !busy && onClose()}>
      <div className="dg-sheet" role="dialog" aria-modal="true" aria-label={debt.name} onMouseDown={(e) => e.stopPropagation()}>
        <div className="dg-sheet-head">
          <h2>{debt.name}</h2>
          <button className="dg-x" onClick={onClose} disabled={busy} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <div className="dg-paper-wrap">
          <div className="dg-paper">
            <ul>
              {timeline.map((e) => (
                <li key={e.id} className={e.type}>
                  <div>
                    <b>{e.type === "purchase" ? "شراء" : "سداد"}</b>
                    <small>{entryDate(e.date)}</small>
                    {e.notes && <small>{e.notes}</small>}
                  </div>
                  <span>
                    {e.type === "purchase" ? "+" : "−"}
                    {money(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="dg-paper-total">
              <span>المتبقي</span>
              <span>{money(debt.remaining)}</span>
            </div>
          </div>
        </div>

        {debt.isPaid ? (
          <div className="dg-done">
            <Check size={18} />
            مسدد بالكامل
          </div>
        ) : (
          <form className="dg-pay" onSubmit={submit} noValidate>
            <label htmlFor="dg-amount">
              المبلغ <em>(اتركه فاضي للسداد الكامل)</em>
            </label>
            <input
              id="dg-amount"
              type="number"
              inputMode="decimal"
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={debt.remaining.toFixed(2)}
              disabled={busy}
            />
            <div className="dg-chips">
              <button type="button" onClick={() => setAmount(String(debt.remaining))}>
                الكل
              </button>
              <button type="button" onClick={() => setAmount(String(+(debt.remaining / 2).toFixed(2)))}>
                النصف
              </button>
            </div>
            {error && (
              <div className="dg-err" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="dg-confirm" disabled={busy}>
              <Check size={18} />
              {busy ? "جاري التسجيل..." : cfg.payLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function DebtsPage({ token, role, onApiError, enableSuppliers = false }) {
  const canSuppliers = enableSuppliers && (role === "owner" || role === "admin");
  const [ledger, setLedger] = useState("customers");
  const cfg = LEDGERS[ledger];

  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("owing");
  const [sort, setSort] = useState("age");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const reqId = useRef(0);

  async function refresh() {
    const id = ++reqId.current;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await cfg.load(token);
      if (id === reqId.current) setRaw(data);
    } catch (err) {
      if (id !== reqId.current) return;
      if (err?.code === "SESSION_EXPIRED") onApiError?.(err);
      else setErrorMsg(err.message || "ما قدرنا نجيب الديون.");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    setRaw([]);
    refresh();
  }, [token, ledger]);

  const rows = useMemo(
    () =>
      raw.map((d) => {
        const remaining = Math.max(Math.round((d.totalAmount - d.paidAmount) * 100) / 100, 0);
        const oldest = remaining > 0 ? oldestUnpaid(d.timeline || []) : null;
        return {
          ...d,
          timeline: d.timeline || [],
          payName: d[cfg.nameKey],
          name: d[cfg.nameKey] || "بدون اسم",
          remaining,
          pct: d.totalAmount > 0 ? Math.min(100, Math.round((d.paidAmount / d.totalAmount) * 100)) : 0,
          isPaid: remaining <= 0,
          age: oldest ? daysSince(oldest) : null,
        };
      }),
    [raw, cfg]
  );

  const total = rows.reduce((s, d) => s + d.remaining, 0);
  const owing = rows.filter((d) => !d.isPaid);
  const oldestAge = owing.reduce((m, d) => Math.max(m, d.age ?? 0), 0);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((d) => (view === "all" || !d.isPaid) && (!q || d.name.toLowerCase().includes(q)))
      .sort((a, b) => {
        if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
        return sort === "age" ? (b.age ?? 0) - (a.age ?? 0) : b.remaining - a.remaining;
      });
  }, [rows, search, view, sort]);

  function flash(text) {
    setToast(text);
    setTimeout(() => setToast(null), 2600);
  }

  async function handlePay(amount) {
    await cfg.pay(selected.payName, amount, token);
    setSelected(null);
    flash("تم تسجيل الدفعة");
    refresh();
  }

  return (
    <div className="dg-page" data-ledger={ledger}>
      {toast && (
        <div className="dg-toast" role="status">
          {toast}
        </div>
      )}

      <header className="dg-head">
        <div className="dg-title">
          <h1>الديون</h1>
          <p>{canSuppliers ? "اللي إلك واللي عليك بمكان واحد." : "ديون الزبائن وتسديداتهم."}</p>
        </div>
        {canSuppliers && (
          <div className="dg-tabs" role="tablist" aria-label="نوع الديون">
            {Object.entries(LEDGERS).map(([id, l]) => (
              <button key={id} role="tab" aria-selected={ledger === id} onClick={() => setLedger(id)}>
                {l.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {errorMsg && (
        <div className="dg-error" role="alert">
          {errorMsg}
          <button onClick={refresh}>إعادة المحاولة</button>
        </div>
      )}

      <div className="dg-stats">
        <div className="dg-stat dg-stat--main">
          <span>{cfg.owed}</span>
          <b>{loading && !raw.length ? "—" : money(total)}</b>
        </div>
        <div className="dg-stat">
          <span>{ledger === "customers" ? "زبون عليه دين" : "مورد مستحق له"}</span>
          <b>{loading && !raw.length ? "—" : owing.length}</b>
        </div>
        <div className="dg-stat">
          <span>أقدم دين</span>
          <b>{owing.length ? ageText(oldestAge) : "—"}</b>
        </div>
      </div>

      <div className="dg-toolbar">
        <div className="dg-search">
          <Search size={18} aria-hidden="true" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={cfg.placeholder} aria-label="بحث" />
        </div>
        <div className="dg-pills" role="group" aria-label="العرض والترتيب">
          <button className={view === "owing" ? "on" : ""} onClick={() => setView("owing")}>
            المستحق
          </button>
          <button className={view === "all" ? "on" : ""} onClick={() => setView("all")}>
            الكل
          </button>
          <span className="dg-sep" />
          <button className={sort === "age" ? "on" : ""} onClick={() => setSort("age")}>
            الأقدم
          </button>
          <button className={sort === "amount" ? "on" : ""} onClick={() => setSort("amount")}>
            الأكبر
          </button>
        </div>
      </div>

      <ul className="dg-list">
        {loading && !raw.length && Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
        {!loading && !errorMsg && rows.length === 0 && <li className="dg-empty">ما في ديون مسجلة.</li>}
        {!loading && rows.length > 0 && shown.length === 0 && (
          <li className="dg-empty">{search ? "ما في نتيجة بهاد الاسم." : "ما في ديون مستحقة. 🎉"}</li>
        )}

        {shown.map((d) => (
          <li key={d.name}>
            <button className={`dg-row${d.isPaid ? " is-paid" : ""}`} onClick={() => setSelected(d)}>
              <span className={`dg-av dg-av-${hue(d.name)}`}>{d.name.trim().charAt(0)}</span>
              <span className="dg-info">
                <span className="dg-name">{d.name}</span>
                <span className="dg-sub">
                  {d.isPaid ? (
                    <span className="dg-chip dg-chip--paid">مسدد</span>
                  ) : (
                    <span className={`dg-chip dg-chip--${ageTone(d.age)}`}>{ageText(d.age)}</span>
                  )}
                  <span className="dg-count">
                    {d.salesCount} {d.salesCount === 1 ? "عملية" : "عمليات"}
                  </span>
                </span>
                {!d.isPaid && d.pct > 0 && (
                  <span className="dg-bar">
                    <i style={{ width: `${d.pct}%` }} />
                  </span>
                )}
              </span>
              <span className="dg-amt">
                <b>{money(d.remaining)}</b>
                {!d.isPaid && d.paidAmount > 0 && <small>من {money(d.totalAmount)}</small>}
              </span>
              <ChevronLeft size={18} className="dg-chev" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {selected && <LedgerSheet debt={selected} cfg={cfg} onClose={() => setSelected(null)} onPay={handlePay} />}
    </div>
  );
}