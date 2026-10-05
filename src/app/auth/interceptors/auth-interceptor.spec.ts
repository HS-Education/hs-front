import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth-interceptor';
import { environment } from '../../../environment/environment';
import { CsrfService } from '../services/csrf.service';
import { of, throwError } from 'rxjs';

describe('authInterceptor cookie and refresh boundary', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  const csrf = { getToken: vi.fn(() => of('masked-csrf-token-fixture')), invalidate: vi.fn() };

  beforeEach(() => {
    csrf.getToken.mockReset().mockReturnValue(of('masked-csrf-token-fixture'));
    csrf.invalidate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: CsrfService, useValue: csrf },
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

  it('attaches CSRF to API writes only, including absolute local API URLs', () => {
    client.post(`${environment.baseUrl}/classrooms`, {}).subscribe();
    const own = http.expectOne(`${environment.baseUrl}/classrooms`);
    expect(own.request.headers.get('X-XSRF-TOKEN')).toBe('masked-csrf-token-fixture');
    own.flush({});
    client.post('https://untrusted.example/api/v1/classrooms', {}).subscribe();
    const external = http.expectOne('https://untrusted.example/api/v1/classrooms');
    expect(external.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    expect(external.request.withCredentials).toBe(false);
    external.flush({});
    expect(csrf.getToken).toHaveBeenCalledTimes(1);
  });

  it('does not send a write when CSRF bootstrap fails', () => {
    csrf.getToken.mockReturnValueOnce(throwError(() => new Error('Bootstrap failed')));
    let failed = false;
    client.post(`${environment.baseUrl}/classrooms`, {}).subscribe({ error: () => failed = true });
    http.expectNone(`${environment.baseUrl}/classrooms`);
    expect(failed).toBe(true);
  });

  it('invalidates CSRF after logout without automatically replaying forbidden writes', () => {
    client.post(`${environment.baseUrl}/auth/log-out`, {}).subscribe();
    http.expectOne(`${environment.baseUrl}/auth/log-out`).flush({});
    expect(csrf.invalidate).toHaveBeenCalledOnce();
    client.post(`${environment.baseUrl}/classrooms`, {}).subscribe({ error: () => {} });
    http.expectOne(`${environment.baseUrl}/classrooms`).flush({}, { status: 403, statusText: 'Forbidden' });
    http.expectNone(`${environment.baseUrl}/classrooms`);
    expect(csrf.invalidate).toHaveBeenCalledTimes(2);
  });

  it('renews CSRF and retries a filter-rejected write exactly once', () => {
    csrf.getToken.mockReturnValueOnce(of('old-masked-token-fixture')).mockReturnValueOnce(of('new-masked-token-fixture'));
    let result: unknown;
    client.post(`${environment.baseUrl}/classrooms`, {name: 'Synthetic class'}).subscribe(value => result = value);
    const first = http.expectOne(`${environment.baseUrl}/classrooms`);
    expect(first.request.headers.get('X-XSRF-TOKEN')).toBe('old-masked-token-fixture');
    first.flush({code: 'CSRF_TOKEN_INVALID'}, {status: 403, statusText: 'Forbidden'});
    const replacement = http.expectOne(`${environment.baseUrl}/classrooms`);
    expect(replacement.request.headers.get('X-XSRF-TOKEN')).toBe('new-masked-token-fixture');
    expect(replacement.request.body).toEqual({name: 'Synthetic class'});
    replacement.flush({id: 42});
    expect(result).toEqual({id: 42});
    expect(csrf.invalidate).toHaveBeenCalledWith('old-masked-token-fixture');
    expect(csrf.getToken).toHaveBeenCalledTimes(2);
  });

  it('stops after a second explicit CSRF rejection', () => {
    let status: number | undefined;
    client.post(`${environment.baseUrl}/onboarding/complete`, {}).subscribe({error: error => status = error.status});
    for (let attempt = 0; attempt < 2; attempt++) {
      http.expectOne(`${environment.baseUrl}/onboarding/complete`)
        .flush({code: 'CSRF_TOKEN_MISSING'}, {status: 403, statusText: 'Forbidden'});
    }
    http.expectNone(`${environment.baseUrl}/onboarding/complete`);
    expect(status).toBe(403);
    expect(csrf.getToken).toHaveBeenCalledTimes(2);
  });

  it('never replays server failures or ordinary permission denials', () => {
    for (const status of [403, 500]) {
      client.post(`${environment.baseUrl}/documents`, {}).subscribe({error: () => {}});
      http.expectOne(`${environment.baseUrl}/documents`)
        .flush({code: 'ACCESS_DENIED'}, {status, statusText: 'Synthetic rejection'});
      http.expectNone(`${environment.baseUrl}/documents`);
    }
    expect(csrf.getToken).toHaveBeenCalledTimes(2);
  });
});
