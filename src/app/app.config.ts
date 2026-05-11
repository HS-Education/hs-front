import {ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {HTTP_INTERCEPTORS, provideHttpClient, withFetch} from '@angular/common/http';
import {authInterceptor} from './auth/interceptors/auth-interceptor';
import {UserDataService} from './shared/services/user-data.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    { provide: HTTP_INTERCEPTORS, useValue: authInterceptor, multi: true },
    provideAppInitializer(() => {
      const userDataService = inject(UserDataService);
      void userDataService.restoreSession();
    }),
  ]
};
