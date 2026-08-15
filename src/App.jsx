import { loginUser, logoutUser, getProducts, sendHeartbeat } from "./services/dataService";
import { LogOut, Sun, Moon } from "lucide-react";
import { ROLE_LABELS, ROLE_COLORS, getVisibleTabIds } from "./utils/roles";
import { useState, useEffect, useCallback } from "react";
import TabBar from "./components/TabBar";
import TopNav from "./components/TopNav";
import LoginPage from "./pages/LoginPage";
import SalePage from "./pages/SalePage";
import ProductsPage from "./pages/ProductsPage";
import DebtsPage from "./pages/DebtsPage";
import HistoryPage from "./pages/HistoryPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import ActivityLogPage from "./pages/ActivityLogPage";

const PAGE_TITLES = {
  dashboard: "لوحة التحكم",
  sale: "تسجيل بيع",
  products: "المنتجات",
  history: "السجل",
  debts: "الديون",
  activityLog: "سجل النشاطات",
  users: "المستخدمون",
};

const SESSION_KEY = "auth_session";
const THEME_KEY = "theme_mode";

function App() {
  const [activeTab, setActiveTab] = useState("sale");
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [mainProducts, setMainProducts] = useState([]);
  const [sessionNotice, setSessionNotice] = useState("");
  const [productsError, setProductsError] = useState("");
  const [productsErrorLeaving, setProductsErrorLeaving] = useState(false);
  const [sessionNoticeLeaving, setSessionNoticeLeaving] = useState(false);
  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem(THEME_KEY) || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
    localStorage.setItem(THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (!productsError) return;
    setProductsErrorLeaving(false);

    const leaveTimer = setTimeout(() => setProductsErrorLeaving(true), 4700);
    const clearTimer = setTimeout(() => setProductsError(""), 5000);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(clearTimer);
    };
  }, [productsError]);

  useEffect(() => {
    if (!userRole) return;
    const visible = getVisibleTabIds(userRole);
    if (!visible.includes(activeTab)) {
      setActiveTab("sale");
    }
  }, [userRole, activeTab]);

  useEffect(() => {
    if (!sessionNotice) return;
    setSessionNoticeLeaving(false);

    const leaveTimer = setTimeout(() => setSessionNoticeLeaving(true), 4700);
    const clearTimer = setTimeout(() => setSessionNotice(""), 5000);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(clearTimer);
    };
  }, [sessionNotice]);

  useEffect(() => {
    async function restoreSession() {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          const { token, role, username: savedUsername } = JSON.parse(saved);
          if (token) {
            setAuthToken(token);
            setUserRole(role);
            setUsername(savedUsername);

            try {
              const products = await getProducts(token);
              setMainProducts(products);
            } catch (err) {
              if (err?.code === "SESSION_EXPIRED") {
                handleLogout();
              } else {
                setProductsError(err.message || "ما قدرنا نجيب المنتجات، حاول تحدّث الصفحة.");
              }
            }
          }
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      } finally {
        setHydrated(true);
      }
    }

    restoreSession();
  }, []);

  const refreshProducts = useCallback(async () => {
    if (!authToken) return;
    try {
      const products = await getProducts(authToken);
      setMainProducts(products);
      setProductsError("");
    } catch (err) {
      if (err?.code === "SESSION_EXPIRED") {
        handleLogout();
      } else {
        setProductsError(err.message || "ما قدرنا نحدّث المنتجات، حاول مرة ثانية.");
      }
    }
  }, [authToken]);

  function handleApiError(err) {
    if (err?.code === "SESSION_EXPIRED") {
      setSessionNotice("انتهت صلاحية الجلسة، سجل دخول مرة ثانية.");
      handleLogout();
    }
    throw err;
  }

  const handleLogin = async ({ username, password }) => {
    const data = await loginUser({ username, password });
    setMainProducts(data.products || []);
    setAuthToken(data.token);
    setUserRole(data.role);
    setUsername(data.username);
    setSessionNotice("");
    setProductsError(data.productsWarning || "");

    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: data.token, role: data.role, username: data.username })
    );
  };

  const handleLogout = () => {
    if (authToken) logoutUser(authToken);
    setAuthToken(null);
    setUserRole(null);
    setUsername(null);
    setMainProducts([]);
    setProductsError("");
    sessionStorage.removeItem(SESSION_KEY);
  };

  useEffect(() => {
    if (!authToken) return;

    const interval = setInterval(() => {
      sendHeartbeat(authToken).catch((err) => {
        if (err?.code === "SESSION_EXPIRED") {
          setSessionNotice("انتهت صلاحية الجلسة، سجل دخول مرة ثانية.");
          handleLogout();
        }
      });
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [authToken]);

  if (!hydrated) return null;

  if (!authToken) {
    return (
      <>
        {sessionNotice && (
          <div className={`toast toast-warning ${sessionNoticeLeaving ? "toast-leaving" : ""}`}>
            {sessionNotice}
          </div>
        )}
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  const roleLabel = ROLE_LABELS[userRole] || userRole;
  const roleColor = ROLE_COLORS[userRole] || ROLE_COLORS.cashier;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      {productsError && (
        <div className={`toast toast-danger ${productsErrorLeaving ? "toast-leaving" : ""}`}>
          {productsError}
        </div>
      )}

      <TopNav
        activeTab={activeTab}
        onChange={setActiveTab}
        role={userRole}
        username={username}
        roleLabel={roleLabel}
        roleColor={roleColor}
        onLogout={handleLogout}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((m) => (m === "dark" ? "light" : "dark"))}
      />

      <div className="app-shell">

        <div className="mobile-nav-wrapper">
          <TabBar activeTab={activeTab} onChange={setActiveTab} role={userRole} />
        </div>
        <header className="mobile-header">
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>{PAGE_TITLES[activeTab]}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
            className="theme-toggle"
            onClick={themeMode === "dark" ? () => setThemeMode("light") : () => setThemeMode("dark")}
            title={themeMode === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {themeMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: roleColor.bg, color: roleColor.text, whiteSpace: "nowrap" }}>
              {username} {roleLabel}
            </span>
            <button onClick={handleLogout} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#ef4444", whiteSpace: "nowrap" }}>
              خروج
            </button>
          </div>
        </header>

        <main style={{ paddingBottom: 90 }}>
          {activeTab === "dashboard" && (
            <DashboardPage
              mainProducts={mainProducts}
              token={authToken}
              onApiError={handleApiError}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === "sale" && (
            <SalePage mainProducts={mainProducts} refreshProducts={refreshProducts} onApiError={handleApiError} token={authToken} role={userRole} />
          )}
          {activeTab === "products" && (
            <ProductsPage mainProducts={mainProducts} refreshProducts={refreshProducts} onApiError={handleApiError} token={authToken} role={userRole} />
          )}
          {activeTab === "history" && <HistoryPage onApiError={handleApiError} token={authToken} role={userRole} />}
          {activeTab === "debts" && <DebtsPage onApiError={handleApiError} token={authToken} role={userRole} />}
          {activeTab === "activityLog" && (
            <ActivityLogPage token={authToken} onApiError={handleApiError} />
          )}
          {activeTab === "users" && (
            <UsersPage token={authToken} currentUsername={username} onApiError={handleApiError} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;