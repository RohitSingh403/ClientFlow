import mongoose from 'mongoose';

const { Schema } = mongoose;

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    plan: { type: String, enum: ['FREE', 'PRO', 'BUSINESS'], default: 'FREE' },
    defaultTaxRate: { type: Number, default: 18, min: 0, max: 100 },
    invoiceSeq: { type: Number, default: 1023 },
    branding: {
      accent: { type: String, default: '' },
      logoUrl: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

const membershipSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'],
      required: true,
    },
    client: { type: Schema.Types.ObjectId, ref: 'Client', default: null },
  },
  { timestamps: true },
);
membershipSchema.index({ user: 1, organization: 1 }, { unique: true });

const clientSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '', trim: true },
  },
  { timestamps: true },
);

const projectSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'],
      default: 'PLANNING',
    },
    dueDate: { type: Date, default: null },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const milestoneSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], default: 'PENDING' },
  },
  { timestamps: true },
);

const taskSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    milestone: { type: Schema.Types.ObjectId, ref: 'Milestone', default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'],
      default: 'TODO',
    },
    assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const deliverableSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'],
      default: 'PENDING_REVIEW',
    },
  },
  { timestamps: true },
);

const versionSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    deliverable: { type: Schema.Types.ObjectId, ref: 'Deliverable', required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    version: { type: Number, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storedName: { type: String, required: true },
    changeDescription: { type: String, default: '' },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'],
      default: 'PENDING_REVIEW',
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
versionSchema.index({ deliverable: 1, version: 1 }, { unique: true });

const commentSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    deliverable: { type: Schema.Types.ObjectId, ref: 'Deliverable', required: true },
    version: { type: Schema.Types.ObjectId, ref: 'DeliverableVersion', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

const invoiceLineSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    number: { type: Number, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'DRAFT',
    },
    lines: { type: [invoiceLineSchema], required: true },
    taxRate: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    dueDate: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    paymentMethod: { type: String, default: '' },
    paymentReference: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
invoiceSchema.index({ organization: 1, number: 1 }, { unique: true });

const activitySchema = new Schema({
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
  actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: Schema.Types.ObjectId, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

const notificationSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Organization = mongoose.model('Organization', organizationSchema);
export const User = mongoose.model('User', userSchema);
export const Membership = mongoose.model('Membership', membershipSchema);
export const Client = mongoose.model('Client', clientSchema);
export const Project = mongoose.model('Project', projectSchema);
export const Milestone = mongoose.model('Milestone', milestoneSchema);
export const Task = mongoose.model('Task', taskSchema);
export const Deliverable = mongoose.model('Deliverable', deliverableSchema);
export const DeliverableVersion = mongoose.model('DeliverableVersion', versionSchema);
export const Comment = mongoose.model('Comment', commentSchema);
export const Invoice = mongoose.model('Invoice', invoiceSchema);
export const Activity = mongoose.model('Activity', activitySchema);
export const Notification = mongoose.model('Notification', notificationSchema);
