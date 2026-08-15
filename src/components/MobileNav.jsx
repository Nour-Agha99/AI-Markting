import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Clock,
  AlertTriangle,
  Users,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { getVisibleTabIds } from "../utils/roles";

const TABS = [
  { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "sale", label: "بيع", icon: ShoppingBag },
  { id: "products", label: "منتجات", icon: Package },
  { id: "history", label: "السجل", icon: Clock },
  { id: "debts", label: "الديون", icon: AlertTriangle },
  { id: "users", label: "المستخدمون", icon: Users },
];

export default function MobileNav({
  activeTab,
  onChange,
  role,
  username,
  roleLabel,
  roleColor,
  onLogout,
  themeMode,
  onToggleTheme,
  pageTitle,
}) {
  const [open, setOpen] = useState(false);

  const visibleIds = getVisibleTabIds(role);
  const visibleTabs = TABS.filter((tab) => visibleIds.includes(tab.id));

  function handleSelect(tabId) {
    onChange(tabId);
    // بنسكّر الدروار بعد لمسة بسيطة، منشان اليوزر يشوف إنه فعلاً دخل عالتاب
    setTimeout(() => setOpen(false), 200);
  }

  function handleLogout() {
    setOpen(false);
    onLogout();
  }

  return (
    <>
      <header className="mobile-header">
        <button
          className={`hamburger-btn ${open ? "active" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
          aria-expanded={open}
        >
          <span className="burger-lines">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <span className="page-title">{pageTitle}</span>

        <span
          className="user-chip"
          style={{ background: roleColor.bg, color: roleColor.text }}
        >
          <span className="dot" />
          {username} · {roleLabel}
        </span>
      </header>

      <div
        className={`backdrop ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className={`drawer ${open ? "open" : ""}`} role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div className="drawer-avatar">🧊</div>
          <div>
            <div className="drawer-user-name">{username}</div>
            <div
              className="drawer-user-role"
              style={{ background: roleColor.bg, color: roleColor.text }}
            >
              {roleLabel}
            </div>
          </div>
        </div>

        <nav className="drawer-nav">
          <div className="nav-label">التنقّل</div>

          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`drawer-item ${isActive ? "active" : ""}`}
                onClick={() => handleSelect(tab.id)}
              >
                <span className="icon-wrap">
                  <Icon size={18} />
                </span>
                {tab.label}
              </button>
            );
          })}

          <div className="drawer-divider" />

          <button className="drawer-item danger-item" onClick={handleLogout}>
            <span className="icon-wrap">
              <LogOut size={18} />
            </span>
            خروج
          </button>
        </nav>

        <div className="drawer-foot">
          <button
            className="theme-toggle-mini"
            onClick={onToggleTheme}
            title={themeMode === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
          >
            {themeMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <span className="brand-mini">🧊 المتجر الذكي</span>
        </div>
      </div>
    </>
  );
}