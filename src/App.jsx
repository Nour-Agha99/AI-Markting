import { useState } from "react";
import TabBar from "./components/TabBar";
import LoginPage from "./pages/LoginPage";
import SalePage from "./pages/SalePage";
import ProductsPage from "./pages/ProductsPage";
import DebtsPage from "./pages/DebtsPage";
import { loginUser } from "./services/dataService";

const PAGE_TITLES = {
  sale: "تسجيل بيع",
  products: "المنتجات",
  debts: "الديون",
};

function App() {
  const [activeTab, setActiveTab] = useState("sale");
  const [authToken, setAuthToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState(null);

  const handleLogin = async ({ username, password }) => {
    const data = await loginUser({ username, password });
    setAuthToken(data.token);
    setUserRole(data.role);
    setUsername(data.username);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUserRole(null);
    setUsername(null);
  };

  if (!authToken) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        display: "flex",
        flexDirection: "column",
        maxWidth: "860px",
        margin: "0 auto",
        marginBlock: "100px",
      }}
    >
      <header
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-app)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{PAGE_TITLES[activeTab]}</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "5px 12px",
              borderRadius: 8,
              background: userRole === "admin" ? "rgba(59,130,246,0.12)" : "rgba(156,163,175,0.12)",
              color: userRole === "admin" ? "#60a5fa" : "#d1d5db",
              whiteSpace: "nowrap",
            }}
          >
            {username}
            {userRole === "admin" ? "مدير" : "محاسب"}
          </span>

          <button
            onClick={handleLogout}
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              color: "#ef4444",
              whiteSpace: "nowrap",
            }}
          >
            خروج
          </button>
        </div>
      </header>

      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 660,
          zIndex: 200,
        }}
      >
        <TabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <main style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
        {activeTab === "sale" && <SalePage token={authToken} role={userRole} />}
        {activeTab === "products" && <ProductsPage token={authToken} role={userRole} />}
        {activeTab === "debts" && <DebtsPage token={authToken} role={userRole} />}
      </main>
    </div>
  );
}

export default App;