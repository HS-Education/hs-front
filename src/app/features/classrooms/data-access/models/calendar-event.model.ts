export type CalendarEventType = 'QUIZ' | 'ASSIGNMENT' | 'EVENT';

export interface CalendarEvent {
  id: string;
  /** ID real del cuestionario usado para construir la URL de detalle. */
  questionnaireId?: number;
  /** ID del intento que la ruta /quizzes/:instanceId necesita para mostrar el resultado. */
  questionnaireInstanceId?: number | null;
  title: string;
  courseName?: string;
  description: string;
  date: Date;
  courseId: number;
  type: CalendarEventType;
  navigationTarget?: 'NONE' | 'CLASSROOM_QUIZZES' | 'QUESTIONNAIRE';
  sectionName?: string;
  educationLevel?: string;
  gradeLevel?: string;
}
