import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment/environment';
import { Classroom } from '../models/classroom.model';
import { AssignTeacherPayload, EnrollStudentsPayload, Enrollment, UnenrollStudentPayload, UnassignTeacherPayload } from '../models/enrollment.model';

@Injectable({
  providedIn: 'root'
})
export class ClassroomsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}/classrooms`;
  private readonly enrollmentsUrl = `${environment.baseUrl}/enrollments`;

  // --- Classrooms ---

  getAllClassrooms(): Observable<Classroom[]> {
    return this.http.get<Classroom[]>(this.apiUrl);
  }

  generateAllClassrooms(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/generate-all`, {});
  }

  deleteClassroom(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // --- Enrollments & Members ---

  getClassroomMembers(classroomId: number): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.apiUrl}/${classroomId}/members`);
  }

  assignTeacher(payload: AssignTeacherPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.enrollmentsUrl}/teachers/assign`, payload);
  }

  enrollStudents(payload: EnrollStudentsPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.enrollmentsUrl}/students/enroll`, payload);
  }

  unenrollStudent(payload: UnenrollStudentPayload): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.enrollmentsUrl}/students/unenroll`, { body: payload });
  }

  unassignTeacher(payload: UnassignTeacherPayload): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.enrollmentsUrl}/teachers/unassign`, { body: payload });
  }
}
