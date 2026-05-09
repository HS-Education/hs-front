import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {UserDataService} from '../../shared/services/user-data.service';
import {AuthService} from '../services/auth.service';
import {catchError, map, of} from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const userDataService = inject(UserDataService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si ya hay un usuario autenticado, permitir acceso
  if (userDataService.isAuthenticated()) {
    return true;
  }

  // Si no hay usuario, intentar restaurar la sesión
  return authService.me().pipe(
    map((profile) => {
      userDataService.setUser(profile);
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/sign-in'])))
  );
};
