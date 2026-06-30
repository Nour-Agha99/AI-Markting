import { useState } from "react";
import TabBar from "./components/TabBar";
import SalePage from "./pages/SalePage";
import ProductsPage from "./pages/ProductsPage";
import DebtsPage from "./pages/DebtsPage";

const PAGE_TITLES = {
  sale: "تسجيل بيع",
  products: "المنتجات",
  debts: "الديون",
};

function App() {
  const [activeTab, setActiveTab] = useState("sale");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        display: "flex",
        flexDirection: "column",
        maxWidth: "860px",
        margin: "0 auto",
        marginBlock:"100px" ,
      }}
    >
      <header
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-app)",
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{PAGE_TITLES[activeTab]}</h1>
      </header>

      <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 660, zIndex: 200 }}>
        <TabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <main style={{ flex: 1,  overflowY: "auto", paddingBottom: 90 }}>
        {activeTab === "sale" && <SalePage />}
        {activeTab === "products" && <ProductsPage />}
        {activeTab === "debts" && <DebtsPage />}
      </main>

    </div>
  );
}

export default App;
