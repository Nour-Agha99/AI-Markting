import { useState, useEffect } from "react";
import { CalendarClock, CheckCircle2, X, Users, List, Wallet, Check, Search, RefreshCw } from "lucide-react";
import { getDebts, recordPayment } from "../services/dataService";

const AVATAR_PALETTE = [
  { bg: "var(--color-primary-soft)", text: "var(--color-primary)" },
  { bg: "var(--color-success-soft)", text: "var(--color-success)" },
  { bg: "var(--color-warning-soft)", text: "var(--color-warning)" },
  { bg: "var(--color-danger-soft)", text: "var(--color-danger)" },
];

function avatarStyle(name) {
  const str = name || "؟";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatEntryDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("ar-EG")} · ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
}

function DebtCardSkeleton() {
  return (
    <div className="debt-card">
      <div className="debt-progress-track">
        <div className="skeleton" style={{ width: "45%", height: "100%" }} />
      </div>
      <div className="debt-card-top">
        <div className="skeleton" style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="skeleton" style={{ width: "55%", height: 14 }} />
          <div className="skeleton" style={{ width: "40%", height: 11 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div className="skeleton" style={{ width: 60, height: 16 }} />
          <div className="skeleton" style={{ width: 45, height: 10 }} />
        </div>
      </div>
      <div className="debt-card-actions-compact">
        <div className="skeleton" style={{ width: 34, height: 34, borderRadius: "50%" }} />
        <div className="skeleton" style={{ width: 34, height: 34, borderRadius: "50%" }} />
      </div>
    </div>
  );
}

export default function DebtsPage({ token, role, onApiError }) {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [detailsDebt, setDetailsDebt] = useState(null);
  const [payModalDebt, setPayModalDebt] = useState(null);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payingLoading, setPayingLoading] = useState(false);
  const [payModalError, setPayModalError] = useState("");

  useEffect(() => {
    refresh();
  }, [token]);

  function refresh() {
    setLoading(true);
    getDebts(token)
      .then((data) => setDebts(data.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate))))
      .catch((err) => {
        if (err?.code !== "SESSION_EXPIRED") {
          setErrorMsg(err.message);
        } else {
          onApiError?.(err);
        }
      })
      .finally(() => setLoading(false));
  }

  function openPayModal(debt) {
    setPayModalDebt(debt);
    setPayAmountInput("");
    setPayModalError("");
  }

  function closePayModal() {
    if (payingLoading) return;
    setPayModalDebt(null);
    setPayAmountInput("");
    setPayModalError("");
  }

  async function handlePaySubmit() {
    if (!payModalDebt) return;
    const amount = payAmountInput.trim() === "" ? payModalDebt.remaining : parseFloat(payAmountInput);

    if (!amount || amount <= 0) {
      setPayModalError("أدخل مبلغ صحيح");
      return;
    }
    if (amount > payModalDebt.remaining) {
      setPayModalError("المبلغ أكبر من المتبقي على الزبون");
      return;
    }

    setPayingLoading(true);
    setPayModalError("");
    try {
      await recordPayment(payModalDebt.customerName, amount, token);
      setPayModalDebt(null);
      setPayAmountInput("");
      refresh();
    } catch (err) {
      if (err?.code !== "SESSION_EXPIRED") {
        setPayModalError(err.message);
      } else {
        onApiError?.(err);
      }
    } finally {
      setPayingLoading(false);
    }
  }

  const debtsWithStatus = debts.map((d) => {
    const remaining = Math.max(d.totalAmount - d.paidAmount, 0);
    const pct = d.totalAmount > 0 ? Math.min(100, Math.round((d.paidAmount / d.totalAmount) * 100)) : 0;
    return { ...d, remaining, pct, isPaid: remaining <= 0 };
  });

  const totalDebt = debtsWithStatus.reduce((sum, d) => sum + d.remaining, 0);
  const owingCount = debtsWithStatus.filter((d) => !d.isPaid).length;

  const sortedDebts = [...debtsWithStatus].sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
    return new Date(b.lastDate) - new Date(a.lastDate);
  });

  const filteredDebts = sortedDebts.filter((d) =>
    (d.customerName || "").toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="page-container">
      {errorMsg && (
        <div className="card" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", textAlign: "center", fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}
      <div className="section-header">
        <span className="section-title">الديون</span>
        <button onClick={refresh} disabled={loading} className="icon-btn-refresh">
          <RefreshCw size={16} className={loading ? "spin" : ""} />
        </button>
      </div>

      <div className="debts-stats-row">
        <div className="stat-card danger stat-card-highlight stat-card-side-accent" style={{ textAlign: "center" }}>
          <div className="stat-label">إجمالي الديون المستحقة</div>
          <div className="stat-value">₪{totalDebt.toFixed(2)}</div>
        </div>
        <div className="stat-card primary stat-card-highlight stat-card-side-accent" style={{ textAlign: "center" }}>
          <div className="stat-label">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Users size={13} /> عدد الزبائن المدينين
            </span>
          </div>
          <div className="stat-value">{owingCount}</div>
        </div>
      </div>

      <div className="card">
        <div className="search-box">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الزبون..."
          />
          <Search size={17} className="search-box-icon" />
        </div>
      </div>


      <div className="debts-list">
        {loading && (
          <>
            <DebtCardSkeleton />
            <DebtCardSkeleton />
            <DebtCardSkeleton />
            <DebtCardSkeleton />
          </>
        )}
        {!loading && debtsWithStatus.length === 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>ما في ديون مسجلة.</div>
        )}
        {!loading && debtsWithStatus.length > 0 && filteredDebts.length === 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>ما في زبون بهاد الاسم.</div>
        )}
        {!loading && filteredDebts.map((d) => {

          const palette = avatarStyle(d.customerName);
          const initial = (d.customerName || "؟").trim().charAt(0);

          return (
            <div key={d.customerName} className="debt-card">
              {!d.isPaid && (
                <div className="debt-progress-track">
                  <div className="debt-progress-fill" style={{ width: `${d.pct}%` }} />
                </div>
              )}

              <div className="debt-card-top">
                <div className="debt-avatar" style={{ background: palette.bg, color: palette.text }}>
                  {initial}
                </div>

                <div className="debt-card-info">
                  <div className="debt-card-name">{d.customerName || "بدون اسم"}</div>
                  <div className="debt-card-meta">
                    <CalendarClock size={13} />
                    {new Date(d.lastDate).toLocaleDateString("ar-EG")} · {new Date(d.lastDate).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    {d.salesCount > 1 && ` · ${d.salesCount} عمليات`}
                  </div>
                </div>

                <div className="debt-card-amount">
                  <div className="debt-card-remaining" style={{ color: d.isPaid ? "var(--color-success)" : "var(--color-danger)" }}>
                    ₪{d.remaining.toFixed(2)}
                  </div>
                  {d.paidAmount > 0 && !d.isPaid && (
                    <div className="debt-card-sub">مدفوع ₪{d.paidAmount.toFixed(2)} من ₪{d.totalAmount.toFixed(2)}</div>
                  )}
                </div>
              </div>

              <div className="debt-card-actions-compact">
                <button onClick={() => setDetailsDebt(d)} className="debt-icon-btn" title="التفاصيل">
                  <List size={15} />
                </button>

                {d.isPaid ? (
                  <span className="debt-paid-chip">
                    <CheckCircle2 size={14} /> مسدد
                  </span>
                ) : (
                  <button onClick={() => openPayModal(d)} className="debt-icon-btn primary" title="سداد">
                    <Wallet size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* بوب أب التفاصيل */}
      {detailsDebt && (
        <div style={overlayStyle} onClick={() => setDetailsDebt(null)}>
          <div className="card" style={{ width: "100%", maxWidth: 380, maxHeight: "78vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>تفاصيل ديون {detailsDebt.customerName || "بدون اسم"}</span>
              <button onClick={() => setDetailsDebt(null)} style={iconBtnStyle}>
                <X size={18} />
              </button>
            </div>

            <div className="debt-entries">
              {detailsDebt.timeline.map((e) => {
                const isPurchase = e.type === "purchase";
                const color = isPurchase ? "var(--color-danger)" : "var(--color-success)";
                return (
                  <div key={e.id} className="debt-entry">
                    <div>
                      <div className="debt-entry-type" style={{ color }}>
                        {isPurchase ? "شراء" : "سداد"}
                      </div>
                      <div className="debt-entry-meta">{formatEntryDate(e.date)}</div>
                      {e.notes && <div className="debt-entry-meta">{e.notes}</div>}
                    </div>
                    <div className="debt-entry-remaining" style={{ color }}>
                      {isPurchase ? "+" : "-"}₪{e.amount.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="debt-modal-total-row">
              <span>المتبقي الإجمالي</span>
              <span className="debt-modal-total-value">₪{detailsDebt.remaining.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* بوب أب السداد */}
      {payModalDebt && (
        <div style={overlayStyle} onClick={closePayModal}>
          <div className="card" style={{ width: "100%", maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>سداد دين {payModalDebt.customerName || "بدون اسم"}</span>
              <button onClick={closePayModal} style={iconBtnStyle}>
                <X size={18} />
              </button>
            </div>

            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 4 }}>المتبقي</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: "var(--color-danger)" }}>₪{payModalDebt.remaining.toFixed(2)}</div>
            </div>

            <label className="debt-modal-label">المبلغ (اتركه فاضي للسداد الكامل)</label>
            <input
              type="number"
              placeholder={`مثال: ${payModalDebt.remaining.toFixed(2)}`}
              value={payAmountInput}
              onChange={(e) => setPayAmountInput(e.target.value)}
              disabled={payingLoading}
              className="debt-modal-input"
            />

            {payModalError && (
              <div style={{ color: "var(--color-danger)", fontSize: 13, marginTop: 10, textAlign: "center" }}>{payModalError}</div>
            )}

            <button onClick={handlePaySubmit} disabled={payingLoading} className="debt-modal-confirm-btn">
              <Check size={16} />
              {payingLoading ? "جاري التسجيل..." : "تسجيل دفع"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 };
const iconBtnStyle = { width: 30, height: 30, borderRadius: "50%", border: "none", background: "var(--bg-pill)", display: "flex", alignItems: "center", justifyContent: "center" };
const inputStyle = { width: "100%", background: "var(--bg-pill)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none" };