import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';

export const responseInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const toastService = inject(ToastService);
  const translocoService = inject(TranslocoService);

  return next(req).pipe(
    tap((event: HttpEvent<unknown>) => {
      // Solo nos importan las respuestas exitosas
      if (event instanceof HttpResponse) {
        // Revisamos si es un método que modifica datos (POST, PUT, DELETE, PATCH)
        const isModifyingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase());
        const isLogoutRequest = /\/auth\/log-out(?:\?|$)/.test(req.url);
        const isRefreshTokenRequest = /\/auth\/refresh-token(?:\?|$)/.test(req.url);
        
        // Si es una petición de modificación y trae un mensaje en el cuerpo, lo mostramos
        if (!isLogoutRequest && !isRefreshTokenRequest && isModifyingMethod && event.body && typeof event.body === 'object' && 'message' in event.body) {
          const bodyWithMsg = event.body as { message: string };
          if (bodyWithMsg.message) {
            toastService.success(translocoService.translate('TOAST.REQUEST_SUCCESS'), true);
          }
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Ignorar 401 y 403, ya que son de seguridad y suelen redirigir al login o ya tienen un flujo definido
      // También ignoramos el 404 para evitar el toast cuando un estudiante no tiene datos de rendimiento aún
      if (error.status !== 401 && error.status !== 403 && error.status !== 404) {
        const isYearGenerationConflict = error.status === 409
          && req.method.toUpperCase() === 'POST'
          && /\/academic-years\/?(?:\?.*)?$/.test(req.url);
        if (isYearGenerationConflict) {
          const serverMessage = typeof error.error?.message === 'string' ? error.error.message : '';
          const year = serverMessage.match(/Academic year '(\d{4})' already exists/i)?.[1]
            ?? String(new Date().getFullYear());
          toastService.error(translocoService.translate('ADMIN.TOAST.YEAR_ALREADY_EXISTS', { year }), true);
          return throwError(() => error);
        }

        let errorMsg = 'Ha ocurrido un error inesperado en el servidor.';
        
        // El backend suele devolver la estructura { "message": "..." } vía el GlobalExceptionHandler
        if (error.error && typeof error.error === 'object' && 'message' in error.error) {
          errorMsg = error.error.message;
        } else if (typeof error.error === 'string') {
          errorMsg = error.error;
        }
        
        void errorMsg;
        toastService.error(translocoService.translate('TOAST.HTTP_ERROR'), true);
      }
      
      return throwError(() => error);
    })
  );
};
