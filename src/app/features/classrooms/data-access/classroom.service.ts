import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpParams} from '@angular/common/http';
import {Observable, catchError, of, throwError} from 'rxjs';
import {environment} from '../../../../environment/environment';
import {Classroom} from './models/responses/classroom.model';
import {Document} from './models/responses/document.model';
import {Member} from './models/responses/member.model';
import {Topic} from './models/responses/topic.model';
import {UploadDocumentRequest} from './models/requests/upload-document.request';

@Injectable({
  providedIn: 'root',
})
export class ClassroomService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  getClassrooms(userId: number) {
    const params = new HttpParams().set('userId', userId);
    return this.emptyCollectionOnNotFound(this.http.get<Classroom[]>(
      `${this.baseUrl}/classrooms`,
      { params, withCredentials: true }
    ));
  }

  getAllClassrooms() {
    return this.http.get<Classroom[]>(
      `${this.baseUrl}/classrooms`,
      { withCredentials: true }
    );
  }

  getClassroomById(classroomId: number) {
    return this.http.get<Classroom>(
      `${this.baseUrl}/classrooms/${classroomId}`,
      { withCredentials: true }
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

  retryDocumentProcessing(courseId: number, documentId: number) {
    return this.http.post<void>(
      `${this.baseUrl}/courses/${courseId}/documents/${documentId}/retry-processing`,
      {},
      { withCredentials: true }
    );
  }

  getClassroomMembers(classroomId: number) {
    return this.http.get<Member[]>(
      `${this.baseUrl}/classrooms/${classroomId}/members`,
      { withCredentials: true }
    );
  }

  getClassroomTopics(courseId: number) {
    return this.http.get<Topic[]>(
      `${this.baseUrl}/courses/${courseId}/topics`,
      { withCredentials: true }
    );
  }

  uploadDocument(courseId: number, request: UploadDocumentRequest, file: File) {
    const formData = new FormData();

    formData.append(
      'data',
      new Blob([JSON.stringify(request)], {type: 'application/json'})
    );
    formData.append('file', file);

    return this.http.post(
      `${this.baseUrl}/courses/${courseId}/documents`,
      formData,
      {withCredentials: true}
    )
  }

  uploadBulkDocuments(courseId: number, bimester: string, documents: Array<{ fileName: string; title: string; topicId: number; educationLevel: string; gradeLevels: string[] }>, files: File[]) {
    const formData = new FormData();
    const payload = { bimester, documents };

    formData.append(
      'data',
      new Blob([JSON.stringify(payload)], {type: 'application/json'})
    );
    for (const file of files) {
      formData.append('files', file, file.name);
    }

    return this.http.post<Document[]>(
      `${this.baseUrl}/courses/${courseId}/documents/bulk`,
      formData,
      {withCredentials: true}
    );
  }

  deleteDocument(courseId: number, documentId: number) {
    return this.http.delete<void>(
      `${this.baseUrl}/courses/${courseId}/documents/${documentId}`,
      { withCredentials: true }
    );
  }

  reorderTopics(courseId: number, topics: Array<{ topicId: number; gradingPeriodId: number; orderIndex: number }>) {
    return this.http.put<void>(
      `${this.baseUrl}/courses/${courseId}/topics/reorder`,
      { topics },
      { withCredentials: true }
    );
  }

  addTopic(courseId: number, name: string, gradingPeriodId: number) {
    return this.http.post<void>(
      `${this.baseUrl}/courses/${courseId}/topics`,
      { name, gradingPeriodId },
      { withCredentials: true }
    );
  }

  deleteTopic(courseId: number, topicId: number) {
    return this.http.delete<void>(
      `${this.baseUrl}/courses/${courseId}/topics/${topicId}`,
      { withCredentials: true }
    );
  }

  getGradingPeriods(academicYearId: number) {
    return this.http.get<Array<{ id: number; bimester: string; status?: 'PLANNED' | 'ACTIVE' | 'FINISHED' }>>(
      `${this.baseUrl}/academic-years/${academicYearId}/grading-periods`,
      { withCredentials: true }
    );
  }

  getAreas() {
    return this.emptyCollectionOnNotFound(this.http.get<Array<{ id: number; name: string; coordinatorName: string }>>(
      `${this.baseUrl}/areas`,
      { withCredentials: true }
    ));
  }

  private emptyCollectionOnNotFound<T>(request: Observable<T[]>): Observable<T[]> {
    return request.pipe(catchError((error: HttpErrorResponse) =>
      error.status === 404 && (error.error == null || error.error === '')
        ? of([] as T[])
        : throwError(() => error)
    ));
  }
}
