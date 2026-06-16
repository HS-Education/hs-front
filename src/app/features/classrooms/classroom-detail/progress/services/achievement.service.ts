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

  generateStudentPerformanceInsight(studentId: number, studentName: string): Observable<any> {
    const params = new HttpParams().set('studentName', studentName);
    return this.http.post(`${this.apiUrl}/students/${studentId}/insights`, {}, { params });
  }

  getClassroomAchievements(classroomId: number): Observable<ClassroomAchievementResource> {
    return this.http.get<ClassroomAchievementResource>(`${this.apiUrl}/classrooms/${classroomId}`);
  }

  generateClassroomInsight(classroomId: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/classrooms/${classroomId}/insights`, {});
  }

  generateAreaInsight(areaId: number): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/areas/${areaId}/insights`, {});
  }

  generateClassroomRecommendation(classroomId: number, request: GenerateRecommendationRequest): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/classrooms/${classroomId}/recommendations`, request);
  }
}

