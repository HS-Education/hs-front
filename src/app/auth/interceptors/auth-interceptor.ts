import {HttpErrorResponse, HttpInterceptorFn, HttpResponse} from '@angular/common/http';
import {catchError, finalize, Observable, shareReplay, switchMap, tap, throwError} from 'rxjs';
import {inject} from '@angular/core';
import {AuthService} from '../services/auth.service';
import {UserDataService} from '../../shared/services/user-data.service';
import {environment} from '../../../environment/environment';
import {CsrfService} from '../services/csrf.service';
import {isCsrfRejection} from '../services/csrf-error';

let refresh$: Observable<unknown> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const userDataService = inject(UserDataService);
  const csrf = inject(CsrfService);

  const pageOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const apiBase = new URL(environment.baseUrl, pageOrigin);
  const target = new URL(req.url, pageOrigin);
  const basePath = apiBase.pathname.replace(/\/$/, '');
  const isApiRequest = target.origin === apiBase.origin &&
    (target.pathname === basePath || target.pathname.startsWith(`${basePath}/`));
  const isAuthEndpoint = isApiRequest &&
    /\/auth\/(sign-in|refresh-token|log-out|csrf)$/.test(target.pathname);

  // For API requests use credentials so browser sends HttpOnly cookies
  const requestWithCredentials = isApiRequest ? req.clone({ withCredentials: true }) : req;
  const unsafe = isApiRequest && !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  let sentCsrfToken: string | undefined;
  const sendOnce = () => unsafe
    ? csrf.getToken().pipe(tap(token => sentCsrfToken = token), switchMap(token => next(requestWithCredentials.clone({
        setHeaders: { 'X-XSRF-TOKEN': token }
      }))))
    : next(requestWithCredentials);
  const send = () => sendOnce().pipe(catchError((err: unknown) => {
    if (unsafe && err instanceof HttpErrorResponse && isCsrfRejection(err.status, err.error)) {
      csrf.invalidate(sentCsrfToken);
      // Exactly one retry, and only for a filter rejection before the write ran.
      return sendOnce();
    }
    return throwError(() => err);
  }));

  return send().pipe(
    tap(event => {
      if (isAuthEndpoint && event instanceof HttpResponse && unsafe) csrf.invalidate();
    }),
    catchError((err: unknown) => {
      if (isApiRequest && err instanceof HttpErrorResponse && err.status === 403) csrf.invalidate();
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

          return send();
        }),
        catchError((finalErr) => {
          userDataService.clearUser();
          return throwError(() => finalErr);
        })
      );
    })
  );
};
