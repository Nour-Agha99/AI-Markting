import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LogIn,
  LogOut,
  ShoppingBag,
  Wallet,
  CheckCircle2,
  PackagePlus,
  PackageMinus,
  UserPlus,
  UserCheck,
  UserX,
  Unplug,
  Search,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { getActivityLog, getUsers } from "../services/dataService";
import { ROLE_LABELS } from "../utils/roles";
import "./ActivityLogPage.css";

const DELETE_META = { label: "حذف منتج", icon: PackageMinus, color: "var(--color-danger)", soft: "var(--color-danger-soft)", risk: true };
export const ACTION_META = {
  login: { label: "دخول", icon: LogIn, color: "var(--color-success)", soft: "var(--color-success-soft)" },
  logout: { label: "خروج", icon: LogOut, color: "var(--text-secondary)", soft: "var(--bg-pill)" },
  record_sale: { label: "بيع", icon: ShoppingBag, color: "var(--color-primary)", soft: "var(--color-primary-soft)" },
  record_debt: { label: "بيع كدين", icon: ShoppingBag, color: "var(--color-warning)", soft: "var(--color-warning-soft)" },
  pay_debt: { label: "سداد دين", icon: Wallet, color: "var(--color-success)", soft: "var(--color-success-soft)" },
  product_added: { label: "إضافة منتج", icon: PackagePlus, color: "var(--color-success)", soft: "var(--color-success-soft)" },
  product_updated: { label: "تعديل منتج", icon: PackagePlus, color: "var(--color-warning)", soft: "var(--color-warning-soft)" },
  delete_product: DELETE_META,
  "delete:product_status_toggled": DELETE_META, // الاسم اللي بيسجّله ورك فلو الحذف حالياً
  user_added: { label: "إضافة مستخدم", icon: UserPlus, color: "var(--color-primary)", soft: "var(--color-primary-soft)", risk: true },
  user_updated: { label: "تعديل مستخدم", icon: UserPlus, color: "var(--color-warning)", soft: "var(--color-warning-soft)", risk: true },
  user_enabled: { label: "تفعيل حساب", icon: UserCheck, color: "var(--color-success)", soft: "var(--color-success-soft)", risk: true },
  user_disabled: { label: "تعطيل حساب", icon: UserX, color: "var(--color-danger)", soft: "var(--color-danger-soft)", risk: true },
  force_logout: { label: "إنهاء جلسة", icon: Unplug, color: "var(--color-warning)", soft: "var(--color-warning-soft)", risk: true },
  customer_added: { label: "إضافة زبون", icon: UserPlus, color: "var(--color-primary)", soft: "var(--color-primary-soft)" },
  customer_updated: { label: "تعديل زبون", icon: UserPlus, color: "var(--color-warning)", soft: "var(--color-warning-soft)" },
  login_failed: { label: "محاولة دخول فاشلة", icon: UserX, color: "var(--color-danger)", soft: "var(--color-danger-soft)", risk: true },
  login_locked: { label: "قفل بسبب محاولات", icon: UserX, color: "var(--color-danger)", soft: "var(--color-danger-soft)", risk: true },
  permission_denied: { label: "محاولة بدون صلاحية", icon: UserX, color: "var(--color-warning)", soft: "var(--color-warning-soft)", risk: true },
  agent_action_requested: { label: "وكيل طلب إجراء", icon: Bot, color: "var(--color-primary)", soft: "var(--color-primary-soft)" },
  agent_action_approved: { label: "موافقة على إجراء وكيل", icon: Bot, color: "var(--color-success)", soft: "var(--color-success-soft)", risk: true },
  agent_action_rejected: { label: "رفض إجراء وكيل", icon: Bot, color: "var(--text-secondary)", soft: "var(--bg-pill)" },
  agent_action_executed: { label: "تنفيذ إجراء وكيل", icon: Bot, color: "var(--color-success)", soft: "var(--color-success-soft)", risk: true },
  agent_action_failed: { label: "فشل إجراء وكيل", icon: Bot, color: "var(--color-danger)", soft: "var(--color-danger-soft)", risk: true },
  agent_report_sent: { label: "تقرير وكيل", icon: Bot, color: "var(--color-primary)", soft: "var(--color-primary-soft)" },
};
const DEFAULT_META = { label: "حركة", icon: CheckCircle2, color: "var(--text-secondary)", soft: "var(--bg-pill)" };
export const getActionMeta = (action) => ACTION_META[action] || DEFAULT_META;

