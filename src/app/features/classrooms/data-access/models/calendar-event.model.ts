export type CalendarEventType = 'QUIZ' | 'ASSIGNMENT' | 'EVENT';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  courseId: number;
  type: CalendarEventType;
}
