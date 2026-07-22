import { loginUser } from "./dataService";

export const N8N_BASE_URL = "https://barrette-evident-unaudited.ngrok-free.dev/webhook";

export const ENDPOINTS = {
  loginUser: `${N8N_BASE_URL}/login`,
  recordSale: `${N8N_BASE_URL}/recordSale`,
  addProduct: `${N8N_BASE_URL}/putProduct`,
  getProducts: `${N8N_BASE_URL}/getProduct`,
  editProduct: `${N8N_BASE_URL}/putProduct`,
  deleteProduct: `${N8N_BASE_URL}/deleteProduct`,
  getDebts: `${N8N_BASE_URL}/getDebts`,
  payDebt: `${N8N_BASE_URL}/payDebt`,
  putDebt: `${N8N_BASE_URL}/putDebt`
};