import { ShoppingBag, Package, Clock, AlertTriangle } from "lucide-react";
import { getVisibleTabIds } from "../utils/roles";

const TABS = [
  { id: "sale", label: "بيع", icon: ShoppingBag },
  { id: "products", label: "منتجات", icon: Package },
  { id: "history", label: "السجل", icon: Clock },
  { id: "debts", label: "الديون", icon: AlertTriangle },
];

export default function TabBar({ activeTab, onChange, role }) {
  const visibleIds = getVisibleTabIds(role);
  const visibleTabs = TABS.filter((tab) => visibleIds.includes(tab.id));

  return (
    <nav className="tab-bar">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`tab-item ${isActive ? "active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            <span className={isActive ? "tab-icon-bg" : ""}>
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}