// Smoke test for the v2 endpoints. Needs Node 18+ (built-in fetch).
//
//   BASE_URL=https://aimanagment.app.n8n.cloud/webhook TEST_USER=<username> TEST_PASS=<password> node smoke_test.mjs
//
// It never changes business data: no sale is recorded, no payment is made. It only
// creates one session + a few audit rows (login, logout, one failed login).
// Use a REAL account of any role. Run it from a terminal, not from a shared CI log
// (the password is read from the environment and never printed).

const BASE = (process.env.BASE_URL || '').replace(/\/$/, '');
const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASS;
if (!BASE || !USER || !PASS) {
  console.error('Set BASE_URL, TEST_USER and TEST_PASS');
  process.exit(2);
}

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `   -> ${detail}` : ''}`);
};

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON answer */
  }
  return { status: res.status, data };
}
const show = (r) => `HTTP ${r.status} ${JSON.stringify(r.data)?.slice(0, 160)}`;

// ---- login ----------------------------------------------------------------
let r = await call('POST', 'login-v2', { body: { username: USER, password: `${PASS}-definitely-wrong` } });
check('login: wrong password -> 401 INVALID_CREDENTIALS', r.status === 401 && r.data?.code === 'INVALID_CREDENTIALS', show(r));

r = await call('POST', 'login-v2', { body: { username: USER, password: '' } });
check('login: empty password -> 400 MISSING_FIELDS', r.status === 400 && r.data?.code === 'MISSING_FIELDS', show(r));

r = await call('POST', 'login-v2', { body: { username: USER, password: PASS } });
check('login: right password -> 200 + token + products',
  r.status === 200 && r.data?.success === true && typeof r.data?.token === 'string' && r.data.token.length === 64 &&
    Array.isArray(r.data?.products), show(r));
if (r.status !== 200) {
  console.error('\nCannot continue without a session.');
  process.exit(1);
}
const token = r.data.token;
const role = r.data.role;
const loginProducts = r.data.products;
const wantsCost = role === 'owner' || role === 'admin';
check(`login: buyPrice ${wantsCost ? 'present' : 'ABSENT'} for role "${role}"`,
  loginProducts.length === 0 || loginProducts.every((p) => ('buyPrice' in p) === wantsCost));

// ---- products -------------------------------------------------------------
r = await call('GET', 'get-products-v2', { token });
check('get-products: with token -> 200', r.status === 200 && r.data?.success === true && Array.isArray(r.data?.products), show(r));
r = await call('GET', 'get-products-v2');
check('get-products: no token -> 401 INVALID_TOKEN', r.status === 401 && r.data?.code === 'INVALID_TOKEN', show(r));
r = await call('GET', 'get-products-v2', { token: 'x'.repeat(64) });
check('get-products: forged token -> 401', r.status === 401, show(r));

// ---- sale: only requests that must be REFUSED (nothing is written) --------
const p = loginProducts.find((x) => x.unit === 'piece' && x.quantity >= 1);
if (p) {
  r = await call('POST', 'record-sale-v2', {
    token,
    body: { isDebt: false, paymentMethod: 'CASH', items: [{ productId: p.id, qty: 999999 }], total: 1 },
  });
  check('sale: overselling -> 409 INSUFFICIENT_STOCK', r.status === 409 && r.data?.code === 'INSUFFICIENT_STOCK', show(r));

  r = await call('POST', 'record-sale-v2', {
    token,
    body: { isDebt: false, paymentMethod: 'CASH', items: [{ productId: p.id, qty: 1 }], total: 0.01 },
  });
  check('sale: stale/forged total -> 409 PRICE_CHANGED', r.status === 409 && r.data?.code === 'PRICE_CHANGED', show(r));

  r = await call('POST', 'record-sale-v2', {
    token,
    body: { isDebt: true, items: [{ productId: p.id, qty: 1 }], total: p.sellPrice },
  });
  check('sale: debt without customer -> 400 CUSTOMER_REQUIRED', r.status === 400 && r.data?.code === 'CUSTOMER_REQUIRED', show(r));

  r = await call('POST', 'record-sale-v2', {
    token,
    body: { isDebt: false, paymentMethod: 'BITCOIN', items: [{ productId: p.id, qty: 1 }], total: p.sellPrice },
  });
  check('sale: unknown payment method -> 400 INVALID_PAYMENT', r.status === 400 && r.data?.code === 'INVALID_PAYMENT', show(r));
} else {
  console.log('SKIP  sale checks (no piece-unit product with stock)');
}

r = await call('POST', 'record-sale-v2', { body: { isDebt: false, paymentMethod: 'CASH', items: [], total: 0 } });
check('sale: no token -> 401', r.status === 401, show(r));

// ---- debts ----------------------------------------------------------------
r = await call('POST', 'pay-debt-v2', { token, body: { customerName: 'zz-no-such-customer-zz', amount: 1 } });
check('pay-debt: unknown customer -> 404 CUSTOMER_NOT_FOUND', r.status === 404 && r.data?.code === 'CUSTOMER_NOT_FOUND', show(r));
r = await call('POST', 'pay-debt-v2', { token, body: { customerName: 'x', amount: -5 } });
check('pay-debt: negative amount -> 400 INVALID_AMOUNT', r.status === 400 && r.data?.code === 'INVALID_AMOUNT', show(r));
r = await call('POST', 'pay-debt-v2', { body: { customerName: 'x', amount: 1 } });
check('pay-debt: no token -> 401', r.status === 401, show(r));

// ---- session lifecycle ----------------------------------------------------
r = await call('POST', 'heartbeat-v2', { token });
check('heartbeat: valid session -> 200', r.status === 200 && r.data?.success === true, show(r));
r = await call('POST', 'logout-v2', { token });
check('logout -> 200', r.status === 200 && r.data?.success === true, show(r));
r = await call('POST', 'heartbeat-v2', { token });
check('heartbeat after logout -> 401', r.status === 401 && r.data?.code === 'INVALID_TOKEN', show(r));

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
