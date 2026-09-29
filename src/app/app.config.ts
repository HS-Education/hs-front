import {ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, isDevMode} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import {authInterceptor} from './auth/interceptors/auth-interceptor';
import {responseInterceptor} from './shared/interceptors/response.interceptor';
import {UserDataService} from './shared/services/user-data.service';
import {provideTransloco} from '@jsverse/transloco';
import {TranslocoHttpLoader} from './core/i18n/transloco.loader';
import {LanguageService, storedLanguage} from './core/i18n/language.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, responseInterceptor])),
    provideAppInitializer(() => {
      const userDataService = inject(UserDataService);
      void userDataService.restoreSession();
    }),
    provideTransloco({
      config: {
        availableLangs: ['es', 'en'],
        defaultLang: storedLanguage(),
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader
    }),
    provideAppInitializer(() => inject(LanguageService).initialize())
  ]
};
