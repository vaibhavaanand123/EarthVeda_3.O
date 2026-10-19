import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PREVIEW_STORE } from '../src/content/previewStore.js';
import { refreshCopy } from '../src/content/refreshCopy.js';
import {
  exampleAddress,
  validNewsletter,
  validPreviewAddress,
} from '../src/lib/previewCheckout.js';
import { EMPTY_CART, cartReducer, isCartState, summariseCart } from '../src/lib/cart.js';

test('preview Plant Protein costs 1199 cents and foxnut single packs cost 299 cents', () => {
  assert.equal(PREVIEW_STORE.products.length, 10);
  assert.deepEqual(
    PREVIEW_STORE.products.filter((p) => p.range === 'protein').map((p) => p.price),
    [1199, 1199, 1199],
  );
  const foxnuts = PREVIEW_STORE.products.filter((p) => p.range === 'foxnuts');
  assert.equal(foxnuts.length, 7);
  assert.ok(foxnuts.every((p) => p.price === 299));
  assert.deepEqual(
    PREVIEW_STORE.bundles.map((b) => b.price),
    [2392, 4784],
  );
  assert.equal(PREVIEW_STORE.shipping.DE.fee, 499);
  assert.equal(PREVIEW_STORE.shipping.GB.fee, 1199);
});

test('each Plant Protein flavour uses its 1199-cent price in DE and GB baskets', () => {
  const products = new Map(PREVIEW_STORE.products.map((p) => [p.id, p]));
  const ctx = {
    resolveProduct: (id) => products.get(id),
    resolveBundle: (id) => PREVIEW_STORE.bundles.find((b) => b.id === id),
    shippingRates: PREVIEW_STORE.shipping,
    lang: 'en',
  };
  for (const id of ['protein-mango', 'protein-chocolate', 'protein-royal-cream']) {
    const cart = cartReducer(EMPTY_CART, { type: 'add', id, amount: 1 });
    const germany = summariseCart(cart, ctx);
    assert.equal(germany.subtotal, 1199, id);
    assert.equal(germany.total, 1698, id);
    assert.equal(summariseCart({ ...cart, country: 'GB' }, ctx).total, 2398, id);
    const two = cartReducer(cart, { type: 'set', id, quantity: 2 });
    assert.equal(summariseCart(two, ctx).total, 2897, id);
  }
});

test('preview basket calculates 8 and 16 packs with exact German and UK delivery', () => {
  const products = new Map(PREVIEW_STORE.products.map((p) => [p.id, p]));
  const picks = ['cream-onion', 'peri-peri', 'four-cheese', 'butter-chicken'].map((productId) => ({
    productId,
    quantity: 2,
  }));
  const ctx = {
    resolveProduct: (id) => products.get(id),
    resolveBundle: (id) => PREVIEW_STORE.bundles.find((b) => b.id === id),
    shippingRates: PREVIEW_STORE.shipping,
    lang: 'en',
  };
  const state = cartReducer(EMPTY_CART, { type: 'addBox', bundleId: 'box-8', picks });
  assert.equal(summariseCart(state, ctx).total, 2891);
  assert.equal(summariseCart({ ...state, country: 'GB' }, ctx).total, 3591);
  const large = cartReducer(EMPTY_CART, {
    type: 'addBox',
    bundleId: 'box-16',
    picks: picks.map((p) => ({ ...p, quantity: 4 })),
  });
  assert.equal(summariseCart(large, ctx).total, 5283);
  assert.equal(summariseCart({ ...large, country: 'GB' }, ctx).total, 5983);
});

test('demo checkout validates country-specific postcodes and malformed addresses', () => {
  assert.equal(validPreviewAddress(exampleAddress('DE'), 'DE'), true);
  assert.equal(validPreviewAddress(exampleAddress('GB'), 'GB'), true);
  for (const [form, country] of [
    [exampleAddress('GB'), 'DE'],
    [exampleAddress('DE'), 'GB'],
    [exampleAddress('DE'), 'XX'],
    [null, 'DE'],
    [{ ...exampleAddress('DE'), email: 'bad' }, 'DE'],
    [{ ...exampleAddress('DE'), street: '' }, 'DE'],
    [{ ...exampleAddress('DE'), firstName: 42 }, 'DE'],
  ])
    assert.equal(validPreviewAddress(form, country), false);
});

test('newsletter requires explicit consent and rejects invalid or excessive addresses', () => {
  assert.equal(validNewsletter(' hello@example.com ', true), true);
  assert.equal(validNewsletter('hello@example.com', false), false);
  assert.equal(validNewsletter('not-an-email', true), false);
  assert.equal(validNewsletter('a'.repeat(250) + '@example.com', true), false);
});

test('cart input validation rejects malformed data and quantities stay capped', () => {
  assert.equal(Boolean(isCartState({ items: [], boxes: [], country: 'DE' })), false);
  assert.equal(Boolean(isCartState({ items: {}, boxes: [null], country: 'DE' })), false);
  assert.equal(Boolean(isCartState(null)), false);
  assert.equal(Boolean(isCartState({ items: { a: Infinity }, boxes: [], country: 'DE' })), false);
  assert.equal(Boolean(isCartState({ items: { a: 1 }, boxes: [], country: 'XX' })), false);
  const cart = cartReducer(EMPTY_CART, { type: 'add', id: 'peri-peri', amount: 1 });
  assert.equal(
    cartReducer(cart, { type: 'set', id: 'peri-peri', quantity: 1000 }).items['peri-peri'],
    20,
  );
  assert.deepEqual(cartReducer(cart, { type: 'country', country: 'XX' }), cart);
  assert.deepEqual(cartReducer(cart, { type: 'add', id: 'peri-peri', amount: NaN }), cart);
});

function keys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}
test('redesign copy has matching German and English keys without forbidden dashes', () => {
  assert.deepEqual(keys(refreshCopy.de).sort(), keys(refreshCopy.en).sort());
  assert.equal(/[—–]/.test(JSON.stringify(refreshCopy)), false);
});
