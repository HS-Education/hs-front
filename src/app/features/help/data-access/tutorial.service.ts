import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../../environment/environment';

export interface PlatformTutorial {
  id: number;
  title: string;
  description: string;
  fileUrl: string;
  createdAt: Date;
}

export interface CreatePlatformTutorial {
  title: string;
  description: string;
  fileUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/onboarding/tutorials`;

  getAll(): Observable<PlatformTutorial[]> {
    return this.http.get<PlatformTutorial[]>(this.baseUrl);
  }

  create(tutorial: CreatePlatformTutorial): Observable<void> {
    return this.http.post<void>(this.baseUrl, tutorial);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  update(id: number, tutorial: CreatePlatformTutorial): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, tutorial);
  }
}
