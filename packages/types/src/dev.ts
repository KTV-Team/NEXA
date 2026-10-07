import type { ID } from './common';
import type { SystemRole, TeamRole } from './database';

export interface DevDemoData {
  database: 'connected';
  users: Array<{ id: ID; name: string; systemRole: SystemRole }>;
  teams: Array<{
    id: ID;
    name: string;
    members: Array<{ userId: ID; role: TeamRole }>;
  }>;
  counts: { todoItems: number; events: number; notifications: number };
}
