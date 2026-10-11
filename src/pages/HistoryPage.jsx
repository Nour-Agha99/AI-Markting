import { useEffect, useMemo, useState } from "react";
import { Search, X, ShoppingBag, Receipt, Banknote, ChevronDown } from "lucide-react";
import { getHistory } from "../services/dataService";
import { canManageProducts } from "../utils/roles";
import "./HistoryPage.css";

const PAGE = 30;
const DATE_FILTERS = [
  { id: "day", label: "اليوم", days: 1 },
  { id: "week", label: "7 أيام", days: 7 },
  { id: "month", label: "30 يوم", days: 30 },
  { id: "all", label: "الكل", days: 0 },
];
const TYPE_FILTERS = [
  { id: "all", label: "الكل" },
  { id: "sale", label: "بيع" },
  { id: "debt", label: "دين" },
  { id: "payment", label: "سداد" },
];
const TYPES = {
  sale: { label: "بيع", icon: ShoppingBag },
  debt: { label: "دين", icon: Receipt },
  payment: { label: "سداد", icon: Banknote },
};
const PAY_LABELS = { CASH: "كاش", BANK_PALESTINE: "بنك فلسطين", PALPAY: "بال بي", JAWWALPAY: "جوال بي" };

const money = (n) =>
  `₪${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const timeOf = (d) => new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
const dayKey = (d) => new Date(d).toDateString();
const qtyText = (it) => `${it.qty}${it.unit === "kg" ? " كغ" : ""}`;

function cutoff(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d.getTime();
}

function dayLabel(d) {
  const date = new Date(d);
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return "اليوم";
  if (date.toDateString() === y.toDateString()) return "امبارح";
  return date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
}

function itemsSummary(items) {
  if (!items?.length) return "";
  const first = items.slice(0, 2).map((it) => `${it.name} ${qtyText(it)}`).join("، ");
  return items.length > 2 ? `${first} +${items.length - 2}` : first;
}

function RowSkeleton() {
  return (
    <li className="hs-item">
      <div className="hs-row">
        <span className="hs-sk" style={{ width: 40, height: 40, borderRadius: "50%" }} />
        <span className="hs-main">
          <span className="hs-sk" style={{ width: "45%", height: 14 }} />
          <span className="hs-sk" style={{ width: "65%", height: 11 }} />
        </span>
        <span className="hs-sk" style={{ width: 60, height: 16 }} />
      </div>
    </li>
  );
}

export default function HistoryPage({ token, role, onApiError }) {
  const showProfit = canManageProducts(role); // الربح بيظهر للمدير والمالك بس
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("all");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setVisible(PAGE);
    setOpenId(null);
  }, [range, type, q]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await getHistory(token);
      setHistory([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      if (err?.code === "SESSION_EXPIRED") {
        try {
          onApiError?.(err);
        } catch {
          /* انتهت الجلسة */
        }
      } else setError(err.message || "ما قدرنا نجيب السجل.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [token]);

  const filtered = useMemo(() => {
    const days = DATE_FILTERS.find((f) => f.id === range)?.days;
    const from = days ? cutoff(days) : 0;
    return history.filter((r) => {
      if (from && new Date(r.date).getTime() < from) return false;
      if (type !== "all" && r.type !== type) return false;
      if (!q) return true;
      return (
        (r.customerName || "").toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q) ||
        (r.items || []).some((it) => (it.name || "").toLowerCase().includes(q))
      );
    });
  }, [history, range, type, q]);

  // ملخص الفلتر + إجمالي كل يوم (محسوب على كل النتائج مش بس اللي ظاهر)
  const { summary, dayTotals } = useMemo(() => {
    const s = { sales: 0, debt: 0, collected: 0 };
    const days = new Map();
    for (const r of filtered) {
      const a = Number(r.amount) || 0;
      const d = days.get(dayKey(r.date)) || { sales: 0, count: 0 };
      d.count++;
      if (r.type === "payment") s.collected += a;
      else {
        s.sales += a;
        d.sales += a;
        if (r.type === "debt") s.debt += a;
        else s.collected += a;
      }
      days.set(dayKey(r.date), d);
    }
    return { summary: s, dayTotals: days };
  }, [filtered]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const r of filtered.slice(0, visible)) {
      const k = dayKey(r.date);
      if (!map.has(k)) map.set(k, { key: k, label: dayLabel(r.date), items: [] });
      map.get(k).items.push(r);
    }
    return [...map.values()];
  }, [filtered, visible]);

  const hasFilters = range !== "all" || type !== "all" || search;
  const blank = loading && history.length === 0;

  function resetFilters() {
    setRange("all");
    setType("all");
    setSearch("");
  }

  return (
    <div className="hs-page">
      <div className="hs-toolbar">
        <div className="hs-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالزبون أو المنتج أو الملاحظة..."
            aria-label="بحث بالسجل"
          />
          {search && (
            <button className="hs-search-x" onClick={() => setSearch("")} aria-label="مسح البحث">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="hs-filters">
          <div className="hs-seg" role="group" aria-label="الفترة">
            {DATE_FILTERS.map((f) => (
              <button key={f.id} className={range === f.id ? "on" : ""} onClick={() => setRange(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="hs-seg" role="group" aria-label="نوع العملية">
            {TYPE_FILTERS.map((f) => (
              <button key={f.id} className={type === f.id ? "on" : ""} onClick={() => setType(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="hs-error" role="alert">
          {error}
          <button onClick={refresh}>إعادة المحاولة</button>
        </div>
      )}

      <div className="hs-stats">
        <div>
          <span>العمليات</span>
          <b>{blank ? "—" : filtered.length}</b>
        </div>
        <div>
          <span>المبيعات</span>
          <b>{blank ? "—" : money(summary.sales)}</b>
          {summary.debt > 0 && <small>منها دين {money(summary.debt)}</small>}
        </div>
        <div>
          <span>المقبوض</span>
          <b className="ok">{blank ? "—" : money(summary.collected)}</b>
        </div>
      </div>

      {blank && (
        <ul className="hs-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </ul>
      )}

      {!blank && groups.length === 0 && (
        <div className="hs-empty">
          {history.length === 0 ? "ما في عمليات مسجلة بعد." : "ما في عمليات بتطابق الفلتر."}
          {hasFilters && history.length > 0 && <button onClick={resetFilters}>إزالة الفلاتر</button>}
        </div>
      )}

      {groups.map((g) => {
        const tot = dayTotals.get(g.key);
        return (
          <section key={g.key} className="hs-day-group">
            <h3 className="hs-day">
              <span>{g.label}</span>
              <span className="hs-day-tot">
                <b>{money(tot.sales)}</b>
                <small>
                  {tot.count} {tot.count === 1 ? "عملية" : "عمليات"}
                </small>
              </span>
            </h3>
            <ul className="hs-list">
              {g.items.map((r) => {
                const meta = TYPES[r.type] || TYPES.sale;
                const Icon = meta.icon;
                const open = openId === r.id;
                const name = r.customerName || (r.type === "sale" ? "زبون عابر" : "بدون اسم");
                const sub = itemsSummary(r.items) || (r.type === "payment" ? "تسديد دين" : "");
                return (
                  <li key={r.id} className={`hs-item hs-item--${r.type}${open ? " is-open" : ""}`}>
                    <button className="hs-row" onClick={() => setOpenId(open ? null : r.id)} aria-expanded={open}>
                      <span className="hs-ic">
                        <Icon size={18} />
                      </span>
                      <span className="hs-main">
                        <span className="hs-name">
                          {name}
                          <em className="hs-chip">{meta.label}</em>
                        </span>
                        {sub && <span className="hs-sub">{sub}</span>}
                      </span>
                      <span className="hs-amt">
                        <b>
                          {r.type === "payment" ? "+" : ""}
                          {money(r.amount)}
                        </b>
                        <small>
                          {timeOf(r.date)}
                          {r.paymentMethod ? ` ${PAY_LABELS[r.paymentMethod] || r.paymentMethod}` : ""}
                        </small>
                      </span>
                      <ChevronDown size={16} className="hs-chev" aria-hidden="true" />
                    </button>

                    {open && (
                      <div className="hs-detail">
                        <div className="hs-paper">
                          {r.items?.length > 0 && (
                            <ul>
                              {r.items.map((it, i) => (
                                <li key={i}>
                                  <span>{it.name}</span>
                                  <span>{it.unit === "kg" ? `${it.qty} كغ` : `× ${it.qty}`}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {r.type === "debt" && <p>مسجّل كدين على {r.customerName || "الزبون"}.</p>}
                          {r.type === "payment" && <p>دفعة على حساب {r.customerName || "الزبون"}.</p>}
                          {r.notes && <p>ملاحظة: {r.notes}</p>}
                          <div className="hs-paper-total">
                            <span>{r.type === "payment" ? "المبلغ المستلم" : "الإجمالي"}</span>
                            <span>{money(r.amount)}</span>
                          </div>
                          {showProfit && r.profit != null && r.type !== "payment" && (
                            <div className="hs-paper-profit">
                              <span>الربح</span>
                              <span>{money(r.profit)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {!blank && filtered.length > visible && (
        <button className="hs-more" onClick={() => setVisible((v) => v + PAGE)}>
          عرض المزيد
          <span>({filtered.length - visible} متبقي)</span>
        </button>
      )}
    </div>
  );
}