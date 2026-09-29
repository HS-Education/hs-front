import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth-guard';
import { guestGuard } from './auth/guards/guest-guard';
import { adminGuard } from './auth/guards/admin-guard';
import { SignIn } from './auth/pages/sign-in/sign-in';
import { UpdatePassword } from './auth/pages/update-password/update-password';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'sign-in',
    component: SignIn,
    canActivate: [guestGuard],
  },
  {
    path: 'update-password',
    component: UpdatePassword,
    canActivate: [guestGuard],
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.Home),
    canActivate: [authGuard],
  },
  {
    path: 'classrooms',
    loadComponent: () =>
      import('./features/classrooms/classroom-list/classroom-list').then((m) => m.ClassroomList),
    canActivate: [authGuard],
  },
  {
    path: 'repository',
    loadComponent: () =>
      import('./features/repository/repository').then((m) => m.Repository),
    canActivate: [authGuard],
    data: { expectedRoles: ['COORDINATOR', 'ADMIN'] }
  },
  {
    path: 'metrics',
    loadComponent: () =>
      import('./features/areas/area-metrics/area-metrics').then((m) => m.AreaMetrics),
    canActivate: [authGuard],
    data: { expectedRoles: ['COORDINATOR', 'ADMIN'] }
  },
  {
    path: 'help',
    loadComponent: () =>
      import('./features/help/help').then((m) => m.HelpCenter),
    canActivate: [authGuard]
  },
  // El chat completo ya no es una ruta pública; Sery se utiliza mediante el bubble.
  {
    path: 'chat',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'classrooms/:id',
    loadComponent: () =>
      import('./features/classrooms/classroom-detail/classroom-detail').then(
        (m) => m.ClassroomDetail
      ),
    canActivate: [authGuard],
  },
  {
    path: 'classrooms/:id/quizzes/:instanceId',
    loadComponent: () =>
      import('./features/classrooms/classroom-detail/classroom-detail').then(
        (m) => m.ClassroomDetail
      ),
    canActivate: [authGuard],
  },
  {
    path: 'admin/academic-years',
    loadComponent: () =>
      import('./features/admin/academic-years/academic-years').then((m) => m.AcademicYears),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/users',
    loadComponent: () =>
      import('./features/admin/users/users').then((m) => m.Users),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/courses',
    loadComponent: () =>
      import('./features/admin/courses/courses-management').then((m) => m.CoursesManagement),
    canActivate: [adminGuard],
  },
  {
    path: 'admin/classrooms',
    loadComponent: () =>
      import('./features/admin/classrooms/classrooms-management').then((m) => m.ClassroomsManagement),
    canActivate: [adminGuard],
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./shared/pages/unauthorized/unauthorized').then((m) => m.Unauthorized),
  },
  {
    path: 'server-error',
    loadComponent: () =>
      import('./shared/pages/server-error/server-error').then((m) => m.ServerError),
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
