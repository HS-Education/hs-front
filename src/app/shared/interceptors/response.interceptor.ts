import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';

export const responseInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    tap((event: HttpEvent<unknown>) => {
      // Solo nos importan las respuestas exitosas
      if (event instanceof HttpResponse) {
        // Revisamos si es un método que modifica datos (POST, PUT, DELETE, PATCH)
        const isModifyingMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase());
        
        // Si es una petición de modificación y trae un mensaje en el cuerpo, lo mostramos
        if (isModifyingMethod && event.body && typeof event.body === 'object' && 'message' in event.body) {
          const bodyWithMsg = event.body as { message: string };
          if (bodyWithMsg.message) {
            toastService.success(bodyWithMsg.message);
          }
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Ignorar 401 y 403, ya que son de seguridad y suelen redirigir al login o ya tienen un flujo definido
      // También ignoramos el 404 para evitar el toast cuando un estudiante no tiene datos de rendimiento aún
      if (error.status !== 401 && error.status !== 403 && error.status !== 404) {
        let errorMsg = 'Ha ocurrido un error inesperado en el servidor.';
        
        // El backend suele devolver la estructura { "message": "..." } vía el GlobalExceptionHandler
        if (error.error && typeof error.error === 'object' && 'message' in error.error) {
          errorMsg = error.error.message;
        } else if (typeof error.error === 'string') {
          errorMsg = error.error;
        }
        
        toastService.error(errorMsg);
      }
      
      return throwError(() => error);
    })
  );
};
