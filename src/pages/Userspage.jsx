import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X, Pencil, Unplug, Power, Eye, EyeOff, Shuffle } from "lucide-react";
import { getUsers, saveUser, toggleUserStatus, forceLogoutUser } from "../services/dataService";
import { ROLE_LABELS, ROLE_COLORS } from "../utils/roles";
import "./UsersPage.css";

const ROLE_INFO = {
  cashier: "بيع، سجل العمليات، وديون الزبائن",
  admin: "كل صلاحيات الكاشير + إدارة المنتجات",
  owner: "كل شي، بما فيه المستخدمين ولوحة التحكم",
};
const emptyForm = { fullName: "", username: "", role: "cashier", password: "" };

const hue = (name) => {
  let h = 0;
  for (const c of name || "؟") h = c.charCodeAt(0) + ((h << 5) - h);
  return Math.abs(h) % 4;
};

function lastSeen(u) {
  if (u.isOnline) return "أونلاين الآن";
  if (!u.lastSeenAt) return "ما دخل بعد";
  const min = Math.round((Date.now() - new Date(u.lastSeenAt).getTime()) / 60000);
  if (min < 1) return "قبل شوي";
  if (min < 60) return `آخر ظهور قبل ${min} دقيقة`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `آخر ظهور قبل ${hr} ساعة`;
  return `آخر ظهور قبل ${Math.round(hr / 24)} يوم`;
}

function genPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = new Uint32Array(10);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

function Avatar({ user, size = 44 }) {
  return (
    <span className="us-av-wrap" style={{ width: size, height: size }}>
      <span className={`us-av us-av-${hue(user.fullName)}`} style={{ fontSize: size * 0.38 }}>
        {(user.fullName || "؟").trim().charAt(0)}
      </span>
      <span className={`us-dot${user.isOnline ? " on" : ""}`} aria-hidden="true" />
    </span>
  );
}

