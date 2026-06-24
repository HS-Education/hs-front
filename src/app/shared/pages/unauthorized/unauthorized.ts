import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
      <div class="max-w-md w-full text-center space-y-6 bg-[var(--surface)] p-8 md:p-12 rounded-3xl border border-[var(--border)] shadow-sm">
        
        <div class="mx-auto w-20 h-20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-rose-600 dark:text-rose-500">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div class="space-y-2">
          <h1 class="text-4xl font-black text-[var(--text-primary)]">403</h1>
          <h2 class="text-xl font-bold text-[var(--text-primary)]">Acceso Restringido</h2>
          <p class="text-sm text-[var(--text-secondary)] leading-relaxed">
            No tienes los permisos necesarios para ver el contenido de esta sección. Si crees que esto es un error, contacta a un administrador.
          </p>
        </div>

        <div class="pt-4">
          <a routerLink="/" class="inline-flex items-center justify-center px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)] font-bold text-sm rounded-xl hover:bg-[var(--border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border)] focus:ring-offset-2 w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            Volver al Inicio
          </a>
        </div>
        
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Unauthorized {
}
