import {Component, computed, inject, OnInit, signal} from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import {Navbar} from './shared/components/navbar/navbar';
import {UserDataService} from './shared/services/user-data.service';
import {ThemeService} from './shared/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly userDataService = inject(UserDataService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  protected readonly title = signal('HS');

  readonly isRouting = signal(false);
  readonly currentUrl = signal(this.router.url);

  readonly showNavbar = computed(() => {
    return this.userDataService.isAuthenticated() && !this.currentUrl().includes('/sign-in');
  });

  readonly shouldShowSplash = computed(() => {
    if (this.userDataService.isSessionLoaded()) {
      return false;
    }
    const isSignIn = this.currentUrl().includes('/sign-in') || window.location.href.includes('sign-in');
    return !isSignIn;
  });

  ngOnInit() {
    let navigationStartTime = 0;
    const MIN_LOADING_TIME = 500; // 500ms minimum loading display time

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        navigationStartTime = Date.now();
        if (!event.url.includes('sign-in')) {
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
