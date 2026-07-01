import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, AlertTriangle } from "lucide-react";
import { getProducts, addProduct, updateProduct, deleteProduct } from "../services/dataService";

const emptyForm = { name: "", buyPrice: "", sellPrice: "", quantity: "", unit: "piece", alertThreshold: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    refresh();
  }, []);
  
  function refresh() {
    setLoading(true);
    setErrorMsg("");
    getProducts()
      .then(setProducts)
      .catch((err) => setErrorMsg(err.message || "ما قدرنا نجيب المنتجات."))
      .finally(() => setLoading(false));
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setErrorMsg("");
    setShowForm(true);
  }

  function openEditForm(p) {
    setForm({
      name: p.name,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      quantity: p.quantity,
      unit: p.unit,
      alertThreshold: p.alertThreshold,
    });
    setEditingId(p.id);
    setErrorMsg("");
    setShowForm(true);
  }

  async function handleSave() {
    const payload = {
      name: form.name.trim(),
      buyPrice: parseFloat(form.buyPrice) || 0,
      sellPrice: parseFloat(form.sellPrice) || 0,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit,
      alertThreshold: parseFloat(form.alertThreshold) || 0,
    };
    if (!payload.name) return;

    setErrorMsg("");
    setSaving(true);
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await addProduct(payload);
      }
      setShowForm(false);
      refresh();
    } catch (err) {
      setErrorMsg(err.message || "حصل خطأ غير متوقع، حاول مرة ثانية.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setErrorMsg("");
    setDeletingId(id);
    try {
      await deleteProduct(id);
      refresh();
    } catch (err) {
      setErrorMsg(err.message || "ما قدرنا نحذف المنتج، حاول مرة ثانية.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, maxWidth: 714, margin: "auto" }}>
      <div className="section-header">
        <span className="section-title">إجمالي المنتجات</span>
        <span className="section-count">{products.length}</span>
      </div>

      {errorMsg && !showForm && (
        <div className="card" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", textAlign: "center", fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      <button
        onClick={openAddForm}
        className="btn-whatsapp"
        style={{ background: "var(--color-primary)", justifyContent: "center" }}
      >
        <Plus size={18} />
        إضافة منتج جديد
      </button>

      <div className="card" style={{ padding: 0 }}>
        {loading && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
            جاري التحميل...
          </div>
        )}
        {!loading && products.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)" }}>
            ما في منتجات بعد. ضيف أول منتج.
          </div>
        )}
        {products.map((p, idx) => {
          const low = p.quantity <= p.alertThreshold;
          return (
            <div
              key={p.id}
              className="product-row"
              style={{ padding: "14px 16px", borderBottom: idx === products.length - 1 ? "none" : undefined }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} style={{ ...iconBtnStyle, opacity: deletingId === p.id ? 0.5 : 1 }}>
                  <Trash2 size={15} color="var(--color-danger)" />
                </button>
                <button onClick={() => openEditForm(p)} style={iconBtnStyle}>
                  <Edit2 size={15} color="var(--text-secondary)" />
                </button>
              </div>
              <div style={{ textAlign: "left" }}>
                <div className="product-price">₪{p.sellPrice}</div>
                <div className="product-meta" style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                  {low && <AlertTriangle size={12} color="var(--color-danger)" />}
                  <span style={{ color: low ? "var(--color-danger)" : "var(--text-secondary)" }}>
                    {p.quantity} {p.unit === "kg" ? "كغ" : "قطعة"}
                  </span>
                </div>
              </div>
              <div className="product-name" style={{ textAlign: "right" }}>{p.name}</div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div style={overlayStyle} onClick={() => setShowForm(false)}>
          <div className="card" style={{ width: "100%", maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>
                {editingId ? "تعديل منتج" : "منتج جديد"}
              </span>
              <button onClick={() => setShowForm(false)} style={iconBtnStyle}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="اسم المنتج">
                <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="سعر الشراء">
                  <input type="number" style={inputStyle} value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} />
                </Field>
                <Field label="سعر البيع">
                  <input type="number" style={inputStyle} value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="الكمية">
                  <input type="number" style={inputStyle} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </Field>
                <Field label="الوحدة">
                  <select style={inputStyle} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    <option value="piece">قطعة</option>
                    <option value="kg">كيلوغرام</option>
                  </select>
                </Field>
              </div>

              <Field label="حد التنبيه (تنبهني لما الكمية تنزل تحت هاد الرقم)">
                <input type="number" style={inputStyle} value={form.alertThreshold} onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })} />
              </Field>

              {errorMsg && (
                <div style={{ color: "var(--color-danger)", fontSize: 13, textAlign: "center" }}>
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-whatsapp"
                style={{ background: "var(--color-primary)", justifyContent: "center", marginTop: 8, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "جاري الحفظ..." : "حفظ"}
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