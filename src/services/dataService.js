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
  // TODO: استبدال بـ -> GET من n8n webhook: /webhook/get-sales
  return ;
}

export async function recordSale(sale) {
  // متصل فعلياً بـ n8n webhook: POST /webhook/record-sales
  // payload المبعوت: { customerName, isDebt, paymentMethod, items: [{productId, qty, unitPrice}], notes, total }


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
      body: JSON.stringify(sale),
    });

    if (!res.ok) {
      throw new Error(`فشل الاتصال بالسيرفر (${res.status})`);
    }

    // الـ "Respond to Webhook" node لسا بلا معالجة، فممكن يرجع رد فاضي أو نص بسيط
    const text = await res.text();
    try {
      response = text ? JSON.parse(text) : null;
    } catch {
      response = text; // الرد مش JSON، خليه كنص خام
    }
  } catch (err) {
    // فشل الاتصال (نت مقطوع أو السيرفر مش راد) — نوقف العملية ونعلم المستخدم
    throw new Error(
      err.message === "Failed to fetch"
        ? "ما قدرنا نوصل للسيرفر. تأكد من الإنترنت وحاول مرة ثانية."
        : err.message
    );
  }

  // تحديث المخزون محلياً (لحد ما n8n يضيف هاد المنطق بنفسه عبر Google Sheets)
  const updatedProducts = products.map((p) => {
    const item = sale.items.find((i) => i.productId === p.id);
    if (item) {
      return { ...p, quantity: Math.max(0, p.quantity - item.qty) };
    }
    return p;
  });


  // لو البيع "دين"، بيتسجل تلقائياً بصفحة الديون (محلياً لحد ما n8n يعالجها)
  if (sale.isDebt) {
    await addDebt({
      customerName: sale.customerName,
      amount: sale.total,
      paymentMethod: sale.paymentMethod,
      saleId: newSale.id,
    });
  }

  return { ...newSale, serverResponse: response };
}

// ---------- الديون ----------

export async function getDebts() {
  // TODO: استبدال بـ -> GET من n8n webhook: /webhook/get-debts
  return ;
}

export async function addDebt(debt) {
  // TODO: استبدال بـ -> POST إلى n8n webhook: /webhook/add-debt
  const newDebt = {
    ...debt,
    id: `d${Date.now()}`,
    date: new Date().toISOString(),
    status: "unpaid",
    paidAmount: 0,
  };
  return newDebt;
}

export async function recordPayment(debtId, amount) {
  // TODO: استبدال بـ -> POST إلى n8n webhook: /webhook/pay-debt
  const updated = debts.map((d) => {
    if (d.id !== debtId) return d;
    const paidAmount = d.paidAmount + amount;
    const status = paidAmount >= d.amount ? "paid" : "partial";
    return { ...d, paidAmount, status };
  });
  return updated.find((d) => d.id === debtId);
}