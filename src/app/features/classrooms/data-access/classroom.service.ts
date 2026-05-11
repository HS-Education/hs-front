import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../../../environment/environment';
import {Classroom} from './classroom.model';
import {Document} from './document.model';
import {Member} from './member.model';

@Injectable({
  providedIn: 'root',
})
export class ClassroomService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  getClassrooms(userId: number) {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<Classroom[]>(
      `${this.baseUrl}/classrooms`,
      { params, withCredentials: true }
    );
  }

  getClassroomDocuments(courseId: number){
    return this.http.get<Document[]>(
      `${this.baseUrl}/courses/${courseId}/documents`,
      {withCredentials: true}
    );
  }

  getDocumentDownloadUrl(courseId: number, documentId: number) {
    return this.http.get<{ url: string }>(
      `${this.baseUrl}/courses/${courseId}/documents/${documentId}/download`,
      { withCredentials: true }
    );
  }

  getClassroomMembers(classroomId: number) {
    return this.http.get<Member[]>(
      `${this.baseUrl}/classrooms/${classroomId}/members`,
      { withCredentials: true }
    );
  }
}
