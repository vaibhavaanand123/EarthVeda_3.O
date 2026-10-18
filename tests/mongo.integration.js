// Requires a real replica set. CI launches an isolated mongod; TEST_MONGODB_URI
// can point to a disposable local replica set. Never supply production access.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { openDatabase } from '../server/db/database.js';
import { setupDatabase } from '../server/db/setup.js';
import { createApp } from '../server/app.js';
import { loadConfig } from '../server/config.js';
import { silentLogger } from '../server/lib/logger.js';
import { totp } from '../server/lib/mfa.js';
import { createOutboxRepository } from '../server/db/outboxRepository.js';
let repl,
  db,
  built,
  server,
  base,
  dir,
  cookie = '';
const owner = { email: 'owner@example.test', password: 'CorrectHorse42!' };
const customer = {
  email: 'anna@example.de',
  firstName: 'Anna',
  lastName: 'Schmidt',
  phone: '015123456789',
  street: 'Hauptstraße 1',
  postalCode: '10115',
  city: 'Berlin',
};
const basket = (extra) => ({
  lang: 'de',
  country: 'DE',
  items: [{ productId: 'peri-peri', quantity: 2 }],
  boxes: [],
  customer,
  acceptTerms: true,
  ...extra,
});
const key = () => crypto.randomUUID();
async function call(method, url, body, headers = {}) {
  const r = await fetch(base + url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const c = r.headers.get('set-cookie');
  if (c) cookie = c.split(';')[0];
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: r.status, body: json, text, headers: r.headers };
}
const admin = (method, url, body) => call(method, '/api/admin' + url, body, { 'X-EV-Admin': '1' });
const checkout = (body) =>
  call('POST', '/api/checkout', body || basket(), { 'Idempotency-Key': key() });
const sessionFrom = (r) => new URL(r.body.paymentUrl).searchParams.get('session');
async function paidOrder() {
  const r = await checkout();
  assert.equal(r.status, 201, r.text);
  await call('POST', '/api/dev/mock-payment', { sessionId: sessionFrom(r), outcome: 'success' });
  return built.services.orderService.get(r.body.orderNumber);
}
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'earthveda-integration-'));
  if (!process.env.TEST_MONGODB_URI)
    repl = await MongoMemoryReplSet.create({
      binary: { version: '8.0.16' },
      replSet: { count: 1 },
    });
  db = await openDatabase(
    process.env.TEST_MONGODB_URI || repl.getUri(),
    `ev_test_${crypto.randomBytes(8).toString('hex')}`,
  );
  await setupDatabase(db, { seed: true, demoStock: 100 });
  const config = loadConfig({
    NODE_ENV: 'test',
    UPLOAD_DIR: dir,
    STATIC_DIR: path.join(dir, 'no-dist'),
    PUBLIC_SITE_URL: 'http://localhost:9999',
    APP_SECRET: 'test-secret-'.repeat(4),
    PAYMENT_ACCOUNT_MODE: 'per_market',
    CHECKOUT_RATE_LIMIT: 10000,
  });
  built = await createApp({
    config,
    db,
    logger: silentLogger,
    channels: { email: { configured: true, send: async () => {} } },
  });
  await built.services.authService.bootstrap(owner);
  server = await new Promise((resolve) => {
    const s = built.app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (db) {
    await db.database.dropDatabase();
    await db.close();
  }
  if (repl) await repl.stop();
  if (dir) await fs.rm(dir, { recursive: true, force: true });
});

