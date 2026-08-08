import { ShoppingBag, Package, Clock, AlertTriangle, LogOut, Sun, Moon } from "lucide-react";
import { getVisibleTabIds } from "../utils/roles";

const TABS = [
  { id: "sale", label: "بيع", icon: ShoppingBag },
  { id: "products", label: "منتجات", icon: Package },
  { id: "history", label: "السجل", icon: Clock },
  { id: "debts", label: "الديون", icon: AlertTriangle },
];

export default function TopNav({
  activeTab,
  onChange,
  role,
  username,
  roleLabel,
  roleColor,
  onLogout,
  themeMode,
  onToggleTheme,
}) {
  const visibleIds = getVisibleTabIds(role);
  const visibleTabs = TABS.filter((tab) => visibleIds.includes(tab.id));

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <div className="top-nav-brand">
          <span className="top-nav-logo">🧊</span>
          <span>المتجر الذكي</span>
        </div>

        <nav className="top-nav-links">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`top-nav-link ${isActive ? "active" : ""}`}
                onClick={() => onChange(tab.id)}
              >
                <Icon size={17} strokeWidth={isActive ? 2.4 : 1.8} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="top-nav-actions">
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            title={themeMode === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {themeMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <span
            className="top-nav-user"
            style={{ background: roleColor.bg, color: roleColor.text }}
          >
            {username} · {roleLabel}
          </span>

          <button className="top-nav-logout" onClick={onLogout}>
            <LogOut size={15} />
            خروج
          </button>
        </div>
      </div>
    </header>
  );
}