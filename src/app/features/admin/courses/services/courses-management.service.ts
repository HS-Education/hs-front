import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../../environment/environment';
import { Observable } from 'rxjs';
import { Area, CreateAreaRequest, UpdateAreaRequest } from '../models/area.model';
import { Course, CreateCourseRequest, UpdateCourseRequest } from '../models/course.model';
import { Section, CreateSectionRequest } from '../models/section.model';
import { StudyPlan, AddCourseToStudyPlanRequest } from '../models/study-plan.model';

@Injectable({
  providedIn: 'root'
})
export class CoursesManagementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.baseUrl;

  // --- Areas ---
  getAreas(): Observable<Area[]> {
    return this.http.get<Area[]>(`${this.apiUrl}/areas`);
  }

  createArea(data: CreateAreaRequest): Observable<Area> {
    return this.http.post<Area>(`${this.apiUrl}/areas`, data);
  }

  updateArea(id: number, data: UpdateAreaRequest): Observable<Area> {
    return this.http.patch<Area>(`${this.apiUrl}/areas/${id}`, data);
  }

  deleteArea(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/areas/${id}`);
  }

  // --- Courses ---
  getCourses(areaId?: number): Observable<Course[]> {
    let params = new HttpParams();
    if (areaId) {
      params = params.set('areaId', areaId.toString());
    }
    return this.http.get<Course[]>(`${this.apiUrl}/courses`, { params });
  }

  createCourse(data: CreateCourseRequest): Observable<Course> {
    return this.http.post<Course>(`${this.apiUrl}/courses`, data);
  }

  updateCourse(id: number, data: UpdateCourseRequest): Observable<Course> {
    return this.http.patch<Course>(`${this.apiUrl}/courses/${id}`, data);
  }

  deleteCourse(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/courses/${id}`);
  }

  // --- Sections ---
  getSections(): Observable<Section[]> {
    return this.http.get<Section[]>(`${this.apiUrl}/sections`);
  }

  createSection(data: CreateSectionRequest): Observable<Section> {
    return this.http.post<Section>(`${this.apiUrl}/sections`, data);
  }

  deleteSection(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sections/${id}`);
  }

  // --- Study Plans ---
  getStudyPlanCourses(educationLevel: string, gradeLevel: string): Observable<StudyPlan[]> {
    const params = new HttpParams()
      .set('educationLevel', educationLevel)
      .set('gradeLevel', gradeLevel);
    return this.http.get<StudyPlan[]>(`${this.apiUrl}/study-plans/courses`, { params });
  }

  addCourseToStudyPlan(data: AddCourseToStudyPlanRequest): Observable<StudyPlan> {
    return this.http.post<StudyPlan>(`${this.apiUrl}/study-plans/courses`, data);
  }

  removeCourseFromStudyPlan(studyPlanId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/study-plans/courses/${studyPlanId}`);
  }
}
