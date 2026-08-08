import { useState } from 'react';

const styles = {
  wrap: { width: '100%', maxWidth: 420 },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 16,
    padding: '12px 16px',
    marginBottom: 14,
  },
  statusLeft: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 },
  dot: {
    width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)',
  },
  badge: {
    background: 'var(--color-primary-soft)', color: 'var(--color-primary)',
    border: '1px solid var(--color-primary-soft)', fontSize: 12,
    padding: '5px 12px', borderRadius: 10, fontWeight: 600,
  },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
    borderRadius: 20, padding: '30px 26px 26px',
  },
  brand: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 26 },
  logoMark: {
    width: 56, height: 56, borderRadius: 16,
    background: 'linear-gradient(145deg, #2f6fed, #1b3fa0)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26, marginBottom: 14,
  },
  h1: { fontSize: 20, fontWeight: 800, marginBottom: 4, color: 'var(--text-primary)' },
  p: { color: 'var(--text-secondary)', fontSize: 13 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 },
  inputShell: { position: 'relative' },
  input: {
    width: '100%', background: 'var(--bg-pill)', border: '1px solid var(--border-subtle)',
    borderRadius: 14, padding: '13px 44px 13px 14px', color: 'var(--text-primary)',
    fontSize: 15, outline: 'none', direction: 'rtl', boxSizing: 'border-box',
  },
  icon: { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 16 },
  toggleEye: {
    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
  },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, fontSize: 13 },
  remember: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', cursor: 'pointer' },
  btnLogin: {
    width: '100%', background: 'var(--color-primary)', color: 'var(--text-on-primary)', border: 'none',
    borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: 12, margin: '22px 0 16px' },
  btnWhatsapp: {
    width: '100%', background: 'var(--color-success-soft)', border: '1px solid var(--color-success-soft)',
    color: 'var(--color-success)', borderRadius: 14, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  footnote: { textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginTop: 20 },
};

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorCode('');

    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      setErrorCode('MISSING_FIELDS');
      return;
    }

    setLoading(true);
    try {
      await onLogin?.({ username, password });
      setPassword('');
    } catch (err) {
      setError(err.message || 'بيانات الدخول غير صحيحة');
      setErrorCode(err.code || 'UNKNOWN_ERROR');
    } finally {
      setLoading(false);
    }
  };

  function getErrorStyle(code) {
    switch (code) {
      case 'SESSION_ERROR':
      case 'SERVER_ERROR':
      case 'UNKNOWN_ERROR':
        return { color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' };
      case 'MISSING_FIELDS':
        return { color: 'var(--text-secondary)', background: 'var(--bg-pill)' };
      default:
        return { color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' };
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand-side">
        <span className="brand-emoji">🧊</span>
        <h2>المتجر الذكي</h2>
        <p>نظام متكامل لإدارة المبيعات والمخزون والديون لمحلك، بواجهة عربية بالكامل وسهلة الاستخدام.</p>
      </div>

      <div className="login-form-side">
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
                <p style={{
                  ...getErrorStyle(errorCode),
                  fontSize: 13,
                  marginBottom: 16,
                  padding: '10px 14px',
                  borderRadius: 10,
                }}>
                  {error}
                </p>
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
    </div>
  );
}