import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth-guard';
import { guestGuard } from './auth/guards/guest-guard';
import { adminGuard } from './auth/guards/admin-guard';
import { SignIn } from './auth/pages/sign-in/sign-in';

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
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/chat').then((m) => m.Chat),
    canActivate: [authGuard],
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
    path: 'not-found',
    loadComponent: () =>
      import('./shared/pages/not-found/not-found').then((m) => m.NotFound),
  },
  {
    path: '**',
    redirectTo: 'not-found',
  }
];
