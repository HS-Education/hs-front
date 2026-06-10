import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environment/environment';

export interface TopicPerformance {
  topicId: number;
  topicName: string;
  weekNumber: number;
  score: number;
  percentage: number;
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

@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}/achievements`;

  getStudentAchievements(studentId: number): Observable<StudentAchievementResource> {
    return this.http.get<StudentAchievementResource>(`${this.apiUrl}/students/${studentId}`);
  }

  getAreaAchievements(areaId: number): Observable<AreaAchievementResource> {
    return this.http.get<AreaAchievementResource>(`${this.apiUrl}/areas/${areaId}`);
  }

  generateStudentInsight(studentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/${studentId}/insights`, {});
  }

  getClassroomAchievements(classroomId: number): Observable<ClassroomAchievementResource> {
    return this.http.get<ClassroomAchievementResource>(`${this.apiUrl}/classrooms/${classroomId}`);
  }

  generateClassroomInsight(classroomId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/classrooms/${classroomId}/insights`, {});
  }

  generateAreaInsight(areaId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/areas/${areaId}/insights`, {});
  }

  generateClassroomRecommendation(classroomId: number, request: GenerateRecommendationRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/classrooms/${classroomId}/recommendations`, request);
  }
}
