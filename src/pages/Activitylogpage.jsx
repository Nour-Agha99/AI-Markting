import { useState, useEffect, useMemo, useCallback } from "react";
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

export const ACTION_META = {
  login: { label: "دخول", icon: LogIn, color: "var(--color-success)", soft: "var(--color-success-soft)" },
  logout: { label: "خروج", icon: LogOut, color: "var(--text-secondary)", soft: "var(--bg-pill)" },
  record_sale: { label: "بيع", icon: ShoppingBag, color: "var(--color-primary)", soft: "var(--color-primary-soft)" },
  record_debt: { label: "بيع كدين", icon: ShoppingBag, color: "var(--color-danger)", soft: "var(--color-danger-soft)" },
  pay_debt: { label: "سداد دين", icon: Wallet, color: "var(--color-success)", soft: "var(--color-success-soft)" },
  product_added: { label: "إضافة منتج", icon: PackagePlus, color: "var(--color-success)", soft: "var(--color-success-soft)" },
  product_updated: { label: "تعديل منتج", icon: PackagePlus, color: "var(--color-warning)", soft: "var(--color-warning-soft)" },
  delete_product: { label: "حذف منتج", icon: PackageMinus, color: "var(--color-danger)", soft: "var(--color-danger-soft)" },
  user_added: { label: "إضافة مستخدم", icon: UserPlus, color: "var(--color-primary)", soft: "var(--color-primary-soft)" },
  user_updated: { label: "تعديل مستخدم", icon: UserPlus, color: "var(--color-warning)", soft: "var(--color-warning-soft)" },
  user_enabled: { label: "تفعيل حساب", icon: UserCheck, color: "var(--color-success)", soft: "var(--color-success-soft)" },
  user_disabled: { label: "تعطيل حساب", icon: UserX, color: "var(--color-danger)", soft: "var(--color-danger-soft)" },
  force_logout: { label: "إنهاء جلسة", icon: Unplug, color: "var(--color-warning)", soft: "var(--color-warning-soft)" },
};

const DEFAULT_META = { label: "حركة", icon: CheckCircle2, color: "var(--text-secondary)", soft: "var(--bg-pill)" };

export function getActionMeta(action) {
  return ACTION_META[action] || DEFAULT_META;
}

const ACTION_GROUPS = [
  { id: "all", label: "الكل", actions: null },
  { id: "session", label: "دخول/خروج", actions: ["login", "logout"] },
  { id: "sales", label: "مبيعات وديون", actions: ["record_sale", "record_debt", "pay_debt"] },
  { id: "products", label: "منتجات", actions: ["product_added", "product_updated", "delete_product"] },
  { id: "users", label: "مستخدمين", actions: ["user_added", "user_updated", "user_enabled", "user_disabled", "force_logout"] },
];

const PAGE_SIZE = 30;

function dayLabel(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "اليوم";
  if (date.toDateString() === yesterday.toDateString()) return "امبارح";
  return date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
}

function dayKey(dateStr) {
  return new Date(dateStr).toDateString();
}

