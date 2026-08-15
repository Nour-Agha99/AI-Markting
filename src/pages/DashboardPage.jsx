import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Wallet, RefreshCw, ArrowLeft } from "lucide-react";
import { getHistory, getActivityLog } from "../services/dataService";
import { getActionMeta } from "./ActivityLogPage";

function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisWeek(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  return d >= weekAgo;
}

function isLast30Days(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(now.getDate() - 30);
  return d >= monthAgo;
}

export default function DashboardPage({ token, mainProducts, onApiError, onNavigate }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    refresh();
    refreshActivity();
  }, [token]);

  function refresh() {
    setLoading(true);
    setErrorMsg("");
    getHistory(token)
      .then((data) => setHistory(data))
      .catch((err) => {
        if (err?.code !== "SESSION_EXPIRED") {
          setErrorMsg(err.message || "ما قدرنا نجيب بيانات لوحة التحكم.");
        } else {
          onApiError?.(err);
        }
      })
      .finally(() => setLoading(false));
  }

  function refreshActivity() {
    setActivityLoading(true);
    getActivityLog({ limit: 5, offset: 0 }, token)
      .then((data) => setRecentActivity(data.items))
      .catch(() => {
        setRecentActivity([]);
      })
      .finally(() => setActivityLoading(false));
  }

  // إيرادات = بيع نقدي أو دين، بدون سداد الديون (تجنب الاحتساب المزدوج)
  const salesRecords = useMemo(
    () => history.filter((r) => r.type === "sale" || r.type === "debt"),
    [history]
  );

  const revenueToday = useMemo(
    () =>
      salesRecords
        .filter((r) => isToday(r.date))
        .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [salesRecords]
  );

  const revenueWeek = useMemo(
    () =>
      salesRecords
        .filter((r) => isThisWeek(r.date))
        .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [salesRecords]
  );

  const salesCountToday = useMemo(
    () => salesRecords.filter((r) => isToday(r.date)).length,
    [salesRecords]
  );

  const lowStockProducts = useMemo(
    () => (mainProducts || []).filter((p) => p.quantity <= p.alertThreshold),
    [mainProducts]
  );

  const productStats = useMemo(() => {
    const map = new Map();
    for (const r of salesRecords) {
      if (!isLast30Days(r.date)) continue;
      for (const it of r.items || []) {
        const key = it.name;
        const qty = Number(it.qty) || 0;
        const unit = it.unit === "kg" ? "كغ" : "قطعة";
        if (!map.has(key)) map.set(key, { name: key, qty: 0, unit });
        map.get(key).qty += qty;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [salesRecords]);

  const topProducts = productStats.slice(0, 5);
  const bottomProducts = [...productStats].reverse().slice(0, 5);
  const maxQty = topProducts[0]?.qty || 1;

  return (
    <div className="page-container">
      <div className="section-header">
        <span className="section-title">لوحة التحكم</span>
        <button onClick={refresh} disabled={loading} style={iconBtnStyle}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
        </button>
      </div>

      {errorMsg && (
        <div
          className="card"
          style={{
            background: "var(--color-danger-soft)",
            color: "var(--color-danger)",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="dashboard-stats-grid">
        <div className="stat-card primary">
          <div className="stat-label">
            <Wallet
              size={14}
              style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }}
            />
            إيراد اليوم
          </div>
          <div className="stat-value">₪{revenueToday.toFixed(2)}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>
            {salesCountToday} عملية بيع
          </div>
        </div>

        <div className="stat-card primary">
          <div className="stat-label">إيراد آخر 7 أيام</div>
          <div className="stat-value">₪{revenueWeek.toFixed(2)}</div>
        </div>

        <div className={`stat-card ${lowStockProducts.length > 0 ? "danger" : "success"}`}>
          <div className="stat-label">
            <AlertTriangle
              size={14}
              style={{ display: "inline", verticalAlign: "-2px", marginLeft: 4 }}
            />
            منتجات بمخزون منخفض
          </div>
          <div className="stat-value">{lowStockProducts.length}</div>
        </div>
      </div>

      <div
        className="card"
        style={{
          background: "var(--color-warning-soft)",
          color: "var(--text-secondary)",
          fontSize: 12.5,
          lineHeight: 1.7,
        }}
      >
        ⚠️ ملاحظة: الأرقام أعلاه بتمثل <b>الإيراد</b> (قيمة المبيعات) مش صافي الربح، لأنه
        سجل العمليات الحالي ما بيخزّن سعر التكلفة وقت كل عملية بيع. لحساب الربح الحقيقي بدقة
        محتاجين تعديل بسيط على استعلام السجل بالباك إند.
      </div>

      {/* ---------- ويدجت آخر النشاطات ---------- */}
      <div className="card">
        <div className="section-header">
          <span className="section-title">آخر النشاطات</span>
          <button
            onClick={() => onNavigate?.("activityLog")}
            className="pill"
            style={{
              background: "var(--color-primary-soft)",
              color: "var(--color-primary)",
              border: "none",
              fontSize: 12,
              padding: "6px 12px",
            }}
          >
            عرض الكل
            <ArrowLeft size={13} />
          </button>
        </div>

        {activityLoading && (
          <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: 12 }}>
            جاري التحميل...
          </div>
        )}
        {!activityLoading && recentActivity.length === 0 && (
          <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: 12 }}>
            ما في نشاطات مسجلة بعد.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recentActivity.map((it) => {
            const meta = getActionMeta(it.action);
            const Icon = meta.icon;
            return (
              <div
                key={it.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "var(--bg-card-alt)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: meta.soft,
                    color: meta.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {it.userName} <span style={{ color: meta.color, fontWeight: 500 }}>· {meta.label}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {it.date ? new Date(it.date).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dashboard-products-grid">
        <div className="card">
          <div className="section-header">
            <span className="section-title">
              <TrendingUp
                size={15}
                color="var(--color-success)"
                style={{ display: "inline", verticalAlign: "-3px", marginLeft: 4 }}
              />
              الأعلى مبيعاً (آخر 30 يوم)
            </span>
          </div>
          {loading && (
            <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: 12 }}>
              جاري التحميل...
            </div>
          )}
          {!loading && topProducts.length === 0 && (
            <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: 12 }}>
              ما في بيانات كافية.
            </div>
          )}
          {topProducts.map((p) => (
            <div key={p.name} className="dashboard-bar-row">
              <div className="dashboard-bar-label">
                <span>{p.name}</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {p.qty.toFixed(p.unit === "كغ" ? 2 : 0)} {p.unit}
                </span>
              </div>
              <div className="dashboard-bar-track">
                <div
                  className="dashboard-bar-fill success"
                  style={{ width: `${Math.max(6, (p.qty / maxQty) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-header">
            <span className="section-title">
              <TrendingDown
                size={15}
                color="var(--color-danger)"
                style={{ display: "inline", verticalAlign: "-3px", marginLeft: 4 }}
              />
              الأقل مبيعاً (آخر 30 يوم)
            </span>
          </div>
          {!loading && bottomProducts.length === 0 && (
            <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: 12 }}>
              ما في بيانات كافية.
            </div>
          )}
          {bottomProducts.map((p) => (
            <div key={p.name} className="dashboard-bar-row">
              <div className="dashboard-bar-label">
                <span>{p.name}</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {p.qty.toFixed(p.unit === "كغ" ? 2 : 0)} {p.unit}
                </span>
              </div>
              <div className="dashboard-bar-track">
                <div
                  className="dashboard-bar-fill danger"
                  style={{ width: `${Math.max(6, (p.qty / maxQty) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="card">
          <div className="section-header">
            <span className="section-title">تنبيهات المخزون المنخفض</span>
            <span className="section-count">{lowStockProducts.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "var(--bg-card-alt)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: "var(--color-danger)", fontSize: 13, fontWeight: 600 }}>
                  متبقي {p.quantity} {p.unit === "kg" ? "كغ" : "قطعة"} (الحد {p.alertThreshold})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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