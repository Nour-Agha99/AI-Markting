import { useRef, useState } from "react";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Sun,
  Moon,
  MessageCircle,
  Store,
} from "lucide-react";
import "./LoginPage.css";

const REMEMBER_KEY = "remembered_username";

// إذا تركته فاضي بيظهر نص مساعدة بدل الرابط.
const SUPPORT_WHATSAPP = "";

const ERROR_TONES = {
  INVALID_CREDENTIALS: { tone: "danger", Icon: AlertCircle },
  RATE_LIMIT_EXCEEDED: { tone: "warning", Icon: Clock },
  MISSING_FIELDS: { tone: "neutral", Icon: AlertCircle },
};
const DEFAULT_TONE = { tone: "warning", Icon: AlertTriangle };

// بيانات الفاتورة تزيينية فقط (مش بيانات حقيقية)
const RECEIPT_ITEMS = [
  { name: "خبز عربي", note: "2 × ₪3.00", total: "6.00" },
  { name: "حليب", note: "1 × ₪6.50", total: "6.50" },
  { name: "زيت زيتون", note: "0.5 كغ × ₪70.00", total: "35.00" },
];

function readRemembered() {
  try {
    return localStorage.getItem(REMEMBER_KEY) || "";
  } catch {
    return "";
  }
}

function writeRemembered(value) {
  try {
    if (value) localStorage.setItem(REMEMBER_KEY, value);
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* التخزين غير متاح، منتجاهل */
  }
}

function Logo() {
  return (
    <span className="lg-logo" aria-hidden="true">
      <Store size={22} strokeWidth={2.2} />
    </span>
  );
}

export default function LoginPage({ onLogin, themeMode, onToggleTheme }) {
  const [username, setUsername] = useState(readRemembered);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => !!readRemembered());
  const [capsOn, setCapsOn] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const userRef = useRef(null);
  const passRef = useRef(null);

  const [hadRemembered] = useState(() => !!readRemembered());

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const u = username.trim();
    if (!u || !password) {
      setError({ code: "MISSING_FIELDS", message: "اكتب اسم المستخدم وكلمة المرور" });
      (u ? passRef : userRef).current?.focus();
      return;
    }

    setLoading(true);
    try {
      await onLogin?.({ username: u, password });
      writeRemembered(remember ? u : "");
    } catch (err) {
      setError({
        code: err?.code || "UNKNOWN_ERROR",
        message: err?.message || "بيانات الدخول غير صحيحة",
      });
      setPassword("");
      passRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  const bad = error?.code === "INVALID_CREDENTIALS";
  const missing = error?.code === "MISSING_FIELDS";
  const userInvalid = bad || (missing && !username.trim());
  const passInvalid = bad || (missing && !password);
  const { tone, Icon: ErrorIcon } = ERROR_TONES[error?.code] || DEFAULT_TONE;

  return (
    <div className="lg-page">
      {/* ===== لوحة الهوية (ديسكتوب فقط) ===== */}
      <aside className="lg-brand">
        <div className="lg-brand-name">
          <Logo />
          <span>المتجر الذكي</span>
        </div>

        <div className="lg-brand-main">
          <div>
            <h2>كل اللي بيصير بالمحل، بمكان واحد</h2>
            <p>مبيعات ومخزون وديون زبائن، مسجّلة ومرتبة أول بأول.</p>
          </div>

          <div className="lg-receipt-wrap" aria-hidden="true">
            <div className="lg-receipt">
              <div className="lg-r-title">المتجر الذكي</div>
              <div className="lg-r-sub">فاتورة بيع رقم 1042</div>
              <hr className="lg-r-sep" />

              {RECEIPT_ITEMS.map((it) => (
                <div key={it.name}>
                  <div className="lg-r-row">
                    <span>{it.name}</span>
                    <span>₪{it.total}</span>
                  </div>
                  <div className="lg-r-note">{it.note}</div>
                </div>
              ))}

              <hr className="lg-r-sep" />
              <div className="lg-r-total">
                <span>الإجمالي</span>
                <span>₪47.50</span>
              </div>
              <div className="lg-r-pay">
                <span>طريقة الدفع</span>
                <span>كاش</span>
              </div>
              <div className="lg-r-bars" />
              <div className="lg-r-stamp">تم الدفع</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== النموذج ===== */}
      <main className="lg-form-side">
        {onToggleTheme && (
          <button
            type="button"
            className="lg-theme"
            onClick={onToggleTheme}
            aria-label={themeMode === "dark" ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
          >
            {themeMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        <div className="lg-form-wrap">
          <div className="lg-mobile-brand">
            <Logo />
            <span>المتجر الذكي</span>
          </div>

          <header className="lg-head">
            <h1>تسجيل الدخول</h1>
            <p>ادخل بحسابك لتكمّل شغلك بالمتجر.</p>
          </header>

          <form className="lg-form" onSubmit={handleSubmit} noValidate>
            <div className="lg-field">
              <label htmlFor="lg-username">اسم المستخدم</label>
              <div className="lg-input">
                <User size={18} className="lg-input-icon" aria-hidden="true" />
                <input
                  id="lg-username"
                  ref={userRef}
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: ahmad.store"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus={!hadRemembered}
                  aria-invalid={userInvalid}
                />
              </div>
            </div>

            <div className="lg-field">
              <label htmlFor="lg-password">كلمة المرور</label>
              <div className="lg-input">
                <Lock size={18} className="lg-input-icon" aria-hidden="true" />
                <input
                  id="lg-password"
                  ref={passRef}
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsOn(!!e.getModifierState?.("CapsLock"))}
                  onBlur={() => setCapsOn(false)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus={hadRemembered}
                  aria-invalid={passInvalid}
                />
                <button
                  type="button"
                  className="lg-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {capsOn && <div className="lg-caps">زر Caps Lock مفعّل</div>}
            </div>

            <label className="lg-check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="lg-check-box">
                <Check size={14} strokeWidth={3} />
              </span>
              تذكّر اسم المستخدم
            </label>

            {error && (
              <div className={`lg-alert lg-alert--${tone}`} role="alert">
                <ErrorIcon size={18} />
                <span>{error.message}</span>
              </div>
            )}

            <button type="submit" className="lg-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="lg-spinner" aria-hidden="true" />
                  جاري الدخول...
                </>
              ) : (
                "دخول"
              )}
            </button>
          </form>

          <div className="lg-foot">
            {SUPPORT_WHATSAPP ? (
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={15} />
                تواصل مع الدعم
              </a>
            ) : (
              <p>نسيت كلمة المرور؟ اطلب من مالك المتجر يعيّنها من صفحة المستخدمين.</p>
            )}
            <p className="lg-secure">
              <ShieldCheck size={14} />
              اتصال مشفّر
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}