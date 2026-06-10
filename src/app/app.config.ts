import {ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {authInterceptor} from './auth/interceptors/auth-interceptor';
import {responseInterceptor} from './shared/interceptors/response.interceptor';
import {UserDataService} from './shared/services/user-data.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, responseInterceptor])),
    provideAppInitializer(() => {
      const userDataService = inject(UserDataService);
      void userDataService.restoreSession();
    }),
  ]
};
