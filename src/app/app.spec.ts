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
import {TranslocoService} from '@jsverse/transloco';
import {Subject} from 'rxjs';

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
        {provide: TranslocoService, useValue: {translate: (key: string) => key}},
      ],
    });
    const app = TestBed.runInInjectionContext(() => new App());

    expect(app.showSeryBubble()).toBe(false);
    isAdmin.set(false);
    expect(app.showSeryBubble()).toBe(true);
  });
});

describe('onboarding completion', () => {
  it('keeps the tutorial open after a failure and permits a successful retry', () => {
    const firstAttempt = new Subject<void>();
    const retry = new Subject<void>();
    const complete = vi.fn().mockReturnValueOnce(firstAttempt).mockReturnValueOnce(retry);
    TestBed.configureTestingModule({providers: [
      {provide: UserDataService, useValue: {
        isAuthenticated: signal(true), isSessionLoaded: signal(false),
        isAdmin: signal(false), isTakingQuiz: signal(false),
      }},
      {provide: Router, useValue: {url: '/home'}},
      {provide: ThemeService, useValue: {}},
      {provide: SeryBubbleService, useValue: {isCourseFiltered: signal(false)}},
      {provide: OnboardingService, useValue: {complete}},
      {provide: TranslocoService, useValue: {translate: (key: string) => key}},
    ]});
    const app = TestBed.runInInjectionContext(() => new App());
    app.showOnboarding.set(true);
    app.onOnboardingComplete();
    app.onOnboardingComplete();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(app.completingOnboarding()).toBe(true);
    firstAttempt.error(new Error('Save failed'));
    expect(app.showOnboarding()).toBe(true);
    expect(app.completingOnboarding()).toBe(false);
    expect(app.onboardingError()).toBe('ONBOARDING.SAVE_FAILED');
    app.onOnboardingComplete();
    expect(app.onboardingError()).toBeNull();
    retry.next();
    retry.complete();
    expect(app.showOnboarding()).toBe(false);
    expect(app.completingOnboarding()).toBe(false);
  });
});
