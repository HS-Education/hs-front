import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {catchError, finalize, Observable, shareReplay, switchMap, throwError} from 'rxjs';
import {inject} from '@angular/core';
import {AuthService} from '../services/auth.service';
import {UserDataService} from '../../shared/services/user-data.service';
import {environment} from '../../../environment/environment';

let refresh$: Observable<unknown> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const userDataService = inject(UserDataService);

  const pageOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const apiBase = new URL(environment.baseUrl, pageOrigin);
  const target = new URL(req.url, pageOrigin);
  const basePath = apiBase.pathname.replace(/\/$/, '');
  const isApiRequest = target.origin === apiBase.origin &&
    (target.pathname === basePath || target.pathname.startsWith(`${basePath}/`));
  const isAuthEndpoint = isApiRequest &&
    /\/auth\/(sign-in|refresh-token|log-out)$/.test(target.pathname);

  // For API requests use credentials so browser sends HttpOnly cookies
  const requestWithCredentials = isApiRequest ? req.clone({ withCredentials: true }) : req;

  return next(requestWithCredentials).pipe(
    catchError((err: unknown) => {
      if (!isApiRequest || !(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      // If the 401 came from auth endpoints, avoid trying to refresh
      if (isAuthEndpoint) {
        userDataService.clearUser();
        return throwError(() => err);
      }

      // If a refresh is already in progress, wait for it
      if (!refresh$) {
        refresh$ = authService.refreshToken().pipe(
          // Share the single refresh observable among concurrent requests
          shareReplay(1),
          finalize(() => {
            refresh$ = null;
          }),
          catchError((refreshErr) => {
            // If refresh fails, clear local session and rethrow
            userDataService.clearUser();
            return throwError(() => refreshErr);
          })
        );
      }

      return refresh$.pipe(
        switchMap(() => {
          // Optionally refresh local user profile:
          // authService.me().subscribe({ next: profile => userDataService.setUser(profile), error: () => {} });

          const retryReq = requestWithCredentials.clone({ withCredentials: true });
          return next(retryReq);
        }),
        catchError((finalErr) => {
          userDataService.clearUser();
          return throwError(() => finalErr);
        })
      );
    })
  );
};
