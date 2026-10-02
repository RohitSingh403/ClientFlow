import assert from "node:assert/strict";
import { test } from "node:test";
import { fitsPlan, hasRoom } from "../src/lib/entitlements.ts";
import { invoiceTotals, rupeesToPaise } from "../src/lib/money.ts";
import { can } from "../src/lib/permissions.ts";
import {
  canTransitionDeliverable,
  canTransitionInvoice,
  canUploadNextVersion,
} from "../src/lib/workflow.ts";

test("website plus SEO at 18% GST is ₹82,600", () => {
  const totals = invoiceTotals([rupeesToPaise("50000")!, rupeesToPaise("20000")!], 18);
  assert.equal(totals.subtotal, 7_000_000);
  assert.equal(totals.tax, 1_260_000);
  assert.equal(totals.total, 8_260_000);
});

test("a plan at its project limit refuses the next create and still fits", () => {
  assert.equal(hasRoom(2, 2), false);
  assert.equal(hasRoom(1, 2), true);
  assert.equal(fitsPlan(2, 2), true);
  assert.equal(fitsPlan(3, 2), false);
});

test("admin cannot change the plan and a client can approve", () => {
  assert.equal(can("OWNER", "billing:manage"), true);
  assert.equal(can("ADMIN", "billing:manage"), false);
  assert.equal(can("ADMIN", "jobs:run"), true);
  assert.equal(can("MANAGER", "jobs:run"), false);
  assert.equal(can("CLIENT", "deliverable:approve"), true);
  assert.equal(can("OWNER", "deliverable:approve"), false);
  assert.equal(can("MANAGER", "deliverable:approve"), false);
  assert.equal(can("EMPLOYEE", "deliverable:approve"), false);
});

test("deliverable and invoice moves follow the state machine", () => {
  assert.equal(canTransitionDeliverable("PENDING", "APPROVED"), true);
  assert.equal(canTransitionDeliverable("CHANGES_REQUESTED", "APPROVED"), false);
  assert.equal(canUploadNextVersion("CHANGES_REQUESTED"), true);
  assert.equal(canUploadNextVersion("APPROVED"), false);
  assert.equal(canUploadNextVersion("PENDING"), false);
  assert.equal(canTransitionInvoice("DRAFT", "PAID"), false);
  assert.equal(canTransitionInvoice("SENT", "OVERDUE"), true);
  assert.equal(canTransitionInvoice("PAID", "CANCELLED"), false);
});
