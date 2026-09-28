export interface Notification {
  id: number;
  userId: number;
  message: string;
  type: 'NEW_QUESTIONNAIRE' | 'NEW_TUTORIAL' | 'LOW_PERFORMANCE';
  read: boolean;
  createdAt: string;
}
