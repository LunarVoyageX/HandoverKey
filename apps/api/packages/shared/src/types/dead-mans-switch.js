"use strict";
// Dead Man's Switch Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemStatusType =
  exports.VerificationStatus =
  exports.DeliveryStatus =
  exports.NotificationMethod =
  exports.ReminderType =
  exports.HandoverProcessStatus =
  exports.HandoverStatus =
  exports.ClientType =
  exports.ActivityType =
    void 0;
// Enums
var ActivityType;
(function (ActivityType) {
  ActivityType["LOGIN"] = "login";
  ActivityType["VAULT_ACCESS"] = "vault_access";
  ActivityType["SETTINGS_CHANGE"] = "settings_change";
  ActivityType["MANUAL_CHECKIN"] = "manual_checkin";
  ActivityType["API_REQUEST"] = "api_request";
  ActivityType["SUCCESSOR_MANAGEMENT"] = "successor_management";
  ActivityType["HANDOVER_CANCELLED"] = "handover_cancelled";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
var ClientType;
(function (ClientType) {
  ClientType["WEB"] = "web";
  ClientType["MOBILE"] = "mobile";
  ClientType["CLI"] = "cli";
  ClientType["API"] = "api";
})(ClientType || (exports.ClientType = ClientType = {}));
var HandoverStatus;
(function (HandoverStatus) {
  HandoverStatus["NORMAL"] = "normal";
  HandoverStatus["REMINDER_PHASE"] = "reminder_phase";
  HandoverStatus["GRACE_PERIOD"] = "grace_period";
  HandoverStatus["HANDOVER_ACTIVE"] = "handover_active";
  HandoverStatus["PAUSED"] = "paused";
})(HandoverStatus || (exports.HandoverStatus = HandoverStatus = {}));
var HandoverProcessStatus;
(function (HandoverProcessStatus) {
  HandoverProcessStatus["GRACE_PERIOD"] = "grace_period";
  HandoverProcessStatus["AWAITING_SUCCESSORS"] = "awaiting_successors";
  HandoverProcessStatus["VERIFICATION_PENDING"] = "verification_pending";
  HandoverProcessStatus["READY_FOR_TRANSFER"] = "ready_for_transfer";
  HandoverProcessStatus["COMPLETED"] = "completed";
  HandoverProcessStatus["CANCELLED"] = "cancelled";
})(
  HandoverProcessStatus ||
    (exports.HandoverProcessStatus = HandoverProcessStatus = {}),
);
var ReminderType;
(function (ReminderType) {
  ReminderType["FIRST_REMINDER"] = "first_reminder";
  ReminderType["SECOND_REMINDER"] = "second_reminder";
  ReminderType["FINAL_WARNING"] = "final_warning";
  ReminderType["GRACE_PERIOD"] = "grace_period";
  ReminderType["HANDOVER_INITIATED"] = "handover_initiated";
  ReminderType["SUCCESSOR_NOTIFICATION"] = "successor_notification";
})(ReminderType || (exports.ReminderType = ReminderType = {}));
var NotificationMethod;
(function (NotificationMethod) {
  NotificationMethod["EMAIL"] = "email";
  NotificationMethod["SMS"] = "sms";
  NotificationMethod["PUSH"] = "push";
})(
  NotificationMethod || (exports.NotificationMethod = NotificationMethod = {}),
);
var DeliveryStatus;
(function (DeliveryStatus) {
  DeliveryStatus["PENDING"] = "pending";
  DeliveryStatus["SENT"] = "sent";
  DeliveryStatus["DELIVERED"] = "delivered";
  DeliveryStatus["FAILED"] = "failed";
  DeliveryStatus["BOUNCED"] = "bounced";
})(DeliveryStatus || (exports.DeliveryStatus = DeliveryStatus = {}));
var VerificationStatus;
(function (VerificationStatus) {
  VerificationStatus["PENDING"] = "pending";
  VerificationStatus["VERIFIED"] = "verified";
  VerificationStatus["FAILED"] = "failed";
  VerificationStatus["EXPIRED"] = "expired";
})(
  VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}),
);
var SystemStatusType;
(function (SystemStatusType) {
  SystemStatusType["OPERATIONAL"] = "operational";
  SystemStatusType["MAINTENANCE"] = "maintenance";
  SystemStatusType["DEGRADED"] = "degraded";
  SystemStatusType["OUTAGE"] = "outage";
})(SystemStatusType || (exports.SystemStatusType = SystemStatusType = {}));
//# sourceMappingURL=dead-mans-switch.js.map
