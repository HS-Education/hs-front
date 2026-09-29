import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth-interceptor';
import { environment } from '../../../environment/environment';

describe('authInterceptor cookie and refresh boundary', () => {
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends cookies to the configured API only', () => {
    client.get(`${environment.baseUrl}/classrooms`).subscribe();
    const own = http.expectOne(`${environment.baseUrl}/classrooms`);
    expect(own.request.withCredentials).toBe(true);
    own.flush([]);

    client.get('https://untrusted.example/api/v1/classrooms').subscribe();
    const external = http.expectOne('https://untrusted.example/api/v1/classrooms');
    expect(external.request.withCredentials).toBe(false);
    external.flush([]);
  });

  it('refreshes and retries an expired session once', () => {
    let result: unknown;
    client.get(`${environment.baseUrl}/classrooms`).subscribe(value => result = value);
    const first = http.expectOne(`${environment.baseUrl}/classrooms`);
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = http.expectOne(`${environment.baseUrl}/auth/refresh-token`);
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({ message: 'refreshed' });

    const retried = http.expectOne(`${environment.baseUrl}/classrooms`);
    expect(retried.request.withCredentials).toBe(true);
    retried.flush([{ id: 1 }]);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('does not refresh for a rejected sign-in or a forbidden request', () => {
    client.post(`${environment.baseUrl}/auth/sign-in`, {}).subscribe({ error: () => {} });
    http.expectOne(`${environment.baseUrl}/auth/sign-in`).flush({}, { status: 401, statusText: 'Unauthorized' });
    client.get(`${environment.baseUrl}/classrooms`).subscribe({ error: () => {} });
    http.expectOne(`${environment.baseUrl}/classrooms`).flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectNone(`${environment.baseUrl}/auth/refresh-token`);
  });

  it('never refreshes an unrelated origin after its 401', () => {
    client.get('https://untrusted.example/api/v1/classrooms').subscribe({ error: () => {} });
    http.expectOne('https://untrusted.example/api/v1/classrooms')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectNone(`${environment.baseUrl}/auth/refresh-token`);
  });
});
