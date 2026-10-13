export const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;

export const ENDPOINTS = {
  // session
  loginUser: `${N8N_BASE_URL}/login`,
  logoutUser: `${N8N_BASE_URL}/logout`,
  heartbeat: `${N8N_BASE_URL}/heartbeat`,

  // products (add and edit are one workflow: an `id` in the body means edit)
  getProducts: `${N8N_BASE_URL}/getProducts`,
  addProduct: `${N8N_BASE_URL}/saveProduct`,
  editProduct: `${N8N_BASE_URL}/saveProduct`,
  deleteProduct: `${N8N_BASE_URL}/deleteProduct`,

  // sales, debts, history, dashboard
  recordSale: `${N8N_BASE_URL}/recordSale`,
  getDebts: `${N8N_BASE_URL}/getDebts`,
  payDebt: `${N8N_BASE_URL}/payDebt`,
  getHistory: `${N8N_BASE_URL}/getHistory`,
  getDashboard: `${N8N_BASE_URL}/getDashboard`,

  // owner only
  getUsers: `${N8N_BASE_URL}/getUsers`,
  saveUser: `${N8N_BASE_URL}/saveUser`,
  toggleUserStatus: `${N8N_BASE_URL}/toggleUser`,
  forceLogoutUser: `${N8N_BASE_URL}/forceLogout`,
  getActivityLog: `${N8N_BASE_URL}/getActivity`,
  getDashboard: `${N8N_BASE_URL}/getDashboard`,
};