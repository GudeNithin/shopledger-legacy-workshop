const test = require('node:test');
const assert = require('node:assert/strict');

const orders = require('../lib/orders');
const ledger = require('../lib/ledger');

function orderDb(orderRows) {
  return { orders: orderRows };
}

function settlementDb(customer) {
  return {
    customers: [customer],
    settlements: [],
    nextSettlementId: 501
  };
}

test('order history sorts DD/MM/YYYY dates by calendar date, newest first', function () {
  const db = orderDb([
    { id: 1002, date: '15/12/2023' },
    { id: 1001, date: '02/01/2024' }
  ]);

  const result = orders.list(db, {});

  assert.deepEqual(result.map(function (order) { return order.id; }), [1001, 1002]);
});

test('from date filter includes only orders on or after the calendar date', function () {
  const db = orderDb([
    { id: 1001, date: '15/12/2023' },
    { id: 1002, date: '02/01/2024' },
    { id: 1003, date: '15/01/2024' }
  ]);

  const result = orders.list(db, { from: '2024-01-10' });

  assert.deepEqual(result.map(function (order) { return order.id; }), [1003]);
});

test('to date filter includes only orders on or before the calendar date', function () {
  const db = orderDb([
    { id: 1001, date: '15/12/2023' },
    { id: 1002, date: '02/01/2024' },
    { id: 1003, date: '15/01/2024' }
  ]);

  const result = orders.list(db, { to: '2024-01-10' });

  assert.deepEqual(result.map(function (order) { return order.id; }), [1002, 1001]);
});

test('settlement amount submitted as a string updates the customer balance arithmetically', function () {
  const db = settlementDb({
    id: 1,
    name: 'In-memory customer',
    openingBalance: 0,
    totalBilled: 100,
    totalSettled: 20
  });

  const result = ledger.recordSettlement(db, 1, '50', 'upi', 'test payment');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 70);
  assert.equal(result.customer.balance, 30);
  assert.equal(result.settlement.amount, 50);
  assert.equal(db.settlements.length, 1);
});

test('numeric settlement amount is added arithmetically', function () {
  const db = settlementDb({
    id: 1,
    name: 'In-memory customer',
    openingBalance: 0,
    totalBilled: 100,
    totalSettled: 20
  });

  const result = ledger.recordSettlement(db, 1, 50, 'cash', 'test payment');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 70);
  assert.equal(result.customer.balance, 30);
});

