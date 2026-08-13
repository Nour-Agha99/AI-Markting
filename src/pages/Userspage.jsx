import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Power, Unplug, X, Search, Users as UsersIcon } from "lucide-react";
import { getUsers, saveUser, toggleUserStatus, forceLogoutUser } from "../services/dataService";
import { ROLE_LABELS, ROLE_COLORS } from "../utils/roles";

const AVATAR_PALETTE = [
  { bg: "var(--color-primary-soft)", text: "var(--color-primary)" },
  { bg: "var(--color-success-soft)", text: "var(--color-success)" },
  { bg: "var(--color-warning-soft)", text: "var(--color-warning)" },
  { bg: "var(--color-danger-soft)", text: "var(--color-danger)" },
];

function avatarStyle(name) {
  const str = name || "؟";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function lastSeenLabel(u) {
  if (u.isOnline) return "أونلاين الآن";
  if (!u.lastSeenAt) return "ما دخل بعد";
  const diffMin = Math.round((Date.now() - new Date(u.lastSeenAt).getTime()) / 60000);
  if (diffMin < 1) return "قبل شوي";
  if (diffMin < 60) return `آخر ظهور قبل ${diffMin} دقيقة`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `آخر ظهور قبل ${diffHr} ساعة`;
  const diffDay = Math.round(diffHr / 24);
  return `آخر ظهور قبل ${diffDay} يوم`;
}

const emptyForm = { fullName: "", username: "", role: "cashier", password: "" };

export default function UsersPage({ token, currentUsername, onApiError }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmToggleId, setConfirmToggleId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [forceLogoutingId, setForceLogoutingId] = useState(null);

  useEffect(() => {
    refresh();
  }, [token]);

  function refresh() {
    setLoading(true);
    setErrorMsg("");
    getUsers(token)
      .then((data) => setUsers(data))
      .catch((err) => {
        if (err?.code !== "SESSION_EXPIRED") {
          setErrorMsg(err.message || "ما قدرنا نجيب المستخدمين.");
        } else {
          onApiError?.(err);
        }
      })
      .finally(() => setLoading(false));
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(u) {
    setForm({ fullName: u.fullName, username: u.username, role: u.role, password: "" });
    setEditingId(u.id);
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    setFormError("");

    if (!form.fullName.trim() || !form.username.trim()) {
      setFormError("الاسم واسم المستخدم مطلوبين");
      return;
    }
    if (!editingId && form.password.trim().length < 6) {
      setFormError("كلمة المرور مطلوبة، 6 أحرف على الأقل");
      return;
    }
    if (editingId && form.password && form.password.trim().length < 6) {
      setFormError("كلمة المرور الجديدة لازم تكون 6 أحرف على الأقل");
      return;
    }

    setSaving(true);
    try {
      await saveUser(
        {
          id: editingId || undefined,
          fullName: form.fullName.trim(),
          username: form.username.trim(),
          role: form.role,
          password: form.password.trim() || undefined,
        },
        token
      );
      setShowForm(false);
      refresh();
    } catch (err) {
      if (err?.code !== "SESSION_EXPIRED") {
        setFormError(err.message || "حصل خطأ غير متوقع، حاول مرة ثانية.");
      } else {
        onApiError?.(err);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id) {
    setErrorMsg("");
    setTogglingId(id);
    try {
      await toggleUserStatus(id, token);
      setConfirmToggleId(null);
      refresh();
    } catch (err) {
      if (err?.code !== "SESSION_EXPIRED") {
        setErrorMsg(err.message || "ما قدرنا نحدّث حالة المستخدم.");
      } else {
        onApiError?.(err);
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleForceLogout(id) {
    setErrorMsg("");
    setForceLogoutingId(id);
    try {
      await forceLogoutUser(id, token);
      refresh();
    } catch (err) {
      if (err?.code !== "SESSION_EXPIRED") {
        setErrorMsg(err.message || "ما قدرنا ننهي جلسات المستخدم.");
      } else {
        onApiError?.(err);
      }
    } finally {
      setForceLogoutingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const onlineCount = users.filter((u) => u.isOnline).length;
  const roleCounts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="products-toolbar">
        <div className="section-header">
          <span className="section-title">إجمالي المستخدمين</span>
          <span className="section-count">{users.length}</span>
        </div>

        <button onClick={openAddForm} className="btn-whatsapp add-product-btn" style={{ background: "var(--color-primary)" }}>
          <Plus size={18} />
          إضافة مستخدم جديد
        </button>
      </div>

      {errorMsg && !showForm && (
        <div className="card" style={{ background: "var(--color-danger-soft)", color: "var(--color-danger)", textAlign: "center", fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      <div className="debts-stats-row">
        <div className="stat-card success stat-card-highlight" style={{ textAlign: "center" }}>
          <div className="stat-label" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span className={`presence-dot ${onlineCount > 0 ? "online" : ""}`} />
            أونلاين الآن
          </div>
          <div className="stat-value">{onlineCount}</div>
        </div>
        <div className="stat-card primary stat-card-highlight" style={{ textAlign: "center" }}>
          <div className="stat-label">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <UsersIcon size={13} /> توزيع الأدوار
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            {Object.keys(ROLE_LABELS).map((r) => (
              <span
                key={r}
                className="pill"
                style={{ background: ROLE_COLORS[r].bg, color: ROLE_COLORS[r].text, border: "none", fontSize: 12, padding: "5px 10px" }}
              >
                {ROLE_LABELS[r]} · {roleCounts[r] || 0}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ position: "relative" }}>
        <Search size={16} color="var(--text-secondary)" style={{ position: "absolute", right: 28, top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو اسم المستخدم..."
          style={{ ...inputStyle, paddingRight: 36 }}
        />
      </div>

      {loading && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>جاري التحميل...</div>
      )}
      {!loading && users.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>ما في مستخدمين بعد.</div>
      )}
      {!loading && users.length > 0 && filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-secondary)" }}>ما في نتيجة مطابقة.</div>
      )}

      <div className="users-grid">
        {filtered.map((u) => {
          const palette = avatarStyle(u.fullName);
          const initial = (u.fullName || "؟").trim().charAt(0);
          const roleColor = ROLE_COLORS[u.role] || ROLE_COLORS.cashier;
          const isSelf = u.username === currentUsername;
          const confirming = confirmToggleId === u.id;

          return (
            <div key={u.id} className="user-card">
              <div className="user-card-top">
                <div className="user-avatar-wrap">
                  <div className="debt-avatar" style={{ background: palette.bg, color: palette.text }}>
                    {initial}
                  </div>
                  <span className={`presence-dot user-presence ${u.isOnline ? "online" : ""}`} />
                </div>

                <div className="debt-card-info">
                  <div className="debt-card-name">
                    {u.fullName}
                    {isSelf && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> (أنت)</span>}
                  </div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>@{u.username}</div>
                </div>

                <span className="pill" style={{ background: roleColor.bg, color: roleColor.text, border: "none", fontSize: 12, flexShrink: 0 }}>
                  {ROLE_LABELS[u.role] || u.role}
                </span>
              </div>

              <div className="user-card-meta">
                <span style={{ color: u.isOnline ? "var(--color-success)" : "var(--text-muted)" }}>
                  {lastSeenLabel(u)}
                </span>
                {!u.isEnabled && <span className="user-disabled-chip">معطّل</span>}
              </div>

              <div className="user-card-actions">
                <button onClick={() => openEditForm(u)} className="debt-icon-btn" title="تعديل">
                  <Edit2 size={15} />
                </button>

                <button
                  onClick={() => handleForceLogout(u.id)}
                  disabled={forceLogoutingId === u.id || !u.isOnline}
                  className="debt-icon-btn"
                  title="إنهاء الجلسات"
                  style={{ opacity: u.isOnline ? 1 : 0.4 }}
                >
                  <Unplug size={15} />
                </button>

                {confirming ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => handleToggle(u.id)}
                      disabled={togglingId === u.id}
                      className="pill"
                      style={{
                        background: u.isEnabled ? "var(--color-danger)" : "var(--color-success)",
                        color: "white",
                        fontSize: 12,
                        padding: "6px 12px",
                        border: "none",
                      }}
                    >
                      {togglingId === u.id ? "..." : u.isEnabled ? "تأكيد التعطيل" : "تأكيد التفعيل"}
                    </button>
                    <button onClick={() => setConfirmToggleId(null)} className="debt-icon-btn">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmToggleId(u.id)}
                    disabled={isSelf}
                    className="debt-icon-btn"
                    title={u.isEnabled ? "تعطيل الحساب" : "تفعيل الحساب"}
                    style={{
                      opacity: isSelf ? 0.35 : 1,
                      color: u.isEnabled ? "var(--color-danger)" : "var(--color-success)",
                      borderColor: u.isEnabled ? "var(--color-danger)" : "var(--color-success)",
                    }}
                  >
                    <Power size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div style={overlayStyle} onClick={() => setShowForm(false)}>
          <div className="card" style={{ width: "100%", maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{editingId ? "تعديل مستخدم" : "مستخدم جديد"}</span>
              <button onClick={() => setShowForm(false)} style={iconBtnStyle}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="الاسم الكامل">
                <input style={inputStyle} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </Field>
              <Field label="اسم المستخدم (إنجليزي)">
                <input style={{ ...inputStyle, direction: "ltr", textAlign: "right" }} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </Field>
              <Field label="الدور">
                <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="cashier">كاشير</option>
                  <option value="admin">مدير</option>
                  <option value="owner">مالك</option>
                </select>
              </Field>
              <Field label={editingId ? "كلمة مرور جديدة (اتركها فاضية إذا ما بدك تغييرها)" : "كلمة المرور"}>
                <input type="password" style={inputStyle} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
              {formError && <div style={{ color: "var(--color-danger)", fontSize: 13, textAlign: "center" }}>{formError}</div>}
              <button onClick={handleSave} disabled={saving} className="btn-whatsapp" style={{ background: "var(--color-primary)", justifyContent: "center", marginTop: 8, opacity: saving ? 0.6 : 1 }}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ color: "var(--text-secondary)", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", background: "var(--bg-pill)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "10px 12px", color: "var(--text-primary)", fontSize: 14, outline: "none" };
const iconBtnStyle = { width: 30, height: 30, borderRadius: "50%", border: "none", background: "var(--bg-pill)", display: "flex", alignItems: "center", justifyContent: "center" };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 };