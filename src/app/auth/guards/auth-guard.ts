import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {UserDataService} from '../../shared/services/user-data.service';
import {AuthService} from '../services/auth.service';
import {catchError, map, of} from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const userDataService = inject(UserDataService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Helper to validate expected roles
  const checkRoles = (): boolean => {
    const expectedRoles = route.data['expectedRoles'] as string[] | undefined;
    if (!expectedRoles || expectedRoles.length === 0) {
      return true; // No specific role required, just authentication
    }

    const user = userDataService.userProfile();
    if (!user || !user.roles) {
      return false;
    }

    // Clean roles (uppercase, remove "ROLE_" prefix)
    const userRoles = user.roles.map(r => r.toUpperCase().replace(/^ROLE_/, ''));
    const cleanExpected = expectedRoles.map(r => r.toUpperCase().replace(/^ROLE_/, ''));

    // Check if user has at least one of the expected roles
    return cleanExpected.some(role => userRoles.includes(role));
  };

  // If already authenticated
  if (userDataService.isAuthenticated()) {
    if (checkRoles()) {
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
      if (checkRoles()) {
        return true;
      } else {
        return router.createUrlTree(['/home']);
      }
    }),
    catchError(() => of(router.createUrlTree(['/sign-in'])))
  );
};
