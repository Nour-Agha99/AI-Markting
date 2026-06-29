import { ShoppingBag, Package, Clock, AlertTriangle, BarChart2 } from "lucide-react";

const TABS = [
  { id: "sale", label: "بيع", icon: ShoppingBag },
  { id: "products", label: "منتجات", icon: Package },
  { id: "debts", label: "الديون", icon: AlertTriangle },
];

export default function TabBar({ activeTab, onChange }) {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => {
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
