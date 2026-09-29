import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environment/environment';

export interface TopicPerformance {
  topicId: number;
  topicName: string;
  weekNumber: number;
  score: number;
  percentage: number;
  gradingPeriodId: number;
  courseId: number;
  progressHistory?: number[];
}

export interface StudentPerformance {
  studentId: number;
  studentName: string;
  averageScore: number;
  topics: TopicPerformance[];
}

export interface StudentAchievementResource {
  performance: StudentPerformance;
  latestInsight: string | null;
}

export interface ClassroomPerformance {
  classroomId: number;
  classroomName: string;
  averageScore: number;
  students: StudentPerformance[];
}

export interface ClassroomAchievementResource {
  performance: ClassroomPerformance;
  latestInsight: string | null;
  latestInsightCreatedAt?: string | null;
}

export interface ClassroomQuestionAnswer {
  questionId: number;
  topicId: number;
  questionText: string;
  correct: boolean;
  remedial: boolean;
}

export interface ClassroomQuestionnaireProgress {
  questionnaireId: number;
  gradingPeriodId: number;
  weekNumber: number;
  type: 'NORMAL' | 'REMEDIAL';
  status: string;
  submissions: Array<{
    studentId: number;
    score: number;
    submittedAt: string;
    answers: ClassroomQuestionAnswer[];
  }>;
}

export interface AreaPerformanceResource {
  areaId: number;
  areaName: string;
  averageScore: number;
  classrooms: ClassroomPerformance[];
}

export interface AreaAchievementResource {
  targetId: number;
  latestInsight: string | null;
  latestInsightCreatedAt?: string | null;
  performance: AreaPerformanceResource;
}

export interface GenerateRecommendationRequest {
  topicName: string;
  contextText: string;
  numQuestions: number;
}

export interface WeeklyPerformance {
  weekNumber: number;
  averageScore: number;
  needsRemedial: boolean;
}

export interface DefinitiveGrade {
  questionnaireId: number;
  weekNumber: number;
  score: number;
}

export interface StudentPerformanceSummaryResource {
  studentId: number;
  gradingPeriodId: number;
  bimesterAverage: number;
  weeklyProgression: WeeklyPerformance[];
  definitiveGrades: DefinitiveGrade[];
}

@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}/achievements`;

  getStudentAchievements(studentId: number): Observable<StudentAchievementResource> {
    return this.http.get<StudentAchievementResource>(`${this.apiUrl}/students/${studentId}`);
  }

  getStudentPerformanceSummary(studentId: number, courseId: number, gradingPeriodId: number): Observable<StudentPerformanceSummaryResource> {
    return this.http.get<StudentPerformanceSummaryResource>(
      `${this.apiUrl}/students/${studentId}/courses/${courseId}/periods/${gradingPeriodId}/summary`
    );
  }

  getAreaAchievements(areaId: number): Observable<AreaAchievementResource> {
    return this.http.get<AreaAchievementResource>(`${this.apiUrl}/areas/${areaId}`);
  }

  generateStudentPerformanceInsight(studentId: number): Observable<{message: string; insightText: string}> {
    return this.http.post<{message: string; insightText: string}>(`${this.apiUrl}/students/${studentId}/insights`, {});
  }

  getClassroomAchievements(classroomId: number): Observable<ClassroomAchievementResource> {
    return this.http.get<ClassroomAchievementResource>(`${this.apiUrl}/classrooms/${classroomId}`);
  }

  generateClassroomInsight(classroomId: number): Observable<{insightText: string}> {
    return this.http.post<{insightText: string}>(`${this.apiUrl}/classrooms/${classroomId}/insights`, {});
  }

  getClassroomProgressDetails(classroomId: number): Observable<ClassroomQuestionnaireProgress[]> {
    return this.http.get<ClassroomQuestionnaireProgress[]>(`${this.apiUrl}/classrooms/${classroomId}/progress-details`);
  }

  generateAreaInsight(areaId: number): Observable<{insightText: string}> {
    return this.http.post<{insightText: string}>(`${this.apiUrl}/areas/${areaId}/insights`, {});
  }

  generateClassroomRecommendation(classroomId: number, request: GenerateRecommendationRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/classrooms/${classroomId}/recommendations`, request);
  }
}

