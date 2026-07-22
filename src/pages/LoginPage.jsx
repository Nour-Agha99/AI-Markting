import { useState } from 'react';

const colors = {
  bg: '#0a0d13',
  card: '#12161f',
  card2: '#171c27',
  border: '#212736',
  text: '#f3f5f9',
  muted: '#7c869c',
  blue: '#2f6fed',
  green: '#22c55e',
};

const styles = {
  page: {
    minHeight: '100vh',
    background: colors.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    direction: 'rtl',
    fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif",
  },
  wrap: { width: '100%', maxWidth: 420 },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: '12px 16px',
    marginBottom: 14,
  },
  statusLeft: { display: 'flex', alignItems: 'center', gap: 8, color: colors.muted, fontSize: 13 },
  dot: {
    width: 8, height: 8, borderRadius: '50%', background: colors.green,
  },
  badge: {
    background: 'rgba(47,111,237,0.15)', color: '#8fb3ff',
    border: '1px solid rgba(47,111,237,0.35)', fontSize: 12,
    padding: '5px 12px', borderRadius: 10, fontWeight: 600,
  },
  card: {
    background: colors.card, border: `1px solid ${colors.border}`,
    borderRadius: 20, padding: '30px 26px 26px',
  },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 26 },
  logoMark: {
    width: 56, height: 56, borderRadius: 16,
    background: 'linear-gradient(145deg, #2f6fed, #1b3fa0)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26, marginBottom: 14,
  },
  h1: { fontFamily: "'Cairo', sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 4, color: colors.text },
  p: { color: colors.muted, fontSize: 13 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: colors.muted, marginBottom: 8 },
  inputShell: { position: 'relative' },
  input: {
    width: '100%', background: colors.card2, border: `1px solid ${colors.border}`,
    borderRadius: 14, padding: '13px 44px 13px 14px', color: colors.text,
    fontSize: 15, outline: 'none', direction: 'rtl', boxSizing: 'border-box',
  },
  icon: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: colors.muted, fontSize: 16 },
  toggleEye: {
    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 13,
  },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, fontSize: 13 },
  remember: { display: 'flex', alignItems: 'center', gap: 8, color: colors.muted, cursor: 'pointer' },
  forgot: { color: '#8fb3ff', textDecoration: 'none' },
  btnLogin: {
    width: '100%', background: colors.blue, color: '#fff', border: 'none',
    borderRadius: 14, padding: 14, fontFamily: "'Cairo', sans-serif",
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 12, color: colors.muted, fontSize: 12, margin: '22px 0 16px' },
  btnWhatsapp: {
    width: '100%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
    color: colors.green, borderRadius: 14, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  footnote: { textAlign: 'center', color: '#4d5568', fontSize: 11, marginTop: 20 },
};

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      await onLogin?.({ username, password });
      setPassword('');
    } catch (err) {
      setError('بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.statusPill}>
          <div style={styles.statusLeft}>
            <span style={styles.dot}></span>
            اتصال آمن ومشفّر
          </div>
          <span style={styles.badge}>لوحة تحكم المتجر</span>
        </div>

        <div style={styles.card}>
          <div style={styles.brand}>
            <div style={styles.logoMark}>🧊</div>
            <h1 style={styles.h1}>المتجر الذكي</h1>
            <p style={styles.p}>سجّل دخولك لإدارة المبيعات والمنتجات والديون</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>اسم المستخدم</label>
              <div style={styles.inputShell}>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="مثال: Nouragha"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
                <span style={styles.icon}>👤</span>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>كلمة المرور</label>
              <div style={styles.inputShell}>
                <input
                  style={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  style={styles.toggleEye}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</p>
            )}

            <div style={styles.rowBetween}>
              <label style={styles.remember}>
                <input type="checkbox" />
                تذكرني
              </label>
            </div>

            <button
              style={{
                ...styles.btnLogin,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              type="submit"
              disabled={loading}
            >
              {loading ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>

          <div style={styles.divider}>أو</div>

          <button style={styles.btnWhatsapp} type="button">
            💬 تواصل مع الدعم عبر واتساب
          </button>
        </div>

        <p style={styles.footnote}>جميع الحقوق محفوظة © نظام إدارة المتجر الذكي</p>
      </div>
    </div>
  );
}