import { TranslocoPipe } from '@jsverse/transloco';
import {Component, computed, effect, inject, OnInit, signal} from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import {Navbar} from './shared/components/navbar/navbar';
import {Toast} from './shared/components/toast/toast';
import {UserDataService} from './shared/services/user-data.service';
import {ThemeService} from './shared/services/theme.service';
import {OnboardingService} from './features/onboarding/data-access/onboarding.service';
import {OnboardingModal} from './features/onboarding/onboarding-modal/onboarding-modal';
import {SeryBubble} from './shared/components/sery-bubble/sery-bubble';
import {SeryBubbleService} from './shared/components/sery-bubble/sery-bubble.service';

@Component({
  selector: 'app-root',
  imports: [TranslocoPipe, RouterOutlet, Navbar, Toast, OnboardingModal, SeryBubble],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly userDataService = inject(UserDataService);
  protected readonly themeService = inject(ThemeService);
  protected readonly seryBubbleService = inject(SeryBubbleService);
  private readonly router = inject(Router);
  private readonly onboardingService = inject(OnboardingService);
  protected readonly title = signal('HS');

  readonly isRouting = signal(false);
  readonly currentUrl = signal(this.router.url);
  readonly showOnboarding = signal(false);

  readonly showNavbar = computed(() => {
    return this.userDataService.isAuthenticated() && !this.currentUrl().includes('/sign-in') && !this.currentUrl().includes('/update-password');
  });

  readonly showSeryBubble = computed(() => {
    if (!this.userDataService.isAuthenticated()) return false;
    const url = this.currentUrl();
    if (url.includes('/chat') || url.includes('/sign-in') || url.includes('/update-password')) return false;
    if (this.userDataService.isTakingQuiz()) return false;
    if (this.seryBubbleService.isCourseFiltered()) return false;
    return true;
  });

  readonly shouldShowSplash = computed(() => {
    if (this.userDataService.isSessionLoaded()) {
      return false;
    }
    const isSignInOrUpdate = this.currentUrl().includes('/sign-in') || window.location.href.includes('sign-in') || this.currentUrl().includes('/update-password') || window.location.href.includes('update-password');
    return !isSignInOrUpdate;
  });

  constructor() {
    // When session finishes loading and user is authenticated (and not admin), check onboarding
    effect(() => {
      const loaded = this.userDataService.isSessionLoaded();
      const authenticated = this.userDataService.isAuthenticated();
      const isAdmin = this.userDataService.isAdmin();
      if (loaded && authenticated && !isAdmin) {
        this.onboardingService.getStatus().subscribe({
          next: (status) => {
            if (!status.completed) {
              this.showOnboarding.set(true);
            }
          },
          error: () => {
            // Silently ignore — don't block the user if the request fails
          }
        });
      }
    });
  }

  onOnboardingComplete(): void {
    this.onboardingService.complete().subscribe({
      next: () => this.showOnboarding.set(false),
      error: () => this.showOnboarding.set(false),
    });
  }

  ngOnInit() {
    let navigationStartTime = 0;
    const MIN_LOADING_TIME = 500; // 500ms minimum loading display time

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        navigationStartTime = Date.now();
        if (!event.url.includes('sign-in') && !event.url.includes('update-password')) {
          this.isRouting.set(true);
        }
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (event instanceof NavigationEnd) {
          this.currentUrl.set(event.urlAfterRedirects || event.url);
        }
        const elapsed = Date.now() - navigationStartTime;
        const remaining = MIN_LOADING_TIME - elapsed;
        
        setTimeout(() => {
          this.isRouting.set(false);
        }, Math.max(0, remaining));
      }
    });
  }
}
