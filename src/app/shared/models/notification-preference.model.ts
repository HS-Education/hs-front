export interface NotificationPreference {
  userId: number;
  notifyNewQuestionnaire: boolean;
  notifyNewTutorial: boolean;
  notifyLowPerformance: boolean;
}

export interface UpdateNotificationPreference {
  notifyNewQuestionnaire: boolean;
  notifyNewTutorial: boolean;
  notifyLowPerformance: boolean;
}
