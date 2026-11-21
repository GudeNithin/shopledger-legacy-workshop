const test = require('node:test');
const assert = require('node:assert/strict');

const inventory = require('../lib/inventory');
const orders = require('../lib/orders');

test('inventory check allows selling the last sellable unit', function () {
  const products = [{ id: 7, name: 'In-memory item', stock: 1, reserved: 0 }];

  assert.deepEqual(inventory.check(products, [{ id: 7, qty: 1 }]), { ok: true });
});

test('inventory check allows selling the last unit after subtracting reserved stock', function () {
  const products = [{ id: 7, name: 'In-memory item', stock: 3, reserved: 2 }];

  assert.deepEqual(inventory.check(products, [{ id: 7, qty: 1 }]), { ok: true });
});

test('inventory check still rejects quantities above sellable stock', function () {
  const products = [{ id: 7, name: 'In-memory item', stock: 1, reserved: 0 }];

  assert.equal(inventory.check(products, [{ id: 7, qty: 2 }]).ok, false);
});

test('cancelling an order restores the physical stock deducted when it was placed', function () {
  const db = {
    products: [{ id: 7, name: 'In-memory item', stock: 2, reserved: 0 }],
    orders: [],
    nextOrderId: 1
  };
  const items = [{ id: 7, name: 'In-memory item', price: 10, qty: 1 }];

  inventory.reserve(db.products, items);
  const order = orders.add(db, {
    paymentMode: 'cash',
    items: items,
    subtotal: 10,
    discount: 0,
    tax: 0,
    total: 10
  });

  assert.equal(db.products[0].stock, 1);
  const result = orders.cancel(db, order.id, 'test cancellation');

  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'cancelled');
  assert.equal(db.products[0].stock, 2);
  assert.equal(db.products[0].reserved, 0);
});
