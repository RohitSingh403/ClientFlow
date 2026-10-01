export const ALL_PERMISSIONS = [
  'organization:update',
  'billing:manage',
  'billing:view',
  'member:invite',
  'member:view',
  'client:create',
  'client:update',
  'client:view',
  'project:create',
  'project:update',
  'project:view',
  'milestone:manage',
  'task:create',
  'task:update',
  'task:view',
  'deliverable:create',
  'deliverable:view',
  'deliverable:approve',
  'deliverable:comment',
  'invoice:create',
  'invoice:update',
  'invoice:send',
  'invoice:view',
  'invoice:pay',
  'invoice:cancel',
  'analytics:view',
  'activity:view',
];

const STAFF_PROJECT = [
  'project:view',
  'task:view',
  'task:update',
  'deliverable:view',
  'deliverable:comment',
  'invoice:view',
  'activity:view',
];

export const ROLE_PERMISSIONS = {
  OWNER: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter((permission) => permission !== 'billing:manage'),
  MANAGER: [
    'billing:view',
    'member:invite',
    'member:view',
    'client:create',
    'client:update',
    'client:view',
    'project:create',
    'project:update',
    'project:view',
    'milestone:manage',
    'task:create',
    'task:update',
    'task:view',
    'deliverable:create',
    'deliverable:view',
    'deliverable:approve',
    'deliverable:comment',
    'invoice:create',
    'invoice:update',
    'invoice:send',
    'invoice:view',
    'invoice:pay',
    'invoice:cancel',
    'analytics:view',
    'activity:view',
  ],
  EMPLOYEE: [...STAFF_PROJECT, 'deliverable:create'],
  CLIENT: [
    'project:view',
    'deliverable:view',
    'deliverable:approve',
    'deliverable:comment',
    'invoice:view',
    'activity:view',
  ],
};

export function permissionsFor(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function can(role, permission) {
  return permissionsFor(role).includes(permission);
}
