import { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, ChevronDown } from "lucide-react";
import { getHistory } from "../services/dataService";

const DATE_FILTERS = [
  { id: "day", label: "اليوم" },
  { id: "week", label: "الأسبوع" },
  { id: "month", label: "الشهر" },
  { id: "all", label: "الكل" },
];

const PAYMENT_LABELS = {
  CASH: "كاش",
  BANK_PALESTINE: "بنك فلسطين",
  PALPAY: "بال بي",
  JAWWALPAY: "جوال بي",
};

const TYPE_META = {
  sale: { label: "بيع", color: "var(--color-primary)", soft: "var(--color-primary-soft)" },
  debt: { label: "دين", color: "var(--color-danger)", soft: "var(--color-danger-soft)" },
  payment: { label: "سداد", color: "var(--color-success)", soft: "var(--color-success-soft)" },
};

function isWithinRange(dateStr, filter) {
  if (filter === "all") return true;
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (filter === "day") return date.getTime() === now.getTime();
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

function HistoryRowSkeleton() {
  return (
    <div className="history-row">
      <div className="skeleton" style={{ width: 46, height: 24, borderRadius: 999, flexShrink: 0 }} />
      <div className="history-content" style={{ flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 160 }}>
          <div className="skeleton" style={{ width: "55%", height: 14 }} />
          <div className="skeleton" style={{ width: "35%", height: 11 }} />
        </div>
        <div className="skeleton" style={{ width: 40, height: 11 }} />
      </div>
    </div>
  );
}

function HistoryGroupSkeleton({ rows = 3 }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="skeleton" style={{ width: 70, height: 12 }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <HistoryRowSkeleton key={i} />
      ))}
    </div>
  );
}

export default function HistoryPage({ token }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    refresh();
  }, [token]);

  useEffect(() => {
    setVisibleCount(30);
  }, [dateFilter, debouncedSearch]);

  function refresh() {
    setLoading(true);
    setErrorMsg("");
    getHistory(token)
      .then((data) => setHistory([...data].sort((a, b) => new Date(b.date) - new Date(a.date))))
      .catch((err) => setErrorMsg(err.message || "ما قدرنا نجيب السجل."))
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return history.filter((r) => {
      if (!isWithinRange(r.date, dateFilter)) return false;
      if (q && !(r.customerName || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [history, dateFilter, debouncedSearch]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const r of filtered.slice(0, visibleCount)) {
      const key = dayKey(r.date);
      if (!map.has(key)) map.set(key, { label: dayLabel(r.date), items: [] });
      map.get(key).items.push(r);
    }
    return Array.from(map.values());
  }, [filtered, visibleCount]);

  return (
    <div className="page-container">
      <div className="section-header">
        <span className="section-title">السجل</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="section-count">{filtered.length} عملية</span>
          <button onClick={refresh} disabled={loading} className="icon-btn-refresh">
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
        <div className="search-box">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الزبون..."
          />
          <Search size={17} className="search-box-icon" />
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
          <>
            <HistoryGroupSkeleton rows={4} />
            <HistoryGroupSkeleton rows={2} />
          </>
        )}

        {!loading && groups.length === 0 && (
          <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
            ما في عمليات تطابق هاد الفلتر.
          </div>
        )}

        {!loading && groups.map((group) => (
          <div key={group.label} className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 13, borderBottom: "1px solid var(--border-subtle)" }}>
              {group.label}
            </div>

            {group.items.map((r) => {
              const meta = TYPE_META[r.type] || TYPE_META.sale;
              return (
                <div key={r.id} className="history-row">
                  <span className="history-badge" style={{ background: meta.soft, color: meta.color }}>
                    {meta.label}
                  </span>

                  <div className="history-content">
                    <div className="history-main">
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {r.customerName || "بدون اسم"}
                        <span style={{ color: meta.color }}> — ₪{Number(r.amount).toFixed(2)}</span>
                      </div>

                      {r.items && r.items.length > 0 && (
                        <div className="history-items-list">
                          {r.items.map((it, idx) => (
                            <span key={idx} className="history-item-chip">
                              {it.name} <b>{it.qty}{it.unit === "kg" ? "كغ" : ""}</b>
                            </span>
                          ))}
                        </div>
                      )}

                      {r.notes && (
                        <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>{r.notes}</div>
                      )}
                    </div>
                    <div className="history-time">
                      {new Date(r.date).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      {r.paymentMethod && ` · ${PAYMENT_LABELS[r.paymentMethod] || r.paymentMethod}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {!loading && filtered.length > visibleCount && (
          <div className="load-more-wrap">
            <button onClick={() => setVisibleCount((v) => v + 30)} className="load-more-btn">
              <ChevronDown size={16} />
              عرض المزيد
              <span className="load-more-count">({filtered.length - visibleCount} متبقي)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}