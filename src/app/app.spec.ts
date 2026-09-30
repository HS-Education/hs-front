import { routes } from './app.routes';
import { authGuard } from './auth/guards/auth-guard';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {App} from './app';
import {OnboardingService} from './features/onboarding/data-access/onboarding.service';
import {SeryBubbleService} from './shared/components/sery-bubble/sery-bubble.service';
import {ThemeService} from './shared/services/theme.service';
import {UserDataService} from './shared/services/user-data.service';

describe('application routes', () => {
  it('keeps sign-in public and protects metrics by role', () => {
    const signIn = routes.find(route => route.path === 'sign-in');
    const metrics = routes.find(route => route.path === 'metrics');
    expect(signIn?.canActivate).toBeDefined();
    expect(metrics?.canActivate).toContain(authGuard);
    expect(metrics?.data?.['expectedRoles']).toEqual(['COORDINATOR', 'ADMIN']);
  });
});

describe('Sery bubble visibility', () => {
  it('hides the bubble for administrators and restores it for user roles', () => {
    const isAdmin = signal(true);
    TestBed.configureTestingModule({
      providers: [
        {provide: UserDataService, useValue: {
          isAuthenticated: signal(true), isSessionLoaded: signal(false),
          isAdmin, isTakingQuiz: signal(false),
        }},
        {provide: Router, useValue: {url: '/admin/classrooms'}},
        {provide: ThemeService, useValue: {}},
        {provide: SeryBubbleService, useValue: {isCourseFiltered: signal(false)}},
        {provide: OnboardingService, useValue: {}},
      ],
    });
    const app = TestBed.runInInjectionContext(() => new App());

    expect(app.showSeryBubble()).toBe(false);
    isAdmin.set(false);
    expect(app.showSeryBubble()).toBe(true);
  });
});
