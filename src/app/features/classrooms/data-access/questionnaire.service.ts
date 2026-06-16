import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../../environment/environment';

export interface QuestionnaireAttempt {
  instanceId: number;
  score: number;
  submittedAt: string;
}

export interface AvailableQuestionnaire {
  id: number;
  courseId: number;
  gradingPeriodId: number;
  weekNumber: number;
  status: 'PENDING' | 'STARTED' | 'COMPLETED' | 'RETRY';
  activeInstanceId: number | null;
  attemptsLeft: number;
  maxAttempts: number;
  questionsPerAttempt: number;
  type: string;
  pastAttempts: QuestionnaireAttempt[];
  createdAt?: string;
}

export interface Question {
  id: number;
  topicId: number;
  text: string;
  options: string[];
  isRemedial: boolean;
}

export interface SubmissionAnswer {
  questionId: number;
  questionText: string;
  options: string[];
  selectedOptionIndex: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  aiFeedback: string;
}

export interface QuestionnaireSubmission {
  score: number;
  answers: SubmissionAnswer[];
}

@Injectable({
  providedIn: 'root',
})
export class QuestionnaireService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  getAvailableQuestionnaires() {
    return this.http.get<AvailableQuestionnaire[]>(
      `${this.baseUrl}/assessments/questionnaires/available`,
      { withCredentials: true }
    );
  }

  startQuestionnaire(questionnaireId: number) {
    return this.http.post<number>(
      `${this.baseUrl}/assessments/questionnaires/${questionnaireId}/start`,
      {},
      { withCredentials: true }
    );
  }

  getQuestions(instanceId: number) {
    return this.http.get<Question[]>(
      `${this.baseUrl}/assessments/questionnaires/${instanceId}/questions`,
      { withCredentials: true }
    );
  }

  submitQuestionnaire(instanceId: number, answers: { [key: number]: number }) {
    return this.http.post<void>(
      `${this.baseUrl}/assessments/questionnaires/${instanceId}/submit`,
      { answers },
      { withCredentials: true }
    );
  }

  getSubmissionResults(instanceId: number) {
    return this.http.get<QuestionnaireSubmission>(
      `${this.baseUrl}/assessments/questionnaires/${instanceId}/results`,
      { withCredentials: true }
    );
  }

  generateQuestionnaire(
    courseId: number,
    gradingPeriodId: number,
    weekNumber: number,
    allowedAttempts: number,
    questionsPerAttempt: number
  ) {
    return this.http.post<void>(
      `${this.baseUrl}/assessments/questionnaires/generate`,
      { courseId, gradingPeriodId, weekNumber, allowedAttempts, questionsPerAttempt },
      { withCredentials: true }
    );
  }

  generateRemedialQuestionnaire(
    studentId: number,
    courseId: number,
    gradingPeriodId: number,
    weekNumber: number,
    topicId: number,
    numQuestions: number
  ) {
    return this.http.post<void>(
      `${this.baseUrl}/assessments/questionnaires/generate-remedial`,
      { studentId, courseId, gradingPeriodId, weekNumber, topicId, numQuestions },
      { withCredentials: true }
    );
  }
}
