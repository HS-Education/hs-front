import { Routes } from '@angular/router';
import {authGuard} from './auth/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'sign-in',
    loadComponent: () =>
      import('./auth/pages/sign-in/sign-in').then((m) => m.SignIn),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.Home),
    canActivate: [authGuard],
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./shared/pages/not-found/not-found').then((m) => m.NotFound),
  },
  {
    path: '**',
    redirectTo: 'not-found',
  }
];
