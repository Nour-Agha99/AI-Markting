import { ENDPOINTS } from "./config";

const PRODUCTS_KEY = "mock_products";
const SALES_KEY = "mock_sales";
const DEBTS_KEY = "mock_debts";


// ---------- المنتجات ----------

export async function getProducts() {
  try {
    const res = await fetch(ENDPOINTS.getProducts, { method: "GET" });

      if (!res.ok) {
        throw new Error(`فشل الاتصال بالسيرفر (${res.status})`);
      }

    const text = await res.text();
    const data = text ? JSON.parse(text) : [];

      return Array.isArray(data) ? data : [];
    } catch (err) {
      throw new Error(
        err.message === "Failed to fetch"
          ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
          : err.message
      );
    }
}

export async function addProduct(product) {
 
  const newProduct = { ...product, id: `p${Date.now()}` };
  let response;
  try {
    const res = await fetch(ENDPOINTS.addProduct, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    });

    if (!res.ok) {
      throw new Error(`فشل الاتصال بالسيرفر (${res.status})`);
    }

    const text = await res.text();

    try {
      response = text ? JSON.parse(text) : null;
    } catch {
      response = text;
    }
  } catch (err) {
    throw new Error(
      err.message === "Failed to fetch"
        ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
        : err.message
    );
  }

  return { ...newProduct, serverResponse: response };
}

export async function updateProduct(id, changes) {
  let response;
  try {
    const res = await fetch(ENDPOINTS.editProduct, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });

    if (!res.ok) {
      throw new Error(`فشل الاتصال بالسيرفر (${res.status})`);
    }

    const text = await res.text();

    try {
      response = text ? JSON.parse(text) : null;
    } catch {
      response = text;
    }
  } catch (err) {
    throw new Error(
      err.message === "Failed to fetch"
        ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
        : err.message
    );
  }

  return { id, ...changes, serverResponse: response };
}

export async function deleteProduct(id) {
  try {
    const res = await fetch(ENDPOINTS.deleteProduct, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      throw new Error(`فشل الاتصال بالسيرفر (${res.status})`);
    }
  } catch (err) {
    throw new Error(
      err.message === "Failed to fetch"
        ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
        : err.message
    );
  }

  return true;
}

// ---------- المبيعات ----------

export async function getSales() {
  try {
    const res = await fetch(ENDPOINTS.getSales, { method: "GET" });

      if (!res.ok) {
        throw new Error(`فشل الاتصال بالسيرفر (${res.status})`);
      }

    const text = await res.text();
    const data = text ? JSON.parse(text) : [];

      return Array.isArray(data) ? data : [];
    } catch (err) {
      throw new Error(
        err.message === "Failed to fetch"
          ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
          : err.message
      );
    }
}

export async function recordSale(sale) {

  const newSale = {
    ...sale,
    id: `s${Date.now()}`,
    date: new Date().toISOString(),
  };

  let response;
  try {
    const res = await fetch(ENDPOINTS.recordSale, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSale),
    });

    if (!res.ok) {
      throw new Error(`فشل الاتصال بالسيرفر (${res.status})`);
    }

    const text = await res.text();
    try {
      response = text ? JSON.parse(text) : null;
    } catch {
      response = text;
    }
  } catch (err) {
    throw new Error(
      err.message === "Failed to fetch"
        ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
        : err.message
    );
  }

  return { ...newSale, serverResponse: response };
}

// ---------- الديون ----------

export async function getDebts() {
  try {
    const res = await fetch(ENDPOINTS.getDebts, { method: "GET" });

    if (!res.ok) {
      throw new Error(`فشل الاتصال بالسيرفر (${res.status})`);
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : [];

    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw new Error(
      err.message === "Failed to fetch"
        ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
        : err.message
    );
  }
}

export async function recordPayment(debtId, amount) {
  try {
    const res = await fetch(ENDPOINTS.payDebt, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: debtId, amount }),
    });

    if (!res.ok) {
      throw new Error(`فشل تسجيل الدفعة (${res.status})`);
    }
    
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(
      err.message === "Failed to fetch"
        ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
        : err.message
    );
  }
}