export const ROLE_LEVELS = { cashier: 1, admin: 2, owner: 3 };

export const ROLE_LABELS = {
  owner: "المالك",
  admin: "مدير",
  cashier: "كاشير",
};

export const ROLE_COLORS = {
  owner: { bg: "rgba(168,85,247,0.12)", text: "#c084fc" },
  admin: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  cashier: { bg: "rgba(156,163,175,0.12)", text: "#d1d5db" },
};

// owner و admin بس يقدروا يديروا المنتجات (إضافة/تعديل/حذف) 
export function canManageProducts(role) {
  return (ROLE_LEVELS[role] || 0) >= ROLE_LEVELS.admin;
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

// شرط الظهور لكل تاب — لازم يبقى بنفس ترتيب TABS بـ TabBar.jsx
const TAB_VISIBILITY = {
  sale: () => true,
  products: (role) => canManageProducts(role),
  history: () => true,
  debts: () => true,
};

export function getVisibleTabIds(role) {
  return Object.keys(TAB_VISIBILITY).filter((id) => TAB_VISIBILITY[id](role));
}