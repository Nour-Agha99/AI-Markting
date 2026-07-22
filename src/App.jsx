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
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ opacity: 0.7 }}>
            {username} · {userRole === "admin" ? "مدير" : "محاسب"}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              cursor: "pointer",
              color: "#ef4444",
            }}
          >
            خروج
          </button>
        </div>
      </header>

      <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 660, zIndex: 200 }}>
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