function formatDetails(action, details) {
  if (!details) return null;
  try {
    const d = typeof details === "string" ? JSON.parse(details) : details;
    if (action === "record_sale" || action === "record_debt") {
      const parts = [];
      if (d.customerName) parts.push(`الزبون: ${d.customerName}`);
      if (d.total != null) parts.push(`الإجمالي: ₪${Number(d.total).toFixed(2)}`);
      if (d.itemsCount != null) parts.push(`${d.itemsCount} صنف`);
      return parts.join(" · ");
    }
    if (action === "pay_debt") {
      const parts = [];
      if (d.customerName) parts.push(`الزبون: ${d.customerName}`);
      if (d.amount != null) parts.push(`المبلغ: ₪${Number(d.amount).toFixed(2)}`);
      if (d.remaining != null) parts.push(`المتبقي: ₪${Number(d.remaining).toFixed(2)}`);
      return parts.join(" · ");
    }
    if (action === "product_added" || action === "product_updated" || action === "delete_product") {
      return d.name ? `المنتج: ${d.name}` : null;
    }
    if (action === "user_added" || action === "user_updated" || action === "user_enabled" || action === "user_disabled") {
      return d.username ? `المستخدم: ${d.username}` : null;
    }
    if (action === "force_logout") {
      return d.closedSessions != null ? `تم إنهاء ${d.closedSessions} جلسة` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export default function ActivityLogPage({ token, onApiError }) {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getUsers(token).then(setUsers).catch(() => {});
  }, [token]);

  const activeActions = useMemo(
    () => ACTION_GROUPS.find((g) => g.id === selectedGroup)?.actions || null,
    [selectedGroup]
  );

  const load = useCallback(
    async (offset = 0, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setErrorMsg("");
      try {
        const data = await getActivityLog(
          { limit: PAGE_SIZE, offset, userId: selectedUserId || null, actions: activeActions },
          token
        );
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMore(data.hasMore);
        setNextOffset(data.nextOffset);
      } catch (err) {
        if (err?.code !== "SESSION_EXPIRED") {
          setErrorMsg(err.message || "ما قدرنا نجيب سجل النشاطات.");
        } else {
          onApiError?.(err);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [token, selectedUserId, activeActions, onApiError]
  );

  useEffect(() => {
    load(0, false);
  }, [selectedUserId, selectedGroup, token]);

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        (it.userName || "").toLowerCase().includes(q) ||
        (it.username || "").toLowerCase().includes(q)
    );
  }, [items, debouncedSearch]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const it of filteredItems) {
      const key = dayKey(it.date);
      if (!map.has(key)) map.set(key, { label: dayLabel(it.date), items: [] });
      map.get(key).items.push(it);
    }
    return Array.from(map.values());
  }, [filteredItems]);

  return (
    <div className="page-container">
      <div className="section-header">
        <span className="section-title">سجل النشاطات</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="section-count">{filteredItems.length} حركة</span>
          <button onClick={() => load(0, false)} disabled={loading} className="icon-btn-refresh">
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", textAlign: "center", fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="search-box">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المستخدم..."
            />
            <Search size={17} className="search-box-icon" />
          </div>

          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-pill)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              color: "var(--text-primary)",
              fontSize: 14,
              outline: "none",
            }}
          >
            <option value="">كل المستخدمين</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} (@{u.username})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ACTION_GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g.id)}
              className={`pill filter-btn ${selectedGroup === g.id ? "active" : ""}`}
              style={selectedGroup !== g.id ? { background: "var(--bg-pill)", border: "1px solid var(--border-subtle)" } : undefined}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {loading && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
            جاري التحميل...
          </div>
        )}
        {!loading && groups.length === 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
            ما في حركات تطابق هاد الفلتر.
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 13, borderBottom: "1px solid var(--border-subtle)" }}>
              {group.label}
            </div>

            {group.items.map((it) => {
              const meta = getActionMeta(it.action);
              const Icon = meta.icon;
              const detailText = formatDetails(it.action, it.details);
              return (
                <div key={it.id} className="history-row">
                  <span className="history-badge" style={{ background: meta.soft, color: meta.color, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Icon size={13} />
                    {meta.label}
                  </span>

                  <div className="history-content">
                    <div className="history-main">
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {it.userName || "غير معروف"}
                        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}> @{it.username}</span>
                      </div>
                      {detailText && (
                        <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{detailText}</div>
                      )}
                    </div>
                    <div className="history-time">
                      {it.date
                        ? new Date(it.date).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {!loading && hasMore && !debouncedSearch && (
          <div className="load-more-wrap">
            <button onClick={() => load(nextOffset, true)} disabled={loadingMore} className="load-more-btn">
              <ChevronDown size={16} />
              {loadingMore ? "جاري التحميل..." : "عرض المزيد"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}