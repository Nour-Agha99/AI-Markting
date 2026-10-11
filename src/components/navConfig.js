import { useEffect } from "react";
import { LayoutDashboard, ShoppingBag, Package, Clock, Wallet, ShieldCheck, Users } from "lucide-react";
import { getVisibleTabIds } from "../utils/roles";

export const NAV_TABS = [
  { id: "dashboard", label: "لوحة التحكم", short: "الرئيسية", icon: LayoutDashboard, desc: "ملخص اليوم والمخزون", priority: 3 },
  { id: "sale", label: "بيع", icon: ShoppingBag, desc: "تسجيل عملية بيع جديدة", priority: 1 },
  { id: "products", label: "المنتجات", icon: Package, desc: "الأسعار والمخزون", priority: 4 },
  { id: "history", label: "السجل", icon: Clock, desc: "كل المبيعات والتسديدات", priority: 5 },
  { id: "debts", label: "الديون", icon: Wallet, desc: "ديون الزبائن وتسديداتها", priority: 2 },
  { id: "activityLog", label: "النشاطات", icon: ShieldCheck, desc: "سجل كل حركة بالنظام", priority: 6, more: true, group: "الإدارة" },
  { id: "users", label: "المستخدمون", icon: Users, desc: "الحسابات والصلاحيات", priority: 7, more: true, group: "الإدارة" },
];

export function getTabsFor(role) {
  const ids = getVisibleTabIds(role);
  return NAV_TABS.filter((t) => ids.includes(t.id));
}

// الموبايل: أقصى 5 خانات. إذا التبويبات أكتر، أهم 4 بالشريط والباقي تحت "المزيد"
export function splitForMobile(tabs) {
  if (tabs.length <= 5) return { bar: tabs, more: [] };
  const top = [...tabs].sort((a, b) => a.priority - b.priority).slice(0, 4).map((t) => t.id);
  return { bar: tabs.filter((t) => top.includes(t.id)), more: tabs.filter((t) => !top.includes(t.id)) };
}

export function initialOf(name) {
  return (name || "؟").trim().charAt(0).toUpperCase();
}

// يسكّر القائمة بالضغط برّاها أو بـ Escape
export function useDismiss(open, ref, onClose) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref, onClose]);
}