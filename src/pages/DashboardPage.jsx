import { useEffect, useMemo, useRef, useState } from "react";
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

const money = (n) => `₪${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const unitLabel = (u) => (u === "kg" ? "كغ" : "قطعة");
const timeOf = (d) => (d ? new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "");
const dayName = (t, i, n) => (i === n - 1 ? "اليوم" : new Date(t).toLocaleDateString("ar-EG", { weekday: "short" }));

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

// عدّاد أرقام: بيمشي من القيمة القديمة للجديدة. التأخير للمرة الأولى بس (عشان يتزامن مع طباعة الفاتورة).
function useCountUp(target, delay = 0, ms = 1000) {
  const [val, setVal] = useState(0);
  const cur = useRef(0);
  const first = useRef(true);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cur.current = target;
      setVal(target);
      return;
    }
    const wait = first.current ? delay : 0;
    first.current = false;
    const from = cur.current;
    let raf;
    let t0;
    const step = (t) => {
      t0 ??= t;
      const p = Math.min(1, (t - t0) / ms);
      cur.current = from + (target - from) * (1 - Math.pow(1 - p, 3));
      setVal(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const id = setTimeout(() => (raf = requestAnimationFrame(step)), wait);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(raf);
    };
  }, [target, delay, ms]);
  return val;
}
const Money = ({ value, delay }) => money(useCountUp(value, delay));

// منحنى ناعم بدون تجاوز: نقطتَي التحكم بنص المسافة الأفقية
function curve(pts) {
  return pts.reduce((d, [x, y], i) => {
    if (!i) return `M${x} ${y}`;
    const [px, py] = pts[i - 1];
    const mx = (px + x) / 2;
    return `${d} C${mx} ${py} ${mx} ${y} ${x} ${y}`;
  }, "");
}

function WeekChart({ days }) {
  const n = days.length;
  const [hover, setHover] = useState(null);
  const max = Math.max(...days.map((d) => d.total), 1);
  // RTL: الأقدم عاليمين واليوم عاليسار، عشان يطابق ترتيب القراءة
  const pts = days.map((d, i) => [100 - ((i + 0.5) / n) * 100, 92 - (d.total / max) * 74]);
  const line = curve(pts);
  const area = `${line} L${pts[n - 1][0]} 100 L${pts[0][0]} 100 Z`;
  const on = hover ?? n - 1;

  return (
    <div className="db-chart" style={{ "--n": n }} onMouseLeave={() => setHover(null)}>
      <div className="db-plot" role="img" aria-label="مبيعات آخر 7 أيام">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="db-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-primary)", stopOpacity: 0.3 }} />
              <stop offset="1" style={{ stopColor: "var(--color-primary)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#db-fill)" />
          <path className="db-line" d={line} />
        </svg>
        {days.map((d, i) => (
          <span
            key={d.t}
            className={`db-pt${i === 0 ? " e-r" : ""}${i === n - 1 ? " e-l" : ""}${i === on ? " is-on" : ""}`}
            style={{ left: `${pts[i][0]}%`, top: `${pts[i][1]}%` }}
          >
            <i />
            {i === on && <b>{money(d.total)}</b>}
          </span>
        ))}
        <div className="db-hits">
          {days.map((d, i) => (
            <button
              key={d.t}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => setHover(i)}
              aria-label={`${dayName(d.t, i, n)}: ${money(d.total)}`}
            />
          ))}
        </div>
      </div>
      <div className="db-days">
        {days.map((d, i) => (
          <small key={d.t} className={i === on ? "is-on" : ""}>
            {dayName(d.t, i, n)}
          </small>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage({ token, mainProducts = [], username, onApiError, onNavigate }) {
  const [dash, setDash] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rank, setRank] = useState("top");
  const [updated, setUpdated] = useState(null);

  async function refresh(silent = false) {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    const [d, a] = await Promise.allSettled([getDashboard(token), getActivityLog({ limit: 5, offset: 0 }, token)]);
    if (d.status === "fulfilled") {
      setDash(d.value);
      setUpdated(new Date());
      setError("");
    } else if (d.reason?.code === "SESSION_EXPIRED") {
      try {
        onApiError?.(d.reason);
      } catch {
        /* انتهت الجلسة */
      }
    } else if (!silent) setError(d.reason?.message || "ما قدرنا نجيب بيانات لوحة التحكم.");
    if (a.status === "fulfilled") setActivity(a.value.items);
    setLoading(false);
  }

  // تحديث هادئ كل دقيقتين والصفحة مفتوحة
  useEffect(() => {
    refresh();
    const id = setInterval(() => !document.hidden && refresh(true), 120000);
    return () => clearInterval(id);
  }, [token]);

  const data = dash || EMPTY;
  const blank = !dash;

  const attention = useMemo(
    () => mainProducts.filter((p) => p.quantity <= p.alertThreshold).sort((a, b) => a.quantity - b.quantity),
    [mainProducts]
  );
  const outCount = attention.filter((p) => p.quantity <= 0).length;
  const lowCount = attention.length - outCount;

  const { slip } = data;
  const list = rank === "top" ? data.top : data.bottom;
  const listMax = Math.max(...list.map((p) => p.qty), 1);
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
        <div className="db-head-end">
          {updated && (
            <span className="db-live">
              <i />
              آخر تحديث {timeOf(updated)}
            </span>
          )}
          <button className="db-refresh" onClick={() => refresh()} disabled={loading} aria-label="تحديث">
            <RefreshCw size={18} className={loading ? "db-spin" : ""} />
          </button>
        </div>
      </header>

      {error && (
        <div className="db-error" role="alert">
          {error}
          <button onClick={() => refresh()}>إعادة المحاولة</button>
        </div>
      )}

      <section className="db-hero">
        <div className={`db-slip-wrap${blank ? "" : " is-print"}`} key={blank ? "wait" : "ready"}>
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
              <span>{blank ? "—" : <Money value={data.todayTotal} delay={900} />}</span>
            </div>
            <div className="db-row">
              <span>تسديدات ديون مستلمة</span>
              <span>{blank ? "—" : money(slip.payments)}</span>
            </div>
            {data.hasProfit && (
              <div className="db-row">
                <span>الربح</span>
                <span>{money(slip.profit)}</span>
              </div>
            )}
            <div className="db-total">
              <span>المقبوض اليوم</span>
              <span>{blank ? "—" : <Money value={data.cashIn} delay={1000} />}</span>
            </div>
            <small className="db-note">المقبوض = المبيعات المدفوعة + التسديدات، بدون الدين.</small>
          </div>
        </div>

        <div className="db-panel db-week">
          <div className="db-week-head">
            <div>
              <span className="db-label">آخر 7 أيام</span>
              <b className="db-big">{blank ? "—" : <Money value={data.weekTotal} delay={1100} />}</b>
            </div>
            {data.delta !== null && (
              <span className={`db-delta ${data.delta >= 0 ? "up" : "down"}`}>
                {data.delta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                {Math.abs(Math.round(data.delta))}% عن أمس
              </span>
            )}
          </div>
          {blank ? <div className="db-skb" /> : <WeekChart days={data.days} />}
          <p className="db-foot">
            {data.hasProfit ? "المبالغ = قيمة المبيعات (دين وغير دين)." : "المبالغ إيراد (قيمة المبيعات) مش صافي الربح."}
          </p>
        </div>
      </section>

      <section className="db-kpis">
        <button className={`db-kpi db-kpi--debt${data.outstanding > 0 ? " has" : ""}`} onClick={() => onNavigate?.("debts")}>
          <span className="db-kpi-ic">
            <Wallet size={20} />
          </span>
          <span className="db-kpi-text">
            <small>ديون الزبائن المستحقة</small>
            <b>{blank ? "—" : <Money value={data.outstanding} delay={1100} />}</b>
          </span>
          <ChevronLeft size={18} className="db-chev" />
        </button>
        <button className={`db-kpi db-kpi--warn${lowCount ? " has" : ""}`} onClick={() => onNavigate?.("products")}>
          <span className="db-kpi-ic">
            <AlertTriangle size={20} />
          </span>
          <span className="db-kpi-text">
            <small>مخزون منخفض</small>
            <b>{lowCount}</b>
          </span>
        </button>
        <button className={`db-kpi db-kpi--danger${outCount ? " has" : ""}`} onClick={() => onNavigate?.("products")}>
          <span className="db-kpi-ic">
            <PackageX size={20} />
          </span>
          <span className="db-kpi-text">
            <small>نفد</small>
            <b>{outCount}</b>
          </span>
        </button>
      </section>

      <section className="db-panel db-cols">
        <div>
          <div className="db-ph">
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
            list.map((p, i) => (
              <div className="db-rank" key={`${rank}-${p.name}`}>
                <div>
                  <span>{p.name}</span>
                  <b>
                    {p.qty.toFixed(p.unit === "kg" ? 1 : 0)} {unitLabel(p.unit)}
                  </b>
                </div>
                <div className="db-track">
                  <i className={rank} style={{ width: `${Math.max(6, (p.qty / listMax) * 100)}%`, "--i": i }} />
                </div>
              </div>
            ))
          )}
          <small className="db-foot">آخر 30 يوم تقريباً.</small>
        </div>

        <div>
          <div className="db-ph">
            <h3>يحتاج تعبئة</h3>
            <button className="db-link" onClick={() => onNavigate?.("products")}>
              المنتجات
              <ChevronLeft size={15} />
            </button>
          </div>
          {attention.length === 0 ? (
            <div className="db-ok">كل المنتجات مخزونها كافي.</div>
          ) : (
            attention.slice(0, 6).map((p, i) => {
              const out = p.quantity <= 0;
              return (
                <div className="db-rank" key={p.id}>
                  <div>
                    <span>{p.name}</span>
                    <b className={out ? "out" : "low"}>{out ? "نفد" : `${p.quantity} ${unitLabel(p.unit)}`}</b>
                  </div>
                  <div className="db-track">
                    <i
                      className={out ? "out" : "low"}
                      style={{ width: `${Math.min(100, (Math.max(p.quantity, 0) / Math.max(p.alertThreshold, 1)) * 100)}%`, "--i": i }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {activity.length > 0 && (
        <section className="db-panel">
          <div className="db-ph">
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