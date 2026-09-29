import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { UserDataService } from '../../shared/services/user-data.service';
import { authGuard } from './auth-guard';
import { adminGuard } from './admin-guard';
import { guestGuard } from './guest-guard';

describe('route access by session and role', () => {
  const me = vi.fn();
  let userData: UserDataService;
  let router: Router;

  beforeEach(() => {
    me.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { me } }],
    });
    userData = TestBed.inject(UserDataService);
    router = TestBed.inject(Router);
  });

  async function check(guard: CanActivateFn, expectedRoles: string[] = []): Promise<unknown> {
    const route = { data: { expectedRoles } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/repository' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => guard(route, state));
    return isObservable(result) ? firstValueFrom(result) : await result;
  }

  it('allows an authenticated coordinator with a ROLE_ prefix', async () => {
    userData.setUser({ id: 1, name: 'Coordinator', username: 'p', roles: ['ROLE_COORDINATOR'] });
    expect(await check(authGuard, ['COORDINATOR', 'ADMIN'])).toBe(true);
    expect(me).not.toHaveBeenCalled();
  });

  it('does not allow a student into coordinator routes', async () => {
    userData.setUser({ id: 2, name: 'Student', username: 'e', roles: ['STUDENT'] });
    expect((await check(authGuard, ['COORDINATOR', 'ADMIN'])).toString()).toBe('/home');
    expect((await check(adminGuard)).toString()).toBe('/home');
  });

  it('restores a valid cookie once before deciding access', async () => {
    me.mockReturnValue(of({ id: 3, name: 'Admin', username: 'a', roles: ['ADMIN'] }));
    expect(await check(adminGuard)).toBe(true);
    expect(userData.isAdmin()).toBe(true);
    expect(me).toHaveBeenCalledTimes(1);
  });

  it('redirects an expired session to sign-in', async () => {
    me.mockReturnValue(throwError(() => new Error('expired')));
    expect((await check(authGuard)).toString()).toBe('/sign-in');
    expect(userData.isAuthenticated()).toBe(false);
  });

  it('redirects an authenticated user away from guest sign-in', async () => {
    userData.setUser({ id: 4, name: 'Student', username: 'e', roles: ['STUDENT'] });
    expect((await check(guestGuard)).toString()).toBe('/home');
  });
});
