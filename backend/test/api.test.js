import os from 'os';
import path from 'path';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-clientflow';
process.env.UPLOADS_DIR = path.join(os.tmpdir(), `clientflow-${process.pid}`);

const memory = await MongoMemoryServer.create();
process.env.MONGODB_URI = memory.getUri();

const { connectDb } = await import('../src/config/db.js');
await connectDb();
const { app } = await import('../src/app.js');
const { markOverdueInvoices } = await import('../src/services/invoices.js');

function auth(session) {
  return {
    Authorization: `Bearer ${session.token}`,
    'X-Organization-Id': session.organization.id,
  };
}

async function register(name, email, organizationName) {
  const response = await request(app).post('/api/auth/register').send({
    name,
    email,
    password: 'demo1234',
    organizationName,
  });
  assert.equal(response.status, 201);
  return {
    token: response.body.token,
    organization: response.body.organization,
    user: response.body.user,
  };
}

test.after(async () => {
  await mongoose.disconnect();
  await memory.stop();
});

test('a studio cannot read another studio project', async () => {
  const northline = await register('Rohit Singh', 'iso-owner@northline.test', 'Isolation Northline');
  const harbor = await register('Meera Nair', 'iso-owner@harbor.test', 'Isolation Harbor');
  const client = await request(app)
    .post('/api/clients')
    .set(auth(northline))
    .send({ name: 'Priya Shah', company: 'ABC Pvt Ltd', email: 'priya@abc.test' });
  assert.equal(client.status, 201);
  const project = await request(app).post('/api/projects').set(auth(northline)).send({
    name: 'Website Development',
    clientId: client.body.client.id,
  });
  assert.equal(project.status, 201);

  const leaked = await request(app)
    .get(`/api/projects/${project.body.project.id}`)
    .set(auth(harbor));
  assert.equal(leaked.status, 404);

  const wrongClient = await request(app).post('/api/projects').set(auth(harbor)).send({
    name: 'Should fail',
    clientId: client.body.client.id,
  });
  assert.equal(wrongClient.status, 404);
});

test('the free plan stops the third project', async () => {
  const session = await register('Asha Rao', 'quota@studio.test', 'Quota Studio');
  const client = await request(app)
    .post('/api/clients')
    .set(auth(session))
    .send({ name: 'Asha Client', company: 'Quota Co', email: 'client@quota.test' });
  assert.equal(client.status, 201);
  for (const name of ['One', 'Two']) {
    const created = await request(app).post('/api/projects').set(auth(session)).send({
      name,
      clientId: client.body.client.id,
    });
    assert.equal(created.status, 201);
  }
  const blocked = await request(app).post('/api/projects').set(auth(session)).send({
    name: 'Three',
    clientId: client.body.client.id,
  });
  assert.equal(blocked.status, 402);
  assert.equal(blocked.body.error.code, 'QUOTA_EXCEEDED');
});

test('approval follows the version state machine', async () => {
  const session = await register('Neel Kapur', 'flow@studio.test', 'Flow Studio');
  const client = await request(app)
    .post('/api/clients')
    .set(auth(session))
    .send({ name: 'Client', company: 'Flow Client', email: 'client@flow.test' });
  const project = await request(app).post('/api/projects').set(auth(session)).send({
    name: 'Homepage',
    clientId: client.body.client.id,
  });
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');
  const uploaded = await request(app)
    .post(`/api/projects/${project.body.project.id}/deliverables`)
    .set(auth(session))
    .field('title', 'Homepage Design')
    .field('changeDescription', 'First pass')
    .attach('file', svg, { filename: 'home.svg', contentType: 'image/svg+xml' });
  assert.equal(uploaded.status, 201);
  const deliverableId = uploaded.body.deliverable.id;

  const approved = await request(app)
    .post(`/api/deliverables/${deliverableId}/decision`)
    .set(auth(session))
    .send({ action: 'approve', comment: 'Looks right.' });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.deliverable.status, 'APPROVED');

  const again = await request(app)
    .post(`/api/deliverables/${deliverableId}/decision`)
    .set(auth(session))
    .send({ action: 'approve' });
  assert.equal(again.status, 409);

  const early = await request(app)
    .post(`/api/deliverables/${deliverableId}/versions`)
    .set(auth(session))
    .field('changeDescription', 'A new round after approval')
    .attach('file', svg, { filename: 'home-2.svg', contentType: 'image/svg+xml' });
  assert.equal(early.status, 201);
  assert.equal(early.body.deliverable.versions.at(-1).version, 2);
});

test('a draft invoice cannot be marked paid, and a sent invoice can go overdue', async () => {
  const session = await register('Isha Menon', 'bills@studio.test', 'Billing Studio');
  const client = await request(app)
    .post('/api/clients')
    .set(auth(session))
    .send({ name: 'Client', company: 'Bill Co', email: 'client@bill.test' });
  const project = await request(app).post('/api/projects').set(auth(session)).send({
    name: 'Site',
    clientId: client.body.client.id,
  });
  const invoice = await request(app).post('/api/invoices').set(auth(session)).send({
    projectId: project.body.project.id,
    lines: [
      { description: 'Website Development', amount: 50000 },
      { description: 'SEO', amount: 20000 },
    ],
    taxRate: 18,
    dueDate: new Date(Date.now() - 86400000).toISOString(),
  });
  assert.equal(invoice.status, 201);
  assert.equal(invoice.body.invoice.total, 82600);

  const paidTooSoon = await request(app)
    .post(`/api/invoices/${invoice.body.invoice.id}/pay`)
    .set(auth(session))
    .send({ method: 'UPI', reference: 'nope' });
  assert.equal(paidTooSoon.status, 409);

  const sent = await request(app).post(`/api/invoices/${invoice.body.invoice.id}/send`).set(auth(session));
  assert.equal(sent.status, 200);
  assert.equal(sent.body.invoice.status, 'SENT');

  const changed = await markOverdueInvoices();
  assert.ok(changed >= 1);
  const fetched = await request(app).get(`/api/invoices/${invoice.body.invoice.id}`).set(auth(session));
  assert.equal(fetched.body.invoice.status, 'OVERDUE');
});
