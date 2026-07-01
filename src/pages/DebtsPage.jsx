import { useState, useEffect } from "react";
import { Clock, CheckCircle2, X } from "lucide-react";
import { getDebts, recordPayment } from "../services/dataService";

export default function DebtsPage() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payingLoading, setPayingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    getDebts()
      .then((data) => setDebts(data.sort((a, b) => new Date(b.date) - new Date(a.date))))
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }

  async function handlePay(debt, full) {
    const paid = Number(debt.max_paidAmount) || 0;
    const remaining = debt.sum_lineTotal - paid;
    const amount = full ? remaining : parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    setPayingLoading(true);
    try {
      await recordPayment(debt.id, amount);
      setPayingId(null);
      setPayAmount("");
      refresh();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setPayingLoading(false);
    }
  }

  const debtsWithStatus = debts.map((d) => {
    const paid = Number(d.max_paidAmount) || 0;
    const remaining = d.sum_lineTotal - paid;
    return { ...d, paid, remaining, isPaid: remaining <= 0 };
  });

  const totalDebt = debtsWithStatus.reduce((sum, d) => sum + Math.max(d.remaining, 0), 0);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, maxWidth: 714, margin: "auto" }}>
      {errorMsg && (
        <div className="card" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", textAlign: "center", fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      <div className="stat-card danger" style={{ textAlign: "center" }}>
        <div className="stat-label">إجمالي الديون المستحقة</div>
        <div className="stat-value">₪{totalDebt.toFixed(2)}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
            جاري التحميل...
          </div>
        )}
        {!loading && debtsWithStatus.length === 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
            ما في ديون مسجلة.
          </div>
        )}
        {debtsWithStatus.map((d) => (
          <div key={d.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{d.customerName}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                  <Clock size={12} />
                  {new Date(d.date).toLocaleDateString("ar-EG")}
                </div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, color: d.isPaid ? "var(--color-success)" : "var(--color-danger)" }}>
                  ₪{Math.max(d.remaining, 0).toFixed(2)}
                </div>
                {d.paid > 0 && !d.isPaid && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    مدفوع ₪{d.paid.toFixed(2)} من ₪{d.sum_lineTotal.toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            {d.isPaid ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-success)", fontSize: 13, marginTop: 10 }}>
                <CheckCircle2 size={15} />
                تم السداد بالكامل
              </div>
            ) : payingId === d.id ? (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input
                  type="number"
                  placeholder="المبلغ"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  disabled={payingLoading}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => handlePay(d, false)}
                  disabled={payingLoading}
                  className="pill"
                  style={{ background: "var(--color-primary)", opacity: payingLoading ? 0.6 : 1 }}
                >
                  {payingLoading ? "جاري السداد..." : "سداد"}
                </button>
                <button onClick={() => setPayingId(null)} disabled={payingLoading} style={iconBtnStyle}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => handlePay(d, true)}
                  disabled={payingLoading}
                  className="pill"
                  style={{ flex: 1, justifyContent: "center", background: "var(--color-success-soft)", color: "var(--color-success)", opacity: payingLoading ? 0.6 : 1 }}
                >
                  {payingLoading ? "جاري..." : "سداد كامل"}
                </button>
                <button
                  onClick={() => setPayingId(d.id)}
                  disabled={payingLoading}
                  className="pill"
                  style={{ flex: 1, justifyContent: "center", opacity: payingLoading ? 0.6 : 1 }}
                >
                  سداد جزئي
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "var(--bg-pill)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
};

const iconBtnStyle = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "none",
  background: "var(--bg-pill)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};