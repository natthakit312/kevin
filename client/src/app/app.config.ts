import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { NgxSpinnerModule } from 'ngx-spinner';
import { loadingInterceptor } from './_interceptors/loading-interceptor';
import { errorInterceptor } from './_interceptors/error-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor, errorInterceptor])),
    importProvidersFrom(NgxSpinnerModule.forRoot())
  ]
};
