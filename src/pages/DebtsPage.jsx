import { useState, useEffect } from "react";
import { Plus, X, Clock, CheckCircle2 } from "lucide-react";
import { getDebts, addDebt, recordPayment } from "../services/dataService";

const emptyForm = { customerName: "", amount: "", paymentMethod: "cash" };

export default function DebtsPage() {
  const [debts, setDebts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    getDebts().then((data) => setDebts(data.sort((a, b) => new Date(b.date) - new Date(a.date))));
  }

  async function handleSave() {
    if (!form.customerName.trim() || !form.amount) return;
    await addDebt({
      customerName: form.customerName.trim(),
      amount: parseFloat(form.amount),
      paymentMethod: form.paymentMethod,
    });
    setForm(emptyForm);
    setShowForm(false);
    refresh();
  }

  async function handlePay(debt, full) {
    const amount = full ? debt.amount - debt.paidAmount : parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    await recordPayment(debt.id, amount);
    setPayingId(null);
    setPayAmount("");
    refresh();
  }

  const totalDebt = debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="stat-card danger" style={{ textAlign: "center" }}>
        <div className="stat-label">إجمالي الديون المستحقة</div>
        <div className="stat-value">₪{totalDebt.toFixed(2)}</div>
      </div>

      <button
        onClick={() => setShowForm(true)}
        className="btn-whatsapp"
        style={{ background: "var(--color-primary)", justifyContent: "center" }}
      >
        <Plus size={18} />
        تسجيل دين جديد
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {debts.length === 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
            ما في ديون مسجلة.
          </div>
        )}
        {debts.map((d) => {
          const remaining = d.amount - d.paidAmount;
          const isPaid = d.status === "paid";
          return (
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
                  <div style={{ fontWeight: 700, color: isPaid ? "var(--color-success)" : "var(--color-danger)" }}>
                    ₪{remaining.toFixed(2)}
                  </div>
                  {d.paidAmount > 0 && !isPaid && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      مدفوع ₪{d.paidAmount.toFixed(2)} من ₪{d.amount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {isPaid ? (
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
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={() => handlePay(d, false)} className="pill" style={{ background: "var(--color-primary)" }}>
                    سداد
                  </button>
                  <button onClick={() => setPayingId(null)} style={iconBtnStyle}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => handlePay(d, true)} className="pill" style={{ flex: 1, justifyContent: "center", background: "var(--color-success-soft)", color: "var(--color-success)" }}>
                    سداد كامل
                  </button>
                  <button onClick={() => setPayingId(d.id)} className="pill" style={{ flex: 1, justifyContent: "center" }}>
                    سداد جزئي
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div style={overlayStyle} onClick={() => setShowForm(false)}>
          <div className="card" style={{ width: "100%", maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>دين جديد</span>
              <button onClick={() => setShowForm(false)} style={iconBtnStyle}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="اسم الزبون">
                <input style={inputStyle} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </Field>
              <Field label="المبلغ">
                <input type="number" style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label="طريقة الدفع المتوقعة">
                <select style={inputStyle} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="cash">كاش</option>
                  <option value="bank_palestine">بنك فلسطين</option>
                  <option value="paly">بال بي</option>
                  <option value="jawwal">جوال بي</option>
                </select>
              </Field>
              <button onClick={handleSave} className="btn-whatsapp" style={{ background: "var(--color-primary)", justifyContent: "center", marginTop: 8 }}>
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ color: "var(--text-secondary)", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
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

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 50,
};
