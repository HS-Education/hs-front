import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {UserDataService} from '../../shared/services/user-data.service';
import {AuthService} from '../services/auth.service';
import {catchError, map, of} from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const userDataService = inject(UserDataService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already authenticated
  if (userDataService.isAuthenticated()) {
    if (userDataService.isAdmin()) {
      return true;
    } else {
      return router.createUrlTree(['/home']); // Redirect to home if unauthorized
    }
  }

  // If session is already loaded and we are not authenticated, redirect to sign-in immediately
  if (userDataService.isSessionLoaded()) {
    return router.createUrlTree(['/sign-in']);
  }

  // If not authenticated, attempt session restore
  return authService.me().pipe(
    map((profile) => {
      userDataService.setUser(profile);
      if (userDataService.isAdmin()) {
        return true;
      } else {
        return router.createUrlTree(['/home']);
      }
    }),
    catchError(() => of(router.createUrlTree(['/sign-in'])))
  );
};
