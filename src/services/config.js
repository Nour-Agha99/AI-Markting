export const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;

export const ENDPOINTS = {
  // session
  loginUser: `${N8N_BASE_URL}/login-v2`,
  logoutUser: `${N8N_BASE_URL}/logout-v2`,
  heartbeat: `${N8N_BASE_URL}/heartbeat-v2`,

  // products (add and edit are one workflow: an `id` in the body means edit)
  getProducts: `${N8N_BASE_URL}/get-products-v2`,
  addProduct: `${N8N_BASE_URL}/save-product-v2`,
  editProduct: `${N8N_BASE_URL}/save-product-v2`,
  deleteProduct: `${N8N_BASE_URL}/delete-product-v2`,
  linkBarcode: `${N8N_BASE_URL}/link-barcode-v2`,

  // sales, debts, history, dashboard
  recordSale: `${N8N_BASE_URL}/record-sale-v2`,
  getDebts: `${N8N_BASE_URL}/get-debts-v2`,
  payDebt: `${N8N_BASE_URL}/pay-debt-v2`,
  getHistory: `${N8N_BASE_URL}/get-history-v2`,
  getDashboard: `${N8N_BASE_URL}/get-dashboard-v2`,

  // owner only
  getUsers: `${N8N_BASE_URL}/get-users-v2`,
  saveUser: `${N8N_BASE_URL}/save-user-v2`,
  toggleUserStatus: `${N8N_BASE_URL}/toggle-user-v2`,
  forceLogoutUser: `${N8N_BASE_URL}/force-logout-v2`,
  getActivityLog: `${N8N_BASE_URL}/get-ativity-v2`,
  getDashboard: `${N8N_BASE_URL}/get-dashboard-v2`,

  // customers
  getCustomers: `${N8N_BASE_URL}/get-customers-v2`,
  saveCustomer: `${N8N_BASE_URL}/save-customer-v2`,
};