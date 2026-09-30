import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CsrfService } from './csrf.service';
import { environment } from '../../../environment/environment';

describe('CSRF bootstrap', () => {
  let service: CsrfService;
  let http: HttpTestingController;
  const token = 'valid-masked-token-fixture';
  const url = `${environment.baseUrl}/auth/csrf`;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CsrfService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('shares one bootstrap across concurrent writes and caches only in memory', () => {
    const values: string[] = [];
    service.getToken().subscribe(value => values.push(value));
    service.getToken().subscribe(value => values.push(value));
    const request = http.expectOne(url);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ token, headerName: 'X-XSRF-TOKEN' });
    service.getToken().subscribe(value => values.push(value));
    http.expectNone(url);
    expect(values).toEqual([token, token, token]);
    service.invalidate();
    service.getToken().subscribe();
    http.expectOne(url).flush({ token, headerName: 'X-XSRF-TOKEN' });
  });
  it('rejects malformed tokens and arbitrary header names, then permits a new bootstrap', () => {
    for (const resource of [{ token, headerName: 'Authorization' },
        { token: 'invalid\r\nheader', headerName: 'X-XSRF-TOKEN' }]) {
      let error = false;
      service.getToken().subscribe({ error: () => error = true });
      http.expectOne(url).flush(resource);
      expect(error).toBe(true);
    }
    service.getToken().subscribe();
    http.expectOne(url).flush({ token, headerName: 'X-XSRF-TOKEN' });
  });
});
