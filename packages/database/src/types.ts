import { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

// User table types
export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  salt: Buffer;
  email_verified: ColumnType<boolean, boolean | undefined, boolean>;
  two_factor_enabled: ColumnType<boolean, boolean | undefined, boolean>;
  two_factor_secret: string | null;
  last_login: ColumnType<Date | null, Date | string | null, Date | string | null>;
  failed_login_attempts: ColumnType<number, number | undefined, number>;
  locked_until: ColumnType<Date | null, Date | string | null, Date | string | null>;
  inactivity_threshold_days: ColumnType<number, number | undefined, number>;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
  deleted_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

// Session table types
export interface SessionsTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: ColumnType<Date, Date | string, Date | string>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
  last_activity: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type Session = Selectable<SessionsTable>;
export type NewSession = Insertable<SessionsTable>;
export type SessionUpdate = Updateable<SessionsTable>;

// Vault entries table types
export interface VaultEntriesTable {
  id: Generated<string>;
  user_id: string;
  encrypted_data: Buffer;
  iv: Buffer;
  salt: Buffer;
  algorithm: ColumnType<string, string | undefined, string>;
  category: string | null;
  tags: string[] | null;
  version: ColumnType<number, number | undefined, number>;
  size_bytes: number;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
  deleted_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
}

export type VaultEntry = Selectable<VaultEntriesTable>;
export type NewVaultEntry = Insertable<VaultEntriesTable>;
export type VaultEntryUpdate = Updateable<VaultEntriesTable>;

// Activity logs table types
export interface ActivityLogsTable {
  id: Generated<string>;
  user_id: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  success: ColumnType<boolean, boolean | undefined, boolean>;
  metadata: Record<string, unknown> | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type ActivityLog = Selectable<ActivityLogsTable>;
export type NewActivityLog = Insertable<ActivityLogsTable>;

// Successors table types
export interface SuccessorsTable {
  id: Generated<string>;
  user_id: string;
  email: string;
  name: string | null;
  verification_token: string | null;
  verified: ColumnType<boolean, boolean | undefined, boolean>;
  handover_delay_days: ColumnType<number, number | undefined, number>;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type Successor = Selectable<SuccessorsTable>;
export type NewSuccessor = Insertable<SuccessorsTable>;
export type SuccessorUpdate = Updateable<SuccessorsTable>;

// Handover events table types
export interface HandoverEventsTable {
  id: Generated<string>;
  user_id: string;
  event_type: string;
  status: ColumnType<string, string | undefined, string>;
  triggered_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
  completed_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
  metadata: Record<string, unknown> | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type HandoverEvent = Selectable<HandoverEventsTable>;
export type NewHandoverEvent = Insertable<HandoverEventsTable>;
export type HandoverEventUpdate = Updateable<HandoverEventsTable>;

// Activity records table types (for dead man's switch)
export interface ActivityRecordsTable {
  id: Generated<string>;
  user_id: string;
  activity_type: string;
  client_type: ColumnType<string, string | undefined, string>;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  signature: string;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type ActivityRecord = Selectable<ActivityRecordsTable>;
export type NewActivityRecord = Insertable<ActivityRecordsTable>;

// Inactivity settings table types
export interface InactivitySettingsTable {
  user_id: string;
  threshold_days: ColumnType<number, number | undefined, number>;
  notification_methods: string[];
  emergency_contacts: Record<string, unknown> | null;
  is_paused: ColumnType<boolean, boolean | undefined, boolean>;
  pause_reason: string | null;
  paused_until: ColumnType<Date | null, Date | string | null, Date | string | null>;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type InactivitySettings = Selectable<InactivitySettingsTable>;
export type NewInactivitySettings = Insertable<InactivitySettingsTable>;
export type InactivitySettingsUpdate = Updateable<InactivitySettingsTable>;

// Handover processes table types
export interface HandoverProcessesTable {
  id: Generated<string>;
  user_id: string;
  status: ColumnType<string, string | undefined, string>;
  initiated_at: ColumnType<Date, Date | string | undefined, Date | string>;
  grace_period_ends: ColumnType<Date, Date | string, Date | string>;
  completed_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
  cancelled_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
  cancellation_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
  updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type HandoverProcess = Selectable<HandoverProcessesTable>;
export type NewHandoverProcess = Insertable<HandoverProcessesTable>;
export type HandoverProcessUpdate = Updateable<HandoverProcessesTable>;

// Check-in tokens table types
export interface CheckinTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: ColumnType<Date, Date | string, Date | string>;
  used_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type CheckinToken = Selectable<CheckinTokensTable>;
export type NewCheckinToken = Insertable<CheckinTokensTable>;
export type CheckinTokenUpdate = Updateable<CheckinTokensTable>;

// Notification deliveries table types
export interface NotificationDeliveriesTable {
  id: Generated<string>;
  user_id: string;
  handover_process_id: string | null;
  notification_type: string;
  method: string;
  recipient: string;
  status: ColumnType<string, string | undefined, string>;
  delivered_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
  retry_count: ColumnType<number, number | undefined, number>;
  error_message: string | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type NotificationDelivery = Selectable<NotificationDeliveriesTable>;
export type NewNotificationDelivery = Insertable<NotificationDeliveriesTable>;
export type NotificationDeliveryUpdate = Updateable<NotificationDeliveriesTable>;

// System status table types
export interface SystemStatusTable {
  id: Generated<string>;
  status: ColumnType<string, string | undefined, string>;
  downtime_start: ColumnType<Date | null, Date | string | null, Date | string | null>;
  downtime_end: ColumnType<Date | null, Date | string | null, Date | string | null>;
  reason: string | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type SystemStatus = Selectable<SystemStatusTable>;
export type NewSystemStatus = Insertable<SystemStatusTable>;
export type SystemStatusUpdate = Updateable<SystemStatusTable>;

// Successor notifications table types
export interface SuccessorNotificationsTable {
  id: Generated<string>;
  handover_process_id: string;
  successor_id: string;
  notified_at: ColumnType<Date, Date | string | undefined, Date | string>;
  verification_status: ColumnType<string, string | undefined, string>;
  verified_at: ColumnType<Date | null, Date | string | null, Date | string | null>;
  response_deadline: ColumnType<Date, Date | string, Date | string>;
  verification_token: string | null;
  created_at: ColumnType<Date, Date | string | undefined, Date | string>;
}

export type SuccessorNotification = Selectable<SuccessorNotificationsTable>;
export type NewSuccessorNotification = Insertable<SuccessorNotificationsTable>;
export type SuccessorNotificationUpdate = Updateable<SuccessorNotificationsTable>;

// Database schema
export interface Database {
  users: UsersTable;
  sessions: SessionsTable;
  vault_entries: VaultEntriesTable;
  activity_logs: ActivityLogsTable;
  activity_records: ActivityRecordsTable;
  inactivity_settings: InactivitySettingsTable;
  handover_processes: HandoverProcessesTable;
  successors: SuccessorsTable;
  handover_events: HandoverEventsTable;
  checkin_tokens: CheckinTokensTable;
  notification_deliveries: NotificationDeliveriesTable;
  system_status: SystemStatusTable;
  successor_notifications: SuccessorNotificationsTable;
}
