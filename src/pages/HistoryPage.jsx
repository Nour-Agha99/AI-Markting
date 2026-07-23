import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw } from "lucide-react";
import { getHistory } from "../services/dataService";

const DATE_FILTERS = [
  { id: "day", label: "اليوم" },
  { id: "week", label: "الأسبوع" },
  { id: "month", label: "الشهر" },
  { id: "all", label: "الكل" },
];

const PAYMENT_LABELS = {
  cash: "كاش",
  bank_palestine: "بنك فلسطين",
  paly: "بال بي",
  jawwal: "جوال بي",
};

const TYPE_META = {
  sale: { label: "بيع", color: "var(--color-primary)", soft: "var(--color-primary-soft)" },
  debt: { label: "دين", color: "var(--color-danger)", soft: "var(--color-danger-soft)" },
  payment: { label: "سداد", color: "var(--color-success)", soft: "var(--color-success-soft)" },
};

function isWithinRange(dateStr, filter) {
  if (filter === "all") return true;
  const date = new Date(dateStr);
  const now = new Date();
  if (filter === "day") return date.toDateString() === now.toDateString();
  if (filter === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return date >= weekAgo;
  }
  if (filter === "month") {
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    return date >= monthAgo;
  }
  return true;
}

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

function itemsSummary(items) {
  if (!items || items.length === 0) return "";
  return items.map((it) => `${it.name} ${it.qty}${it.unit === "kg" ? "كغ" : ""}`).join(" · ");
}

export default function HistoryPage({ token }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    refresh();
  }, [token]);

  function refresh() {
    setLoading(true);
    setErrorMsg("");
    getHistory(token)
      .then((data) => setHistory([...data].sort((a, b) => new Date(b.date) - new Date(a.date))))
      .catch((err) => setErrorMsg(err.message || "ما قدرنا نجيب السجل."))
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((r) => {
      if (!isWithinRange(r.date, dateFilter)) return false;
      if (q && !(r.customerName || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [history, dateFilter, search]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const key = dayKey(r.date);
      if (!map.has(key)) map.set(key, { label: dayLabel(r.date), items: [] });
      map.get(key).items.push(r);
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, maxWidth: 714, margin: "auto" }}>
      <div className="section-header">
        <span className="section-title">السجل</span>
        <span className="section-count">{filtered.length}</span>
      </div>

      {errorMsg && (
        <div className="card" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", textAlign: "center", fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الزبون..."
            style={{ ...inputStyle, paddingRight: 36 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DATE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`pill filter-btn ${dateFilter === f.id ? "active" : ""}`}
              style={dateFilter !== f.id ? { background: "var(--bg-pill)", border: "1px solid var(--border-subtle)" } : undefined}
            >
              {f.label}
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
            ما في عمليات تطابق هاد الفلتر.
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 13, borderBottom: "1px solid var(--border-subtle)" }}>
              {group.label}
            </div>

            {group.items.map((r, idx) => {
              const meta = TYPE_META[r.type] || TYPE_META.sale;
              const summary = itemsSummary(r.items);
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "14px 16px",
                    borderBottom: idx === group.items.length - 1 ? "none" : "1px solid var(--border-subtle)",
                  }}
                >
                  <span
                    style={{
                      background: meta.soft, color: meta.color, fontSize: 11, fontWeight: 700,
                      padding: "3px 10px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap", marginTop: 2,
                    }}
                  >
                    {meta.label}
                  </span>

                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {r.customerName || "بدون اسم"}
                      <span style={{ color: meta.color }}> — ₪{Number(r.amount).toFixed(2)}</span>
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>
                      {new Date(r.date).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      {summary && ` · ${summary}`}
                      {r.paymentMethod && ` · ${PAYMENT_LABELS[r.paymentMethod] || r.paymentMethod}`}
                    </div>
                    {r.notes && (
                      <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>{r.notes}</div>
                    )}
                  </div>
                </div>
              );
            })}
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