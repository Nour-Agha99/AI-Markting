import { useState, useEffect, useCallback } from "react";
import TabBar from "./components/TabBar";
import LoginPage from "./pages/LoginPage";
import SalePage from "./pages/SalePage";
import ProductsPage from "./pages/ProductsPage";
import DebtsPage from "./pages/DebtsPage";
import HistoryPage from "./pages/HistoryPage";
import { loginUser, logoutUser, getProducts, sendHeartbeat } from "./services/dataService";
import { ROLE_LABELS, ROLE_COLORS, getVisibleTabIds } from "./utils/roles";

const PAGE_TITLES = {
  sale: "تسجيل بيع",
  products: "المنتجات",
  history: "السجل",
  debts: "الديون",
};

const SESSION_KEY = "auth_session";

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

  // حماية إضافية (defense in depth): لو صار activeTab مش مسموح للدور
  // الحالي (مثلاً غيّرنا صلاحيات وما زال فاتح تاب قديم)، رجّعه لـ "sale"
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


  // أي دالة API بترمي SESSION_EXPIRED بتعمل logout تلقائي من هون
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

    // نبضة الجلسة كل دقيقتين، وإذا انتهت صلاحية الجلسة نعمل logout
    const interval = setInterval(() => {
      sendHeartbeat(authToken).catch((err) => {
        if (err?.code === "SESSION_EXPIRED") {
          setSessionNotice("انتهت صلاحية الجلسة، سجل دخول مرة ثانية.");
          handleLogout();
        }
      });
    }, 2 * 60 * 1000); // كل دقيقتين

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
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", flexDirection: "column", maxWidth: "860px", margin: "0 auto", marginBlock: "100px" }}>
      {productsError && (
        <div className={`toast toast-danger ${productsErrorLeaving ? "toast-leaving" : ""}`}>
          {productsError}
        </div>
      )}

      <header style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-app)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{PAGE_TITLES[activeTab]}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, background: roleColor.bg, color: roleColor.text, whiteSpace: "nowrap" }}>
            {username} {roleLabel}
          </span>
          <button onClick={handleLogout} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#ef4444", whiteSpace: "nowrap" }}>
            خروج
          </button>
        </div>
      </header>

      <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 660, zIndex: 200 }}>
        <TabBar activeTab={activeTab} onChange={setActiveTab} role={userRole} />
      </div>

      <main style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
        {activeTab === "sale" && (
          <SalePage mainProducts={mainProducts} refreshProducts={refreshProducts} onApiError={handleApiError} token={authToken} role={userRole} />
        )}
        {activeTab === "products" && (
          <ProductsPage mainProducts={mainProducts} refreshProducts={refreshProducts} onApiError={handleApiError} token={authToken} role={userRole} />
        )}
        {activeTab === "history" && <HistoryPage onApiError={handleApiError} token={authToken} role={userRole} />}
        {activeTab === "debts" && <DebtsPage onApiError={handleApiError} token={authToken} role={userRole} />}
      </main>
    </div>
  );
}

export default App;