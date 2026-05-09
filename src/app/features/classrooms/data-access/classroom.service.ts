import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../../environment/environment';
import {Classroom} from './classroom.model';

@Injectable({
  providedIn: 'root',
})
export class ClassroomService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  getClassrooms() {
    return this.http.get<Classroom[]>(`${this.baseUrl}/classrooms`);
  }
}
