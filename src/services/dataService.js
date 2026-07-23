import { ENDPOINTS } from "./config";

const PRODUCTS_KEY = "mock_products";
const SALES_KEY = "mock_sales";
const DEBTS_KEY = "mock_debts";

export async function loginUser({ username, password }) {
  const response = await fetch(ENDPOINTS.loginUser, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": "true" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('فشل الاتصال بالسيرفر');
  }

  const data = await response.json();

  if (!data[0].success) {
    throw new Error('بيانات الدخول غير صحيحة');
  }

  return data[0];
}
// ---------- المنتجات ----------
export async function getProducts(token) {
  try {
    const res = await fetch(ENDPOINTS.getProducts, {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Authorization": `Bearer ${token}`,
      },
    });

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
export async function addProduct(product, token) {

  const newProduct = { ...product, id: `p${Date.now()}` };
  let response;
  try {
    const res = await fetch(ENDPOINTS.addProduct, {
      method: "PUT",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(newProduct),
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("انتهت صلاحية الجلسة، سجل دخول مرة ثانية.");
    }
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

export async function updateProduct(id, changes, token) {
  let response;
  try {
    const res = await fetch(ENDPOINTS.editProduct, {
      method: "PUT",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ id, ...changes }),
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("انتهت صلاحية الجلسة، سجل دخول مرة ثانية.");
    }
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

export async function deleteProduct(id, token) {
  try {
    const res = await fetch(ENDPOINTS.deleteProduct, {
      method: "DELETE",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("انتهت صلاحية الجلسة، سجل دخول مرة ثانية.");
    }
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
    const res = await fetch(ENDPOINTS.getSales, {
      method: "GET",
      headers: { "ngrok-skip-browser-warning": "true" },
    });

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
      headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
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
    const res = await fetch(ENDPOINTS.getDebts, {
      method: "GET",
      headers: { "ngrok-skip-browser-warning": "true" },
    });

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
      headers: { "ngrok-skip-browser-warning": "true", "Content-Type": "application/json" },
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