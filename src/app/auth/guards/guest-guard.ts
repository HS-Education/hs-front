import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {UserDataService} from '../../shared/services/user-data.service';
import {AuthService} from '../services/auth.service';
import {catchError, map, of} from 'rxjs';

export const guestGuard: CanActivateFn = (route, state) => {
  const userDataService = inject(UserDataService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already authenticated, redirect to home
  if (userDataService.isAuthenticated()) {
    return router.createUrlTree(['/home']);
  }

  // If session is already loaded and we are not authenticated, allow access to sign-in page without checking again
  if (userDataService.isSessionLoaded()) {
    return true;
  }

  // Attempt to restore session, if successful redirect to home, if failed let them stay on sign-in
  return authService.me().pipe(
    map((profile) => {
      userDataService.setUser(profile);
      return router.createUrlTree(['/home']);
    }),
    catchError(() => of(true))
  );
};