function Sheet({ title, onClose, busy, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);
  return (
    <div className="us-overlay" onMouseDown={() => !busy && onClose()}>
      <div className="us-sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="us-sheet-head">
          <h2>{title}</h2>
          <button className="us-x" onClick={onClose} disabled={busy} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RoleChip({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.cashier;
  return (
    <span className="us-role" style={{ background: c.bg, color: c.text }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export default function UsersPage({ token, currentUsername, onApiError }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [confirm, setConfirm] = useState(null); // "toggle" | "logout" | null
  const [form, setForm] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  function sessionExpired(err) {
    try {
      onApiError?.(err);
    } catch {
      /* انتهت الجلسة */
    }
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setUsers(await getUsers(token));
    } catch (err) {
      if (err?.code === "SESSION_EXPIRED") sessionExpired(err);
      else setError(err.message || "ما قدرنا نجيب المستخدمين.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [token]);

  function flash(text, type = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), type === "danger" ? 4000 : 2600);
  }

  const counts = useMemo(() => {
    const c = { online: 0, disabled: 0, owner: 0, admin: 0, cashier: 0 };
    for (const u of users) {
      if (u.isOnline) c.online++;
      if (!u.isEnabled) c.disabled++;
      c[u.role] = (c[u.role] || 0) + 1;
    }
    return c;
  }, [users]);

  const shown = useMemo(
    () =>
      users.filter((u) => {
        if (filter === "online" && !u.isOnline) return false;
        if (filter === "disabled" && u.isEnabled) return false;
        if (["owner", "admin", "cashier"].includes(filter) && u.role !== filter) return false;
        return !q || (u.fullName || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q);
      }),
    [users, filter, q]
  );

  const selected = users.find((u) => u.id === selectedId) || null;
  const isSelf = (u) => u?.username === currentUsername;

  async function run(action, okText) {
    setBusy(true);
    try {
      await action();
      setSelectedId(null);
      setConfirm(null);
      flash(okText);
      await refresh();
    } catch (err) {
      if (err?.code === "SESSION_EXPIRED") sessionExpired(err);
      else {
        setConfirm(null);
        flash(err.message || "حصل خطأ، حاول مرة ثانية.", "danger");
      }
    } finally {
      setBusy(false);
    }
  }

  function openAdd() {
    setForm({ ...emptyForm });
    setFormError("");
    setShowPass(false);
  }
  function openEdit(u) {
    setSelectedId(null);
    setForm({ id: u.id, fullName: u.fullName, username: u.username, role: u.role, password: "" });
    setFormError("");
    setShowPass(false);
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    if (busy) return;
    const fullName = form.fullName.trim();
    const username = form.username.trim();
    if (!fullName) return setFormError("الاسم الكامل مطلوب");
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username)) return setFormError("اسم المستخدم: إنجليزي، من 3 لـ 30 حرف (يسمح بـ . و _)");
    if (!form.id && form.password.length < 6) return setFormError("كلمة المرور مطلوبة، 6 أحرف على الأقل");
    if (form.id && form.password && form.password.length < 6) return setFormError("كلمة المرور الجديدة لازم تكون 6 أحرف على الأقل");

    setBusy(true);
    setFormError("");
    try {
      await saveUser({ id: form.id || undefined, fullName, username, role: form.role, password: form.password || undefined }, token);
      setForm(null);
      flash(form.id ? "تم حفظ التعديلات" : "تمت إضافة المستخدم");
      await refresh();
    } catch (err) {
      if (err?.code === "SESSION_EXPIRED") sessionExpired(err);
      else setFormError(err.message || "حصل خطأ غير متوقع، حاول مرة ثانية.");
    } finally {
      setBusy(false);
    }
  }

  const editingSelf = form?.id && users.find((u) => u.id === form.id)?.username === currentUsername;
  const filters = [
    ["all", "الكل", users.length],
    ["online", "أونلاين", counts.online],
    ["owner", ROLE_LABELS.owner, counts.owner],
    ["admin", ROLE_LABELS.admin, counts.admin],
    ["cashier", ROLE_LABELS.cashier, counts.cashier],
    ["disabled", "معطّل", counts.disabled],
  ];

  return (
    <div className="us-page">
      {toast && (
        <div className={`us-toast us-toast--${toast.type}`} role="status">
          {toast.text}
        </div>
      )}

      <header className="us-head">
        <div className="us-title">
          <h1>المستخدمون</h1>
          <p>مين بيدخل على المتجر وبأي صلاحية.</p>
        </div>
        <button className="us-add" onClick={openAdd}>
          <Plus size={18} />
          مستخدم جديد
        </button>
      </header>

      {error && (
        <div className="us-error" role="alert">
          {error}
          <button onClick={refresh}>إعادة المحاولة</button>
        </div>
      )}

      <div className="us-stats">
        <div>
          <span>
            <i className={`us-dot inline${counts.online ? " on" : ""}`} />
            أونلاين الآن
          </span>
          <b>{counts.online}</b>
        </div>
        <div>
          <span>المستخدمين</span>
          <b>{users.length}</b>
        </div>
        <div>
          <span>حسابات معطّلة</span>
          <b className={counts.disabled ? "warn" : ""}>{counts.disabled}</b>
        </div>
      </div>

      <div className="us-toolbar">
        <div className="us-search">
          <Search size={18} aria-hidden="true" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو اسم المستخدم..." aria-label="بحث" />
        </div>
        <div className="us-pills" role="group" aria-label="فلتر المستخدمين">
          {filters.map(([id, label, n]) => (
            <button key={id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>
              {label}
              <em>{n}</em>
            </button>
          ))}
        </div>
      </div>

      <ul className="us-list">
        {loading && users.length === 0 &&
          Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="us-row">
              <span className="us-sk" style={{ width: 44, height: 44, borderRadius: "50%" }} />
              <span className="us-info">
                <span className="us-sk" style={{ width: "45%", height: 14 }} />
                <span className="us-sk" style={{ width: "30%", height: 11 }} />
              </span>
            </li>
          ))}
        {!loading && users.length > 0 && shown.length === 0 && <li className="us-empty">ما في نتيجة مطابقة.</li>}
        {!loading && users.length === 0 && !error && <li className="us-empty">ما في مستخدمين بعد.</li>}

        {shown.map((u) => (
          <li key={u.id}>
            <button className={`us-row${u.isEnabled ? "" : " is-off"}`} onClick={() => setSelectedId(u.id)}>
              <Avatar user={u} />
              <span className="us-info">
                <span className="us-name">
                  {u.fullName}
                  {isSelf(u) && <em className="us-self">أنت</em>}
                </span>
                <span className="us-sub">
                  <bdi>@{u.username}</bdi>
                  <span className={u.isOnline ? "ok" : ""}>{lastSeen(u)}</span>
                </span>
              </span>
              {u.isEnabled ? <RoleChip role={u.role} /> : <span className="us-role us-role--off">معطّل</span>}
            </button>
          </li>
        ))}
      </ul>

      {/* ===== نافذة المستخدم ===== */}
      {selected && !form && (
        <Sheet title={selected.fullName} onClose={() => { setSelectedId(null); setConfirm(null); }} busy={busy}>
          <div className="us-prof">
            <Avatar user={selected} size={56} />
            <div>
              <bdi className="us-prof-user">@{selected.username}</bdi>
              <div className="us-prof-meta">
                {selected.isEnabled ? <RoleChip role={selected.role} /> : <span className="us-role us-role--off">معطّل</span>}
                <span className={selected.isOnline ? "ok" : ""}>{lastSeen(selected)}</span>
              </div>
            </div>
          </div>

          {confirm ? (
            <div className="us-confirm">
              <p>
                {confirm === "toggle"
                  ? selected.isEnabled
                    ? `متأكد بدك تعطّل حساب ${selected.fullName}؟ ما رح يقدر يدخل، وبتنتهي كل جلساته الحالية.`
                    : `بدك تفعّل حساب ${selected.fullName} وترجّع إله صلاحية الدخول؟`
                  : `بدك تطلّع ${selected.fullName} من كل الأجهزة؟ بيقدر يدخل مرة ثانية بكلمة مروره.`}
              </p>
              <div className="us-btns">
                <button className="us-btn" onClick={() => setConfirm(null)} disabled={busy}>
                  رجوع
                </button>
                <button
                  className={`us-btn ${confirm === "toggle" && !selected.isEnabled ? "us-btn--ok" : "us-btn--danger"}`}
                  disabled={busy}
                  onClick={() =>
                    confirm === "toggle"
                      ? run(() => toggleUserStatus(selected.id, token), selected.isEnabled ? "تم تعطيل الحساب" : "تم تفعيل الحساب")
                      : run(() => forceLogoutUser(selected.id, token), "تم إنهاء الجلسات")
                  }
                >
                  {busy ? "جاري التنفيذ..." : confirm === "toggle" ? (selected.isEnabled ? "تعطيل الحساب" : "تفعيل الحساب") : "إنهاء الجلسات"}
                </button>
              </div>
            </div>
          ) : (
            <div className="us-actions">
              <button className="us-act" onClick={() => openEdit(selected)}>
                <span className="us-act-ic">
                  <Pencil size={19} />
                </span>
                <span>
                  <b>تعديل البيانات</b>
                  <small>الاسم والدور وكلمة المرور</small>
                </span>
              </button>
              <button className="us-act" onClick={() => setConfirm("logout")} disabled={!selected.isOnline}>
                <span className="us-act-ic">
                  <Unplug size={19} />
                </span>
                <span>
                  <b>إنهاء الجلسات</b>
                  <small>{selected.isOnline ? "بيطلّعه من كل الأجهزة" : "مش متصل حالياً"}</small>
                </span>
              </button>
              <button
                className={`us-act ${selected.isEnabled ? "us-act--danger" : "us-act--ok"}`}
                onClick={() => setConfirm("toggle")}
                disabled={isSelf(selected)}
              >
                <span className="us-act-ic">
                  <Power size={19} />
                </span>
                <span>
                  <b>{selected.isEnabled ? "تعطيل الحساب" : "تفعيل الحساب"}</b>
                  <small>{isSelf(selected) ? "هاد حسابك، ما بتقدر تعطّله" : selected.isEnabled ? "بيمنعه من الدخول" : "بيرجّع إله صلاحية الدخول"}</small>
                </span>
              </button>
            </div>
          )}
        </Sheet>
      )}

      {/* ===== نموذج الإضافة / التعديل ===== */}
      {form && (
        <Sheet title={form.id ? "تعديل مستخدم" : "مستخدم جديد"} onClose={() => setForm(null)} busy={busy}>
          <form className="us-form" onSubmit={handleSave} noValidate>
            <div className="us-field">
              <label htmlFor="us-fn">الاسم الكامل</label>
              <input id="us-fn" type="text" value={form.fullName} onChange={set("fullName")} autoFocus />
            </div>
            <div className="us-field">
              <label htmlFor="us-un">اسم المستخدم <em>(إنجليزي)</em></label>
              <input id="us-un" type="text" dir="ltr" value={form.username} onChange={set("username")} autoCapitalize="none" spellCheck={false} />
            </div>

            <div className="us-field">
              <label>الدور</label>
              <div className="us-roles" role="radiogroup" aria-label="الدور">
                {["cashier", "admin", "owner"].map((r) => (
                  <button
                    type="button"
                    key={r}
                    role="radio"
                    aria-checked={form.role === r}
                    disabled={editingSelf}
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                  >
                    <b>{ROLE_LABELS[r]}</b>
                    <small>{ROLE_INFO[r]}</small>
                  </button>
                ))}
              </div>
              {editingSelf && <div className="us-help">ما بتقدر تغيّر دورك بنفسك، عشان ما تقفل على حالك.</div>}
            </div>

            <div className="us-field">
              <label htmlFor="us-pw">{form.id ? "كلمة مرور جديدة" : "كلمة المرور"} {form.id && <em>(اتركها فاضية إذا ما بدك تغييرها)</em>}</label>
              <div className="us-pw">
                <input id="us-pw" type={showPass ? "text" : "password"} dir="ltr" value={form.password} onChange={set("password")} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "إخفاء" : "إظهار"}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button type="button" className="gen" onClick={() => { setForm((f) => ({ ...f, password: genPassword() })); setShowPass(true); }}>
                  <Shuffle size={15} />
                  توليد
                </button>
              </div>
            </div>

            {formError && <div className="us-err" role="alert">{formError}</div>}
            <div className="us-btns">
              <button type="button" className="us-btn" onClick={() => setForm(null)} disabled={busy}>إلغاء</button>
              <button type="submit" className="us-btn us-btn--primary" disabled={busy}>{busy ? "جاري الحفظ..." : "حفظ"}</button>
            </div>
          </form>
        </Sheet>
      )}
    </div>
  );
}