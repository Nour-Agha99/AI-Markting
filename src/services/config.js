export const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;

export const ENDPOINTS = {
  loginUser: `${N8N_BASE_URL}/login`,
  logoutUser: `${N8N_BASE_URL}/logout`,
  recordSale: `${N8N_BASE_URL}/recordSale`,
  addProduct: `${N8N_BASE_URL}/putProduct`,
  getProducts: `${N8N_BASE_URL}/getProduct`,
  editProduct: `${N8N_BASE_URL}/putProduct`,
  deleteProduct: `${N8N_BASE_URL}/deleteProduct`,
  getDebts: `${N8N_BASE_URL}/getDebts`,
  payDebt: `${N8N_BASE_URL}/payDebt`,
  putDebt: `${N8N_BASE_URL}/putDebt`,
  getHistory: `${N8N_BASE_URL}/getHistory`,
  heartbeat: `${N8N_BASE_URL}/heartbeat`,
};