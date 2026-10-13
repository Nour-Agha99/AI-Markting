import { useEffect, useMemo, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Wallet, AlertTriangle, PackageX, ChevronLeft } from "lucide-react";
import { getDashboard, getActivityLog } from "../services/dataService";
import { getActionMeta } from "./ActivityLogPage";
import "./DashboardPage.css";

const PAY_ORDER = [
  ["CASH", "نقداً"],
  ["BANK_PALESTINE", "بنك فلسطين"],
  ["PALPAY", "بال بي"],
  ["JAWWALPAY", "جوال بي"],
];

const money = (n) =>
  `₪${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const short = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
const unitLabel = (u) => (u === "kg" ? "كغ" : "قطعة");
const timeOf = (d) => (d ? new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "");

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "صباح الخير" : h < 17 ? "أهلاً فيك" : "مساء الخير";
}

const EMPTY = {
  days: Array.from({ length: 7 }, (_, i) => ({ t: Date.now() - (6 - i) * 86400000, total: 0 })),
  slip: { byMethod: {}, debt: 0, payments: 0, profit: 0, count: 0 },
  todayTotal: 0,
  weekTotal: 0,
  delta: null,
  outstanding: 0,
  cashIn: 0,
  hasProfit: false,
  top: [],
  bottom: [],
};

export default function DashboardPage({ token, mainProducts = [], username, onApiError, onNavigate }) {
  const [dash, setDash] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rank, setRank] = useState("top");

  async function refresh() {
    setLoading(true);
    setError("");
    const [d, a] = await Promise.allSettled([getDashboard(token), getActivityLog({ limit: 5, offset: 0 }, token)]);
    if (d.status === "fulfilled") setDash(d.value);
    else if (d.reason?.code === "SESSION_EXPIRED") {
      try {
        onApiError?.(d.reason);
      } catch {
        /* انتهت الجلسة */
      }
    } else setError(d.reason?.message || "ما قدرنا نجيب بيانات لوحة التحكم.");
    setActivity(a.status === "fulfilled" ? a.value.items : []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [token]);

  const data = dash || EMPTY;

  const attention = useMemo(
    () => mainProducts.filter((p) => p.quantity <= p.alertThreshold).sort((a, b) => a.quantity - b.quantity),
    [mainProducts]
  );
  const outCount = attention.filter((p) => p.quantity <= 0).length;
  const lowCount = attention.length - outCount;

  const { slip } = data;
  const max = Math.max(...data.days.map((d) => d.total), 1);
  const list = rank === "top" ? data.top : data.bottom;
  const listMax = Math.max(...list.map((p) => p.qty), 1);
  const blank = loading && history.length === 0;
  const dateLabel = new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="db-page">
      <header className="db-head">
        <div>
          <h2>
            {greeting()}
            {username ? `، ${username}` : ""}
          </h2>
          <p>{dateLabel}</p>
        </div>
        <button className="db-refresh" onClick={refresh} disabled={loading} aria-label="تحديث">
          <RefreshCw size={18} className={loading ? "db-spin" : ""} />
        </button>
      </header>

      {error && (
        <div className="db-error" role="alert">
          {error}
          <button onClick={refresh}>إعادة المحاولة</button>
        </div>
      )}

      {/* ===== إغلاق اليوم + آخر 7 أيام ===== */}
      <section className="db-hero">
        <div className="db-slip-wrap">
          <div className="db-slip">
            <div className="db-slip-title">إغلاق اليوم</div>
            <div className="db-slip-sub">
              {slip.count} {slip.count === 1 ? "عملية بيع" : "عمليات بيع"}
            </div>
            <hr />
            {blank ? (
              <div className="db-sk-lines">
                <span className="db-sk" />
                <span className="db-sk" />
                <span className="db-sk" />
              </div>
            ) : slip.count === 0 ? (
              <div className="db-slip-empty">ما في مبيعات اليوم بعد.</div>
            ) : (
              <>
                {PAY_ORDER.filter(([id]) => slip.byMethod[id] > 0 || id === "CASH").map(([id, label]) => (
                  <div className="db-row" key={id}>
                    <span>{label}</span>
                    <span>{money(slip.byMethod[id] || 0)}</span>
                  </div>
                ))}
                {slip.debt > 0 && (
                  <div className="db-row db-row--debt">
                    <span>بيع كدين</span>
                    <span>{money(slip.debt)}</span>
                  </div>
                )}
              </>
            )}
            <hr />
            <div className="db-row db-row--b">
              <span>إجمالي المبيعات</span>
              <span>{money(data.todayTotal)}</span>
            </div>
            <div className="db-row">
              <span>تسديدات ديون مستلمة</span>
              <span>{money(slip.payments)}</span>
            </div>
            {data.hasProfit && (
              <div className="db-row">
                <span>الربح</span>
                <span>{money(slip.profit)}</span>
              </div>
            )}
            <div className="db-total">
              <span>المقبوض اليوم</span>
              <span>{money(data.cashIn)}</span>
            </div>
            <small className="db-note">المقبوض = المبيعات المدفوعة + التسديدات، بدون الدين.</small>
          </div>
        </div>

        <div className="db-card db-week">
          <div className="db-week-head">
            <div>
              <span className="db-label">آخر 7 أيام</span>
              <b className="db-big">{blank ? "—" : money(data.weekTotal)}</b>
            </div>
            {data.delta !== null && (
              <span className={`db-delta ${data.delta >= 0 ? "up" : "down"}`}>
                {data.delta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {Math.abs(Math.round(data.delta))}% عن أمس
              </span>
            )}
          </div>
          <div className="db-bars" role="img" aria-label="مبيعات آخر 7 أيام">
            {data.days.map((d, i) => (
              <div key={d.t} className={`db-bar${i === 6 ? " is-today" : ""}`} title={money(d.total)}>
                <span className="db-bar-val">{d.total > 0 ? short(d.total) : ""}</span>
                <div className="db-bar-track">
                  <i style={{ height: `${Math.max(3, (d.total / max) * 100)}%` }} />
                </div>
                <small>{i === 6 ? "اليوم" : new Date(d.t).toLocaleDateString("ar-EG", { weekday: "short" })}</small>
              </div>
            ))}
          </div>
          <p className="db-foot">
            {data.hasProfit ? "المبالغ = قيمة المبيعات (دين وغير دين)." : "المبالغ إيراد (قيمة المبيعات) مش صافي الربح."}
          </p>
        </div>
      </section>

      {/* ===== مؤشرات تحتاج انتباه ===== */}
      <section className="db-kpis">
        <button className="db-kpi db-kpi--debt" onClick={() => onNavigate?.("debts")}>
          <span className="db-kpi-ic">
            <Wallet size={20} />
          </span>
          <span className="db-kpi-text">
            <small>ديون الزبائن المستحقة</small>
            <b>{blank ? "—" : money(data.outstanding)}</b>
          </span>
          <ChevronLeft size={18} className="db-chev" />
        </button>
        <button className="db-kpi db-kpi--warn" onClick={() => onNavigate?.("products")}>
          <span className="db-kpi-ic">
            <AlertTriangle size={20} />
          </span>
          <span className="db-kpi-text">
            <small>مخزون منخفض</small>
            <b>{lowCount}</b>
          </span>
        </button>
        <button className="db-kpi db-kpi--danger" onClick={() => onNavigate?.("products")}>
          <span className="db-kpi-ic">
            <PackageX size={20} />
          </span>
          <span className="db-kpi-text">
            <small>نفد</small>
            <b>{outCount}</b>
          </span>
        </button>
      </section>

      <section className="db-cols">
        <div className="db-card">
          <div className="db-card-head">
            <h3>المنتجات حسب المبيعات</h3>
            <div className="db-seg" role="group">
              <button className={rank === "top" ? "on" : ""} onClick={() => setRank("top")}>
                الأعلى
              </button>
              <button className={rank === "bottom" ? "on" : ""} onClick={() => setRank("bottom")}>
                الأقل
              </button>
            </div>
          </div>
          {list.length === 0 ? (
            <div className="db-empty">{blank ? "جاري التحميل..." : "ما في بيانات كافية."}</div>
          ) : (
            list.map((p) => (
              <div className="db-rank" key={p.name}>
                <div>
                  <span>{p.name}</span>
                  <b>
                    {p.qty.toFixed(p.unit === "kg" ? 1 : 0)} {unitLabel(p.unit)}
                  </b>
                </div>
                <div className="db-track">
                  <i className={rank} style={{ width: `${Math.max(6, (p.qty / listMax) * 100)}%` }} />
                </div>
              </div>
            ))
          )}
          <small className="db-foot">آخر 30 يوم تقريباً.</small>
        </div>

        <div className="db-card">
          <div className="db-card-head">
            <h3>يحتاج تعبئة</h3>
            <button className="db-link" onClick={() => onNavigate?.("products")}>
              المنتجات
              <ChevronLeft size={15} />
            </button>
          </div>
          {attention.length === 0 ? (
            <div className="db-ok">كل المنتجات مخزونها كافي.</div>
          ) : (
            attention.slice(0, 6).map((p) => {
              const out = p.quantity <= 0;
              return (
                <div className="db-stock" key={p.id}>
                  <div>
                    <span>{p.name}</span>
                    <b className={out ? "out" : "low"}>{out ? "نفد" : `${p.quantity} ${unitLabel(p.unit)}`}</b>
                  </div>
                  <div className="db-track">
                    <i
                      className={out ? "out" : "low"}
                      style={{ width: `${Math.min(100, (Math.max(p.quantity, 0) / Math.max(p.alertThreshold, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {activity.length > 0 && (
        <section className="db-card">
          <div className="db-card-head">
            <h3>آخر النشاطات</h3>
            <button className="db-link" onClick={() => onNavigate?.("activityLog")}>
              عرض الكل
              <ChevronLeft size={15} />
            </button>
          </div>
          {activity.map((it) => {
            const meta = getActionMeta(it.action);
            const Icon = meta.icon;
            return (
              <div className="db-act" key={it.id}>
                <span className="db-act-ic" style={{ background: meta.soft, color: meta.color }}>
                  <Icon size={15} />
                </span>
                <span className="db-act-text">
                  <b>{it.userName}</b>
                  <span style={{ color: meta.color }}>{meta.label}</span>
                </span>
                <small>{timeOf(it.date)}</small>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

