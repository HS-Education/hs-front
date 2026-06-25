import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environment/environment';

export interface OnboardingStatus {
  completed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/onboarding`;

  getStatus(): Observable<OnboardingStatus> {
    return this.http.get<OnboardingStatus>(`${this.baseUrl}/status`);
  }

  complete(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/complete`, {});
  }
}
