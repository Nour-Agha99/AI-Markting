export const ROLE_LEVELS = { cashier: 1, admin: 2, owner: 3 };

export const ROLE_LABELS = {
  owner: "المالك",
  admin: "مدير",
  cashier: "كاشير",
};

export const ROLE_COLORS = {
  owner: { bg: "rgba(245, 158, 11, 0.14)", text: "#f59e0b" },
  admin: { bg: "rgba(59, 130, 246, 0.14)", text: "#3b82f6" },
  cashier: { bg: "rgba(45, 212, 191, 0.14)", text: "#2dd4bf" },
};

// owner و admin بس يقدروا يديروا المنتجات (إضافة/تعديل/حذف) 
export function canManageProducts(role) {
  return (ROLE_LEVELS[role] || 0) >= ROLE_LEVELS.admin;
}

export function canManageUsers(role) {
  return role === "owner";
}

// سجل النشاطات (Audit Log) — أونر بس، فيه بيانات إدارية/أمنية حساسة
export function canViewActivityLog(role) {
  return role === "owner";
}

// تعديل بيعة بالسجل:
// - admin / owner: أي بيعة، بأي وقت
// - cashier: بيعاته هو بس، وبنفس يوم تسجيلها بس
export function canEditSale(role, sale, currentUserId) {
  if ((ROLE_LEVELS[role] || 0) >= ROLE_LEVELS.admin) return true;
  if (role !== "cashier") return false;
  if (!sale?.createdBy || sale.createdBy !== currentUserId) return false;

  const saleDate = new Date(sale.date);
  const now = new Date();
  return saleDate.toDateString() === now.toDateString();
}

const TAB_VISIBILITY = {
  dashboard: (role) => canViewDashboard(role),
  sale: () => true,
  products: (role) => canManageProducts(role),
  history: () => true,
  debts: () => true,
  activityLog: (role) => canViewActivityLog(role),
  users: (role) => canManageUsers(role),
};

export function getVisibleTabIds(role) {
  return Object.keys(TAB_VISIBILITY).filter((id) => TAB_VISIBILITY[id](role));
}

export function canViewDashboard(role) {
  return role === "owner";
}