export interface NotificationPreference {
  userId: number;
  notifyQuizResults: boolean;
  notifyRelevantActivity: boolean;
  notifyNewDocument: boolean;
  notifyUnresolvedQuizzes: boolean;
}

export interface UpdateNotificationPreference {
  notifyQuizResults: boolean;
  notifyRelevantActivity: boolean;
  notifyNewDocument: boolean;
  notifyUnresolvedQuizzes: boolean;
}
