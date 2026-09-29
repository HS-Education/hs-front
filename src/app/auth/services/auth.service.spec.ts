import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environment/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends credentials on sign-in and reads the profile', () => {
    const profile = { id: 7, name: 'Demo', username: 'demo', roles: ['STUDENT'] };
    let received = null as typeof profile | null;
    service.SignIn({ username: 'demo', password: 'local-test-password' }).subscribe(value => received = value);

    const request = http.expectOne(`${environment.baseUrl}/auth/sign-in`);
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ username: 'demo', password: 'local-test-password' });
    request.flush(profile);
    expect(received).toEqual(profile);
  });

  it('sends the session cookie on /me', () => {
    service.me().subscribe();
    const request = http.expectOne(`${environment.baseUrl}/auth/me`);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ id: 7, name: 'Demo', username: 'demo', roles: ['STUDENT'] });
  });
});
