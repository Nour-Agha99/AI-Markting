import { useState, useEffect } from "react";
import { Banknote, CreditCard, Smartphone, Wallet, Check, Minus, Plus, X, ChevronDown } from "lucide-react";
import { getProducts, recordSale } from "../services/dataService";

const PAYMENT_METHODS = [
  { id: "cash", label: "كاش", icon: Banknote },
  { id: "bank_palestine", label: "بنك فلسطين", icon: CreditCard },
  { id: "paly", label: "بال بي", icon: Wallet },
  { id: "jawwal", label: "جوال بي", icon: Smartphone },
];

const PAYMENT_TIMING = [
  { id: "now", label: "دفع الآن" },
  { id: "debt", label: "دين / لاحقاً" },
];

export default function SalePage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [cartMode, setCartMode] = useState({}); // { productId: 'kg' | 'shekel' }
  const [customerName, setCustomerName] = useState("");
  const [paymentTiming, setPaymentTiming] = useState("now");
  const [timingMenuOpen, setTimingMenuOpen] = useState(false);
  const [payment, setPayment] = useState("cash");
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [nameError, setNameError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isDebt = paymentTiming === "debt";

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      return { productId, qty, product };
    });

  const total = cartItems.reduce((sum, item) => sum + item.qty * (item.product?.sellPrice || 0), 0);

  function adjustQty(productId, delta, unit) {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, +(current + delta).toFixed(2));
      return { ...prev, [productId]: next };
    });
  }

  function setMode(productId, mode) {
    setCartMode(prev => ({ ...prev, [productId]: mode }));
  }

  function handleKgInput(productId, value, sellPrice, mode) {
    const val = parseFloat(value) || 0;
    if (mode === "shekel") {
      setCart(prev => ({ ...prev, [productId]: +(val / sellPrice).toFixed(3) }));
    } else {
      setCart(prev => ({ ...prev, [productId]: +val.toFixed(2) }));
    }
  }

  async function handleConfirm() {
    if (cartItems.length === 0) return;
    if (isDebt && !customerName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setConfirming(true);
    try {
      await recordSale({
        customerName: customerName.trim() || null,
        isDebt,
        paymentMethod: isDebt ? null : payment,
        items: cartItems.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitPrice: i.product.sellPrice,
        })),
        notes: notes.trim() || null,
        total,
      });
      setSuccessMsg(isDebt ? "تم تسجيل البيع كدين ✓" : "تم تسجيل البيع بنجاح ✓");
      setCart({});
      setCartMode({});
      setCustomerName("");
      setNotes("");
      setPaymentTiming("now");
      const fresh = await getProducts();
      setProducts(fresh);
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (err) {
      setErrorMsg(err.message || "حصل خطأ غير متوقع، حاول مرة ثانية.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, width: "fit-content", minWidth: "100%" }}>
      {successMsg && (
        <div className="card" style={{ background: "var(--color-success-soft)", color: "var(--color-success)", textAlign: "center", fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="card" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", textAlign: "center", fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "row", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 390 }}>
          {/* اسم الزبون + توقيت الدفع */}
          <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ color: "var(--text-secondary)", fontSize: 13, display: "block", marginBottom: 8 }}>
                اسم الزبون {isDebt ? "" : "(اختياري)"}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (e.target.value.trim()) setNameError(false);
                }}
                placeholder="اكتب اسم الزبون..."
                style={{ ...inputStyle, border: nameError ? "1px solid var(--color-danger)" : inputStyle.border }}
              />
              {nameError && (
                <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 4 }}>
                  اسم الزبون لازم لتسجيل دين
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <label style={{ color: "var(--text-secondary)", fontSize: 13, display: "block", marginBottom: 8 }}>الدفع</label>
              <button
                onClick={() => setTimingMenuOpen((v) => !v)}
                style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--color-primary)", color: "var(--text-primary)" }}
              >
                <ChevronDown size={16} color="var(--text-secondary)" />
                <span>{PAYMENT_TIMING.find((t) => t.id === paymentTiming)?.label}{paymentTiming === "now" && " ✓"}</span>
              </button>
              {timingMenuOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--bg-card-alt)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden", zIndex: 20, boxShadow: "var(--shadow-elevated)" }}>
                  {PAYMENT_TIMING.map((t) => {
                    const active = paymentTiming === t.id;
                    return (
                      <button key={t.id} onClick={() => { setPaymentTiming(t.id); setTimingMenuOpen(false); }}
                        style={{ width: "100%", padding: "12px 14px", textAlign: "right", background: active ? "var(--color-primary)" : "transparent", color: active ? "var(--text-on-primary)" : "var(--text-primary)", border: "none", fontSize: 14 }}>
                        {t.label}{active && " ✓"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* طريقة الدفع */}
          {!isDebt && (
            <div className="card">
              <label style={{ color: "var(--text-secondary)", fontSize: 13, display: "block", marginBottom: 12 }}>طريقة الدفع</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = payment === m.id;
                  return (
                    <button key={m.id} onClick={() => setPayment(m.id)} className="pill"
                      style={{ justifyContent: "center", background: active ? "var(--color-primary-soft)" : "var(--bg-pill)", border: active ? "1px solid var(--color-primary)" : "1px solid var(--border-subtle)", color: active ? "var(--color-primary)" : "var(--text-primary)", padding: "12px 10px" }}>
                      <Icon size={16} />{m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isDebt && (
            <div className="card" style={{ background: "var(--color-warning-soft)", color: "var(--color-warning)", fontSize: 13, textAlign: "center" }}>
              هاي العملية رح تتسجل كدين على اسم الزبون وتظهر بصفحة الديون
            </div>
          )}
          {/* ملاحظات */}
          <div className="card">
            <label style={{ color: "var(--text-secondary)", fontSize: 13, display: "block", marginBottom: 8 }}>ملاحظات (اختياري)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي ملاحظة على هاي العملية..." rows={2} style={{ ...inputStyle, resize: "none" }} />
          </div>
          {/* السلة + التأكيد */}
          {cartItems.length > 0 && (
            <div className="card" style={{ position: "sticky", bottom: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {cartItems.map((item) => (
                  <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <button onClick={() => setCart(prev => { const n = { ...prev }; delete n[item.productId]; return n })}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                    <span style={{ color: "var(--text-secondary)" }}>{item.product?.name}</span>
                    <span>{item.qty} × ₪{item.product?.sellPrice}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 18, marginBottom: 14, borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                <span>الإجمالي</span>
                <span style={{ color: "var(--color-primary)" }}>₪{total.toFixed(2)}</span>
              </div>

              <button onClick={handleConfirm} disabled={confirming} className="btn-whatsapp"
                style={{ width: "100%", justifyContent: "center", background: isDebt ? "var(--color-warning)" : "var(--color-primary)", opacity: confirming ? 0.6 : 1 }}>
                <Check size={18} />
                {confirming ? "جاري التسجيل..." : isDebt ? "تأكيد البيع كدين" : "تأكيد البيع"}
              </button>
            </div>
          )}
        </div>

        {/* المنتجات */}
        <div className="card" style={{ minWidth: 390 }}>
          <div className="section-header">
            <span className="section-title">اختر المنتجات</span>
            <span className="section-count">{products.length} منتج</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {products.map((p) => {
              const qty = cart[p.id] || 0;
              const mode = cartMode[p.id] || "kg";
              const low = p.quantity <= p.alertThreshold;
              const isKg = p.unit === "kg";

              return (
                <div key={p.id} className="card"
                  style={{ background: "var(--bg-card-alt)", padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
                      ₪{p.sellPrice} / {isKg ? "كغ" : "قطعة"} ·{" "}
                      <span style={{ color: low ? "var(--color-danger)" : "var(--text-secondary)" }}>
                        متبقي {p.quantity}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => adjustQty(p.id, -1, p.unit)} style={qtyBtnStyle}>
                      <Minus size={14} />
                    </button>

                    {isKg ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          <button onClick={() => setMode(p.id, "kg")}
                            style={{ padding: "2px 8px", borderRadius: 4, border: "none", fontSize: 11, cursor: "pointer", background: mode === "kg" ? "var(--color-primary)" : "var(--bg-pill)", color: mode === "kg" ? "white" : "var(--text-secondary)" }}>
                            كغ
                          </button>
                          <button onClick={() => setMode(p.id, "shekel")}
                            style={{ padding: "2px 8px", borderRadius: 4, border: "none", fontSize: 11, cursor: "pointer", background: mode === "shekel" ? "var(--color-primary)" : "var(--bg-pill)", color: mode === "shekel" ? "white" : "var(--text-secondary)" }}>
                            ₪
                          </button>
                        </div>

                        {/* input */}
                        <input
                          type="number"
                          dir="ltr"
                          value={mode === "shekel" ? (qty ? + Math.round(qty * p.sellPrice) : "") : (qty || "")}
                          onChange={e => handleKgInput(p.id, e.target.value, p.sellPrice, mode)}
                          placeholder={mode === "shekel" ? "₪" : "Kg"}
                          style={{ width: 64, textAlign: "center", background: "var(--bg-pill)", border: "1px solid var(--border-subtle)", borderRadius: 4, color: "var(--text-primary)", padding: "4px 6px", fontSize: 13 }}
                        />

                        {/* عرض الكيلو لو الوضع شيكل */}
                        {mode === "shekel" && qty > 0 && (
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{qty.toFixed(2)} كغ</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ minWidth: 32, textAlign: "center", fontWeight: 600 }}>{qty || 0}</span>
                    )}

                    <button onClick={() => adjustQty(p.id, 1, p.unit)} style={{ ...qtyBtnStyle, background: "var(--color-primary)" }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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

const qtyBtnStyle = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  border: "none",
  background: "var(--bg-pill)",
  color: "var(--text-primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};