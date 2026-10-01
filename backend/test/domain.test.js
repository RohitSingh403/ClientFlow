import test from 'node:test';
import assert from 'node:assert/strict';
import { can, permissionsFor } from '../src/domain/permissions.js';
import { withinLimit } from '../src/domain/entitlements.js';
import { canReviewDeliverable, canTransitionInvoice, canUploadNextVersion, priceInvoice } from '../src/domain/workflow.js';

test('invoice math matches a GST bill', () => {
  const priced = priceInvoice(
    [
      { description: 'Website Development', amount: 50000 },
      { description: 'SEO', amount: 20000 },
    ],
    18,
  );
  assert.equal(priced.ok, true);
  assert.equal(priced.subtotal, 70000);
  assert.equal(priced.tax, 12600);
  assert.equal(priced.total, 82600);
});

test('plan quota allows 18 of 20 and rejects 20 of 20', () => {
  assert.equal(withinLimit(18, 20).ok, true);
  assert.deepEqual(withinLimit(20, 20), { ok: false, used: 20, limit: 20 });
  assert.equal(withinLimit(100, Infinity).ok, true);
});

test('permissions follow the role, not a single admin flag', () => {
  assert.equal(can('CLIENT', 'deliverable:approve'), true);
  assert.equal(can('CLIENT', 'project:create'), false);
  assert.equal(can('EMPLOYEE', 'invoice:create'), false);
  assert.equal(can('EMPLOYEE', 'task:update'), true);
  assert.equal(can('MANAGER', 'invoice:create'), true);
  assert.equal(can('ADMIN', 'billing:manage'), false);
  assert.equal(can('OWNER', 'billing:manage'), true);
  assert.equal(permissionsFor('CLIENT').includes('deliverable:approve'), true);
});

test('deliverable review is a small state machine', () => {
  assert.equal(canReviewDeliverable('PENDING_REVIEW'), true);
  assert.equal(canReviewDeliverable('APPROVED'), false);
  assert.equal(canUploadNextVersion('CHANGES_REQUESTED'), true);
  assert.equal(canUploadNextVersion('PENDING_REVIEW'), false);
  assert.equal(canUploadNextVersion('APPROVED'), true);
});

test('invoice transitions reject illegal jumps', () => {
  assert.equal(canTransitionInvoice('DRAFT', 'PAID'), false);
  assert.equal(canTransitionInvoice('DRAFT', 'SENT'), true);
  assert.equal(canTransitionInvoice('SENT', 'OVERDUE'), true);
  assert.equal(canTransitionInvoice('PAID', 'CANCELLED'), false);
  assert.equal(canTransitionInvoice('OVERDUE', 'PAID'), true);
});
