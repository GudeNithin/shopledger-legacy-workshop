const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');
const reports = require('../lib/reports');

function riceOrder(coupon) {
  const items = [{
    id: 1,
    sku: 'GRN-001',
    name: 'Rice',
    hsn: '1006',
    price: 1000,
    qty: 1
  }];
  const totals = pricing.computeTotals(items, coupon || '');

  return {
    id: 42,
    date: '21/11/2026',
    customer: 'In-memory customer',
    coupon: coupon || '',
    items,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total
  };
}

test('invoice GST breakdown and total match the order pricing used at checkout', function () {
  const order = riceOrder('SAVE10');
  const billed = pricing.computeTotals(order.items, order.coupon);
  const printed = invoice.computeInvoiceFigures(order);

  assert.equal(printed.tax, billed.tax);
  assert.equal(printed.cgst, billed.cgst);
  assert.equal(printed.sgst, billed.sgst);
  assert.equal(printed.total, billed.total);
  assert.equal(printed.rows[0].gstPercent, billed.lines[0].gstPercent);
  assert.equal(printed.rows[0].lineTax, billed.lines[0].tax);
});

test('CURRENT BEHAVIOUR: order pricing applies the HSN slab to the discounted subtotal', function () {
  const order = riceOrder('SAVE10');
  const billed = pricing.computeTotals(order.items, order.coupon);

  assert.equal(billed.subtotal, 1000);
  assert.equal(billed.discount, 100);
  assert.equal(billed.tax, 45);
  assert.equal(billed.cgst, 22.5);
  assert.equal(billed.sgst, 22.5);
  assert.equal(billed.total, 945);
  assert.deepEqual(
    { gstPercent: billed.lines[0].gstPercent, taxable: billed.lines[0].taxable, tax: billed.lines[0].tax },
    { gstPercent: 5, taxable: 900, tax: 45 }
  );
});

test('invoice resolves the HSN slab used by order pricing', function () {
  const order = riceOrder('');
  const billed = pricing.computeTotals(order.items, order.coupon);
  const printed = invoice.computeInvoiceFigures(order);

  assert.equal(billed.tax, 50);
  assert.equal(billed.total, 1050);
  assert.equal(printed.rows[0].gstPercent, 5);
  assert.equal(printed.tax, 50);
  assert.equal(printed.cgst, 25);
  assert.equal(printed.sgst, 25);
  assert.equal(printed.total, 1050);
});

test('invoice uses the checkout discount and GST calculations for SAVE10', function () {
  const order = riceOrder('SAVE10');
  const billed = pricing.computeTotals(order.items, order.coupon);
  const printed = invoice.computeInvoiceFigures(order);

  assert.equal(billed.discount, 100);
  assert.equal(billed.tax, 45);
  assert.equal(billed.total, 945);
  assert.equal(printed.discount, 100);
  assert.equal(printed.tax, 45);
  assert.equal(printed.total, 945);
});

test('reconciliation reports matching totals for an in-memory billed order', function () {
  const order = riceOrder('SAVE10');
  const result = reports.getGstReconciliation({
    orders: [order],
    products: [],
    customers: [],
    settlements: []
  });

  assert.equal(result.totalChecked, 1);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.rows[0].ledgerTotal, 945);
  assert.equal(result.rows[0].invoiceTotal, 945);
  assert.equal(result.rows[0].delta, 0);
  assert.equal(result.rows[0].matched, true);
});