const ACTION_GROUPS = [
  { id: "all", label: "الكل", actions: null },
  { id: "session", label: "دخول وخروج", actions: ["login", "logout", "login_failed", "login_locked", "permission_denied"] },
  { id: "sales", label: "مبيعات وديون", actions: ["record_sale", "record_debt", "pay_debt", "customer_added", "customer_updated"] },
  { id: "products", label: "منتجات", actions: ["product_added", "product_updated", "delete_product", "delete:product_status_toggled"] },
  { id: "users", label: "مستخدمين", actions: ["user_added", "user_updated", "user_enabled", "user_disabled", "force_logout"] },
  { id: "agents", label: "وكلاء", actions: ["agent_action_requested", "agent_action_approved", "agent_action_rejected", "agent_action_executed", "agent_action_failed", "agent_report_sent"] },
];

const PAGE_SIZE = 30;
const money = (n) => `₪${Number(n).toFixed(2)}`;
const timeOf = (d) => (d ? new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—");
const dayKey = (d) => new Date(d).toDateString();

function dayLabel(d) {
  const date = new Date(d);
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return "اليوم";
  if (date.toDateString() === y.toDateString()) return "امبارح";
  return date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
}

function detailParts(action, details) {
  if (!details) return [];
  let d = details;
  try {
    d = typeof details === "string" ? JSON.parse(details) : details;
  } catch {
    return [];
  }
  const out = [];
  switch (action) {
    case "record_sale":
    case "record_debt":
      if (d.customerName) out.push(`الزبون: ${d.customerName}`);
      if (d.total != null) out.push(`الإجمالي ${money(d.total)}`);
      if (d.itemsCount != null) out.push(`${d.itemsCount} صنف`);
      break;
    case "pay_debt":
      if (d.customerName) out.push(`الزبون: ${d.customerName}`);
      if (d.amount != null) out.push(`دفع ${money(d.amount)}`);
      if (d.remaining != null) out.push(`المتبقي ${money(d.remaining)}`);
      break;
    case "product_added":
    case "product_updated":
    case "delete_product":
    case "delete:product_status_toggled":
      if (d.name) out.push(`المنتج: ${d.name}`);
      if (d.productDetails?.sellPrice != null && action !== "delete_product") out.push(`سعر البيع ${money(d.productDetails.sellPrice)}`);
      break;
    case "user_added":
    case "user_updated":
      if (d.username) out.push(`المستخدم: ${d.username}`);
      if (d.role) out.push(`الدور: ${ROLE_LABELS[d.role] || d.role}`);
      break;
    case "user_enabled":
    case "user_disabled":
      if (d.targetUsername || d.username) out.push(`المستخدم: ${d.targetUsername || d.username}`);
      break;
    case "force_logout":
      if (d.closedSessions != null) out.push(`تم إنهاء ${d.closedSessions} جلسة`);
      break;
    case "customer_added":
    case "customer_updated":
      if (d.name) out.push(`الزبون: ${d.name}`);
      if (d.creditLimit && typeof d.creditLimit === "object") out.push(`حد الدين: ${d.creditLimit.from ?? "بدون"} ← ${d.creditLimit.to ?? "بدون"}`);
      break;
    case "login_failed":
    case "login_locked":
      if (d.username) out.push(`المستخدم: ${d.username}`);
      if (d.ip) out.push(`IP: ${d.ip}`);
      break;
    case "agent_action_requested":
    case "agent_action_approved":
    case "agent_action_rejected":
    case "agent_action_executed":
    case "agent_action_failed":
      if (d.agent) out.push(`الوكيل: ${d.agent}`);
      if (d.actionType) out.push(`الإجراء: ${d.actionType}`);
      break;
    default:
  }
  return out;
}

const hue = (name) => {
  let h = 0;
  for (const c of name || "؟") h = c.charCodeAt(0) + ((h << 5) - h);
  return Math.abs(h) % 4;
};

export default function ActivityLogPage({ token, onApiError }) {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [userId, setUserId] = useState("");
  const [group, setGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const apiErr = useRef(onApiError);
  const countRef = useRef(0);
  useEffect(() => {
    apiErr.current = onApiError;
    countRef.current = items.length;
  });

  const actions = useMemo(() => ACTION_GROUPS.find((g) => g.id === group)?.actions || null, [group]);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    getUsers(token).then(setUsers).catch(() => { });
  }, [token]);

  const load = useCallback(
    async (offset = 0, append = false, silent = false) => {
      if (append) setLoadingMore(true);
      else if (!silent) setLoading(true);
      if (!silent) setError("");
      try {
        const data = await getActivityLog({ limit: PAGE_SIZE, offset, userId: userId || null, actions }, token);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMore(data.hasMore);
        setNextOffset(data.nextOffset);
      } catch (err) {
        if (err?.code === "SESSION_EXPIRED") {
          try {
            apiErr.current?.(err);
          } catch {
            /* انتهت الجلسة */
          }
        } else if (!silent) setError(err.message || "ما قدرنا نجيب سجل النشاطات.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, userId, actions]
  );

  useEffect(() => {
    load(0, false);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden && countRef.current <= PAGE_SIZE) load(0, false, true);
    }, 30000);
    return () => clearInterval(id);
  }, [load]);

  const rows = useMemo(
    () =>
      items
        .map((it) => ({ it, meta: getActionMeta(it.action), parts: detailParts(it.action, it.details) }))
        .filter(({ it, parts }) => {
          if (!q) return true;
          return `${it.userName || ""} ${it.username || ""} ${parts.join(" ")}`.toLowerCase().includes(q);
        }),
    [items, q]
  );

  const groups = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const k = dayKey(r.it.date);
      if (!map.has(k)) map.set(k, { key: k, label: dayLabel(r.it.date), rows: [] });
      map.get(k).rows.push(r);
    }
    return [...map.values()];
  }, [rows]);

  return (
    <div className="ac-page">
      <header className="ac-head">
        <div className="ac-title">
          <h1>سجل النشاطات</h1>
          <p>
            <i className="ac-live" />
            كل حركة بالنظام، بتتحدّث لحالها كل 30 ثانية.
          </p>
        </div>
        <div className="ac-head-end">
          <span className="ac-count">{rows.length} حركة</span>
          <button className="ac-refresh" onClick={() => load(0, false)} disabled={loading} aria-label="تحديث">
            <RefreshCw size={18} className={loading ? "ac-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="ac-toolbar">
        <div className="ac-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالتفاصيل: اسم زبون، منتج، مستخدم..."
            aria-label="بحث بالنشاطات"
          />
        </div>

        {users.length > 0 && (
          <div className="ac-chips" role="group" aria-label="المستخدم">
            <button className={!userId ? "on" : ""} onClick={() => setUserId("")}>
              الكل
            </button>
            {users.map((u) => (
              <button key={u.id} className={userId === u.id ? "on" : ""} onClick={() => setUserId(userId === u.id ? "" : u.id)}>
                <span className={`ac-mini ac-mini-${hue(u.fullName)}`}>{(u.fullName || "؟").trim().charAt(0)}</span>
                {(u.fullName || u.username).split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        <div className="ac-pills" role="group" aria-label="نوع الحركة">
          {ACTION_GROUPS.map((g) => (
            <button key={g.id} className={group === g.id ? "on" : ""} onClick={() => setGroup(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="ac-error" role="alert">
          {error}
          <button onClick={() => load(0, false)}>إعادة المحاولة</button>
        </div>
      )}

      {loading && items.length === 0 && (
        <ul className="ac-tl">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="ac-item">
              <span className="ac-sk" style={{ width: 34, height: 34, borderRadius: "50%" }} />
              <span className="ac-body">
                <span className="ac-sk" style={{ width: "50%", height: 14 }} />
                <span className="ac-sk" style={{ width: "70%", height: 11 }} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && groups.length === 0 && <div className="ac-empty">ما في حركات بتطابق الفلتر.</div>}

      {groups.map((g) => (
        <section key={g.key} className="ac-day-group">
          <h3 className="ac-day">
            <span>{g.label}</span>
            <small>{g.rows.length} حركة</small>
          </h3>
          <ul className="ac-tl">
            {g.rows.map(({ it, meta, parts }) => {
              const Icon = meta.icon;
              return (
                <li key={it.id} className={`ac-item${meta.risk ? " is-risk" : ""}`}>
                  <span className="ac-node" style={{ "--c": meta.color, "--s": meta.soft }}>
                    <Icon size={16} />
                  </span>
                  <div className="ac-body">
                    <div className="ac-line">
                      <b>{it.userName || "غير معروف"}</b>
                      <span className="ac-act" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      {meta.risk && <em className="ac-risk">حساس</em>}
                    </div>
                    {parts.length > 0 && (
                      <div className="ac-det">
                        {parts.map((p) => (
                          <span key={p}>{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <time>{timeOf(it.date)}</time>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {!loading && hasMore && !q && (
        <button className="ac-more" onClick={() => load(nextOffset, true)} disabled={loadingMore}>
          <ChevronDown size={16} />
          {loadingMore ? "جاري التحميل..." : "عرض المزيد"}
        </button>
      )}
    </div>
  );
}