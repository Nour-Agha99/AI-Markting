import { ENDPOINTS } from "./config";

// ---------- Helper موحّد لمعالجة الأخطاء ----------

function sessionExpiredError() {
  const err = new Error("انتهت صلاحية الجلسة، سجل دخول مرة ثانية.");
  err.code = "SESSION_EXPIRED";
  return err;
}

function networkError(err) {
  return new Error(
    err.message === "Failed to fetch"
      ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
      : err.message
  );
}

async function apiRequest(url, { method = "GET", token, body } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "ngrok-skip-browser-warning": "true",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    throw networkError(err);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  // جلسة منتهية أو حساب معطّل بس - مش أي 401/403 بشكل عام
  // (مثلاً INSUFFICIENT_ROLE هو 403 بس مش معناها انتهت الجلسة)
  const authCode = data && typeof data === "object" ? data.code : null;
  if (authCode === "INVALID_TOKEN" || authCode === "ACCOUNT_DISABLED") {
    throw sessionExpiredError();
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && data.error) ||
      `فشل الاتصال بالسيرفر (${res.status})`;
    const error = new Error(message);
    error.code = (data && typeof data === "object" && data.code) || "UNKNOWN_ERROR";
    error.statusCode = res.status;
    throw error;
  }

  return data;
}

// ---------- تسجيل الدخول / الخروج ----------

export async function loginUser({ username, password }) {
  const data = await apiRequest(ENDPOINTS.loginUser, {
    method: "POST",
    body: { username, password },
  });

  if (!data?.success) {
    const error = new Error(data?.error || "بيانات الدخول غير صحيحة");
    error.code = data?.code || "UNKNOWN_ERROR";
    throw error;
  }

  return data;
}

export async function logoutUser(token) {
  try {
    await apiRequest(ENDPOINTS.logoutUser, { method: "POST", token });
  } catch {
  }
  return true;
}

// ---------- المنتجات ----------

export async function getProducts(token) {
  const data = await apiRequest(ENDPOINTS.getProducts, { token });

  if (!data?.success) {
    const error = new Error(data?.error || "ما قدرنا نجيب المنتجات، حاول مرة ثانية.");
    error.code = data?.code || "UNKNOWN_ERROR";
    throw error;
  }

  const products = Array.isArray(data?.products) ? data.products : [];

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    sellPrice: Number(p.sellPrice ?? p.sell_price),
    buyPrice: Number(p.buyPrice ?? p.buy_price),
    quantity: Number(p.quantity),
    alertThreshold: Number(p.alertThreshold ?? p.alert_threshold),
  }));
}

export async function addProduct(product, token) {
  const newProduct = { ...product };
  const response = await apiRequest(ENDPOINTS.addProduct, {
    method: "PUT",
    token,
    body: newProduct,
  });
  return { ...newProduct, serverResponse: response };
}

export async function updateProduct(id, changes, token) {
  const response = await apiRequest(ENDPOINTS.editProduct, {
    method: "PUT",
    token,
    body: { id, ...changes },
  });
  return { id, ...changes, serverResponse: response };
}

export async function deleteProduct(id, token) {
  const response = await apiRequest(ENDPOINTS.deleteProduct, {
    method: "DELETE",
    token,
    body: { id },
  });
  if (!response?.success) {
    const error = new Error(response?.error || "بيانات الدخول غير صحيحة");
    error.code = response?.code || "UNKNOWN_ERROR";
    throw error;
  }
  return true;
}

// ---------- المبيعات ----------

export async function recordSale(sale, token) {
  const newSale = { ...sale };
  const response = await apiRequest(ENDPOINTS.recordSale, {
    method: "POST",
    token,
    body: newSale,
  });
  if (!response?.success) {
    const error = new Error(response?.error || "بيانات الدخول غير صحيحة");
    error.code = response?.code || "UNKNOWN_ERROR";
    throw error;
  }
  return { ...newSale, serverResponse: response };
}

// ---------- الديون ----------

export async function getDebts(token) {
  const data = await apiRequest(ENDPOINTS.getDebts, { token });
  return Array.isArray(data) ? data : [];
}

export async function recordPayment(debtId, amount, token) {
  return apiRequest(ENDPOINTS.payDebt, {
    method: "POST",
    token,
    body: { id: debtId, amount },
  });

}

// ---------- السجل ----------

export async function getHistory(token) {
  const data = await apiRequest(ENDPOINTS.getHistory, { token });
  return Array.isArray(data) ? data : [];
}

// ---------- نبضة الجلسة ----------

export async function sendHeartbeat(token) {
  return apiRequest(ENDPOINTS.heartbeat, { method: "POST", token });
}