test('schema rejects inventory below its reserved amount', async () => {
  await assert.rejects(
    db.collection('inventory').insertOne({
      _id: 'invalid',
      productId: 'x',
      country: 'DE',
      onHand: 1,
      reserved: 2,
      version: 1,
    }),
    (e) => e.code === 121,
  );
});
test('checkout and replay use one reservation and one payment session', async () => {
  const idem = key(),
    body = basket();
  const a = await call('POST', '/api/checkout', body, { 'Idempotency-Key': idem });
  assert.equal(a.status, 201, a.text);
  const b = await call('POST', '/api/checkout', body, { 'Idempotency-Key': idem });
  assert.deepEqual(b.body, a.body);
  assert.equal(await db.collection('orders').countDocuments({ idempotencyKey: idem }), 1);
  const mismatch = await call(
    'POST',
    '/api/checkout',
    { ...body, whatsappOptIn: true },
    { 'Idempotency-Key': idem },
  );
  assert.equal(mismatch.status, 409);
  const order = await built.services.orderService.get(a.body.orderNumber);
  assert.equal(order.payment.profileId, 'DE');
  assert.equal(order.currency, 'EUR');
});
test('competing buyers cannot reserve the last unit twice', async () => {
  await db
    .collection('inventory')
    .updateOne({ _id: 'DE:four-cheese' }, { $set: { onHand: 1, reserved: 0 } });
  const body = basket({ items: [{ productId: 'four-cheese', quantity: 1 }] });
  const results = await Promise.all([checkout(body), checkout(body)]);
  assert.equal(results.filter((r) => r.status === 201).length, 1, JSON.stringify(results));
  const inv = await db.collection('inventory').findOne({ _id: 'DE:four-cheese' });
  assert.equal(inv.reserved, 1);
  assert.equal(inv.onHand, 1);
});
test('payment atomically consumes stock and queues one confirmation despite replay', async () => {
  const before = await db.collection('inventory').findOne({ _id: 'DE:peri-peri' });
  const o = await paidOrder();
  const after = await db.collection('inventory').findOne({ _id: 'DE:peri-peri' });
  assert.equal(after.onHand, before.onHand - 2);
  const count = await db
    .collection('notifications')
    .countDocuments({ template: 'order_confirmation', recipient: customer.email });
  await call('POST', '/api/dev/mock-payment', {
    sessionId: o.payment.sessionId,
    outcome: 'success',
  });
  assert.equal(
    await db
      .collection('notifications')
      .countDocuments({ template: 'order_confirmation', recipient: customer.email }),
    count,
  );
  assert.equal((await built.services.orderService.get(o.orderNumber)).status, 'paid');
});
test('wrong market webhook cannot pay a German order', async () => {
  const a = await checkout();
  const o = await built.services.orderService.get(a.body.orderNumber);
  await assert.rejects(
    built.services.orderService.handleWebhook(
      Buffer.from(JSON.stringify({ sessionId: o.payment.sessionId, outcome: 'success' })),
      {},
      'GB',
    ),
  );
  assert.equal((await built.services.orderService.get(o.orderNumber)).status, 'pending_payment');
});
test('wrong currency is held for review and does not trigger fulfilment', async () => {
  const a = await checkout(),
    o = await built.services.orderService.get(a.body.orderNumber);
  await db
    .collection('mockSessions')
    .updateOne({ id: o.payment.sessionId }, { $set: { currency: 'GBP' } });
  await call('POST', '/api/dev/mock-payment', {
    sessionId: o.payment.sessionId,
    outcome: 'success',
  });
  assert.equal((await built.services.orderService.get(o.orderNumber)).status, 'review_required');
  assert.equal(
    await db
      .collection('notifications')
      .countDocuments({ dedupeKey: `paid:${o.orderNumber}:email:${customer.email}` }),
    0,
  );
});
test('failed checkout releases reserved stock', async () => {
  const a = await checkout(),
    o = await built.services.orderService.get(a.body.orderNumber),
    before = await db.collection('inventory').findOne({ _id: 'DE:peri-peri' });
  await call('POST', '/api/dev/mock-payment', { sessionId: o.payment.sessionId, outcome: 'fail' });
  const after = await db.collection('inventory').findOne({ _id: 'DE:peri-peri' });
  assert.equal(after.reserved, before.reserved - 2);
  assert.equal(after.onHand, before.onHand);
});
test('refund double-click queues one job and worker records confirmed money', async () => {
  const o = await paidOrder();
  await built.services.orderService.refund(o.orderNumber, {}, owner.email);
  await built.services.orderService.refund(o.orderNumber, {}, owner.email);
  assert.equal(await db.collection('jobs').countDocuments({ recipient: o.orderNumber }), 1);
  await built.jobDispatcher.tick();
  const result = await built.services.orderService.get(o.orderNumber);
  assert.equal(result.status, 'refunded');
  assert.equal(result.amountRefunded, o.amountPaid);
  assert.equal(result.refundReserved, 0);
});
test('lease recovery prevents a stale worker marking a reclaimed job sent', async () => {
  const q = createOutboxRepository(db, 'testOutbox');
  await q.enqueue({
    channel: 'email',
    template: 'x',
    recipient: 'x',
    payload: {},
    now: new Date().toISOString(),
  });
  const a = await q.claimNext();
  assert.equal(await q.claimNext(), null);
  await db
    .collection('testOutbox')
    .updateOne({ _id: a.id }, { $set: { leaseUntil: '2000-01-01T00:00:00.000Z' } });
  const b = await q.claimNext();
  assert.notEqual(a.leaseToken, b.leaseToken);
  assert.equal((await q.markSent(a.id, a.leaseToken, new Date().toISOString())).modifiedCount, 0);
  assert.equal((await q.markSent(b.id, b.leaseToken, new Date().toISOString())).modifiedCount, 1);
});
test('owner login excludes secrets, blocks CSRF and permits catalogue changes', async () => {
  assert.equal((await admin('GET', '/products')).status, 401);
  const login = await admin('POST', '/login', owner);
  assert.equal(login.status, 200, login.text);
  assert.equal(login.body.user.passwordHash, undefined);
  assert.equal(login.body.user.mfaSecret, undefined);
  assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
  assert.equal((await call('POST', '/api/admin/products/peri-peri/archive')).status, 403);
  assert.equal(
    (
      await call('POST', '/api/admin/products/peri-peri/archive', undefined, {
        'X-EV-Admin': '1',
        Origin: 'https://evil.example',
      })
    ).status,
    403,
  );
  const p = (await admin('GET', '/products/cream-onion')).body.product;
  const r = await admin('POST', '/products', { ...p, slug: 'new-mint', sku: '', active: false });
  assert.equal(r.status, 201, r.text);
  assert.match(r.body.product.sku, /^EV-FNX-/);
  const updated = await admin('PUT', `/products/${r.body.product.id}`, {
    ...r.body.product,
    price: 349,
  });
  assert.equal(updated.status, 200, updated.text);
  const stale = await admin('PUT', `/products/${r.body.product.id}`, r.body.product);
  assert.equal(stale.status, 409);
});
test('stock adjustments are idempotent and cannot consume reservations', async () => {
  const adjustment = {
    productId: 'cream-onion',
    country: 'DE',
    delta: 3,
    reason: 'Test receipt',
    operationId: key(),
  };
  const before = await db.collection('inventory').findOne({ _id: 'DE:cream-onion' });
  assert.equal((await admin('POST', '/inventory/adjust', adjustment)).status, 200);
  await admin('POST', '/inventory/adjust', adjustment);
  assert.equal(
    (await db.collection('inventory').findOne({ _id: 'DE:cream-onion' })).onHand,
    before.onHand + 3,
  );
  assert.equal(
    (
      await admin('POST', '/inventory/adjust', {
        ...adjustment,
        operationId: key(),
        delta: -100000,
      })
    ).status,
    409,
  );
});
test('newsletter record and confirmation outbox commit together', async () => {
  const r = await call('POST', '/api/newsletter/subscribe', {
    email: 'reader@example.com',
    lang: 'en',
  });
  assert.equal(r.status, 202, r.text);
  const message = await db
    .collection('notifications')
    .findOne({ template: 'newsletter_confirm', recipient: 'reader@example.com' });
  const token = new URL(message.payload.confirmUrl).searchParams.get('token');
  assert.equal((await call('POST', '/api/newsletter/confirm', { token })).status, 200);
  assert.equal(
    (await db.collection('subscribers').findOne({ email: 'reader@example.com' })).status,
    'confirmed',
  );
  await call('POST', '/api/newsletter/unsubscribe', { token });
  assert.equal(
    (await db.collection('subscribers').findOne({ email: 'reader@example.com' })).status,
    'unsubscribed',
  );
});
test('MFA enrollment revokes sessions and rejects reuse of a consumed code', async () => {
  const setup = await admin('POST', '/me/mfa/setup', { password: owner.password });
  assert.equal(setup.status, 200, setup.text);
  const otp = totp(setup.body.secret, Math.floor(Date.now() / 30000));
  assert.equal((await admin('POST', '/me/mfa/confirm', { otp })).status, 200);
  assert.equal((await admin('GET', '/products')).status, 401);
  assert.equal((await admin('POST', '/login', { ...owner, otp })).status, 401);
  const next = totp(setup.body.secret, Math.floor(Date.now() / 30000) + 1);
  const login = await admin('POST', '/login', { ...owner, otp: next });
  assert.equal(login.status, 200, login.text);
  assert.equal(login.body.user.mfaSecret, undefined);
});
