import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment/environment';
import { User, SignUpRequest, SignUpResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}/users`;

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  registerUser(data: SignUpRequest): Observable<SignUpResponse> {
    return this.http.post<SignUpResponse>(this.apiUrl, data);
  }

  addRole(userId: number, roleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${userId}/roles/${roleId}`, {});
  }

  removeRole(userId: number, roleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${userId}/roles/${roleId}`);
  }
}
