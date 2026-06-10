import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environment/environment';
import { AcademicYear, GradingPeriod, UpdateGradingPeriodRequest } from '../models/academic-year.model';

@Injectable({
  providedIn: 'root'
})
export class AcademicYearService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}/academic-years`;

  generateAcademicYear(): Observable<AcademicYear> {
    return this.http.post<AcademicYear>(this.apiUrl, {});
  }

  getAllAcademicYears(): Observable<AcademicYear[]> {
    return this.http.get<AcademicYear[]>(this.apiUrl);
  }

  getGradingPeriods(academicYearId: number): Observable<GradingPeriod[]> {
    return this.http.get<GradingPeriod[]>(`${this.apiUrl}/${academicYearId}/grading-periods`);
  }

  updateGradingPeriod(academicYearId: number, gradingPeriodId: number, data: UpdateGradingPeriodRequest): Observable<GradingPeriod> {
    return this.http.put<GradingPeriod>(`${this.apiUrl}/${academicYearId}/grading-periods/${gradingPeriodId}`, data);
  }
}
