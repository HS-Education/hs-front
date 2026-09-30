import { inject, Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { finalize, map, Observable, of, shareReplay, tap, timeout } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class CsrfService {
  // Bootstrap bypasses interceptors to avoid recursive authentication/CSRF requests.
  private readonly http = new HttpClient(inject(HttpBackend));
  private token: string | null = null;
  private pending: Observable<string> | null = null;

  getToken(): Observable<string> {
    if (this.token) return of(this.token);
    if (!this.pending) {
      this.pending = this.http.get<{ token: string; headerName: string }>(
        `${environment.baseUrl}/auth/csrf`, { withCredentials: true }
      ).pipe(
        timeout(10000),
        map(resource => {
          if (resource.headerName !== 'X-XSRF-TOKEN' || typeof resource.token !== 'string' ||
              !/^[A-Za-z0-9_=-]{16,512}$/.test(resource.token)) {
            throw new Error('Invalid CSRF bootstrap response');
          }
          return resource.token;
        }),
        tap(token => this.token = token),
        finalize(() => this.pending = null),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.pending;
  }

  invalidate(): void { this.token = null; }
}
