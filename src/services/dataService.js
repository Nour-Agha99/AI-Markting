// ============================================
// خدمة البيانات — حالياً Mock، بعدين رح تتوصل بـ n8n
// ============================================
//
// كل دالة هون لاحقاً رح تستبدل بـ fetch لـ n8n webhook.
// شكل البيانات (response shape) ثابت من هسا عشان ما نضطر
// نعدل الواجهة لما نوصل المرحلة الثانية (الربط مع n8n).

const PRODUCTS_KEY = "mock_products";
const SALES_KEY = "mock_sales";
const DEBTS_KEY = "mock_debts";

const seedProducts = [
  { id: "p1", name: "سمك بكلا", buyPrice: 45, sellPrice: 61.5, quantity: 18.2, unit: "kg", alertThreshold: 5 },
  { id: "p2", name: "شبار", buyPrice: 22, sellPrice: 30, quantity: 0.8, unit: "kg", alertThreshold: 2 },
  { id: "p3", name: "صدر جاج", buyPrice: 18, sellPrice: 24, quantity: 40, unit: "piece", alertThreshold: 10 },
  { id: "p4", name: "دبابيس", buyPrice: 0.8, sellPrice: 1.2, quantity: 200, unit: "piece", alertThreshold: 30 },
];

const seedSales = [];
const seedDebts = [];

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------- المنتجات ----------

export async function getProducts() {
  // TODO: استبدال بـ -> POST/GET إلى n8n webhook: /webhook/get-products
  return loadFromStorage(PRODUCTS_KEY, seedProducts);
}

export async function addProduct(product) {
  // TODO: استبدال بـ -> POST إلى n8n webhook: /webhook/add-product
  const products = loadFromStorage(PRODUCTS_KEY, seedProducts);
  const newProduct = { ...product, id: `p${Date.now()}` };
  const updated = [...products, newProduct];
  saveToStorage(PRODUCTS_KEY, updated);
  return newProduct;
}

export async function updateProduct(id, changes) {
  const products = loadFromStorage(PRODUCTS_KEY, seedProducts);
  const updated = products.map((p) => (p.id === id ? { ...p, ...changes } : p));
  saveToStorage(PRODUCTS_KEY, updated);
  return updated.find((p) => p.id === id);
}

export async function deleteProduct(id) {
  const products = loadFromStorage(PRODUCTS_KEY, seedProducts);
  const updated = products.filter((p) => p.id !== id);
  saveToStorage(PRODUCTS_KEY, updated);
  return true;
}

// ---------- المبيعات ----------

export async function getSales() {
  // TODO: استبدال بـ -> GET من n8n webhook: /webhook/get-sales
  return loadFromStorage(SALES_KEY, seedSales);
}

export async function recordSale(sale) {
  // TODO: استبدال بـ -> POST إلى n8n webhook: /webhook/record-sale
  // payload المتوقع: { customerName, isDebt, paymentMethod, items: [{productId, qty, unitPrice}], notes, total }
  // إذا isDebt === true → n8n لازم يسجل سطر بشيت "الديون" كمان (نفس منطق addDebt تحت)
  const sales = loadFromStorage(SALES_KEY, seedSales);
  const products = loadFromStorage(PRODUCTS_KEY, seedProducts);

  const newSale = {
    ...sale,
    id: `s${Date.now()}`,
    date: new Date().toISOString(),
  };

  // تحديث المخزون محلياً (تجربة فقط، n8n رح يعمل هاد لاحقاً)
  const updatedProducts = products.map((p) => {
    const item = sale.items.find((i) => i.productId === p.id);
    if (item) {
      return { ...p, quantity: Math.max(0, p.quantity - item.qty) };
    }
    return p;
  });

  saveToStorage(SALES_KEY, [...sales, newSale]);
  saveToStorage(PRODUCTS_KEY, updatedProducts);

  // لو البيع "دين"، بيتسجل تلقائياً بصفحة الديون
  if (sale.isDebt) {
    await addDebt({
      customerName: sale.customerName,
      amount: sale.total,
      paymentMethod: sale.paymentMethod, // الطريقة المتوقعة عند السداد لاحقاً
      saleId: newSale.id,
    });
  }

  return newSale;
}

// ---------- الديون ----------

export async function getDebts() {
  // TODO: استبدال بـ -> GET من n8n webhook: /webhook/get-debts
  return loadFromStorage(DEBTS_KEY, seedDebts);
}

export async function addDebt(debt) {
  // TODO: استبدال بـ -> POST إلى n8n webhook: /webhook/add-debt
  const debts = loadFromStorage(DEBTS_KEY, seedDebts);
  const newDebt = {
    ...debt,
    id: `d${Date.now()}`,
    date: new Date().toISOString(),
    status: "unpaid",
    paidAmount: 0,
  };
  saveToStorage(DEBTS_KEY, [...debts, newDebt]);
  return newDebt;
}

export async function recordPayment(debtId, amount) {
  // TODO: استبدال بـ -> POST إلى n8n webhook: /webhook/pay-debt
  const debts = loadFromStorage(DEBTS_KEY, seedDebts);
  const updated = debts.map((d) => {
    if (d.id !== debtId) return d;
    const paidAmount = d.paidAmount + amount;
    const status = paidAmount >= d.amount ? "paid" : "partial";
    return { ...d, paidAmount, status };
  });
  saveToStorage(DEBTS_KEY, updated);
  return updated.find((d) => d.id === debtId);
}
