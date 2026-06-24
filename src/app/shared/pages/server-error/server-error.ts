import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-server-error',
  imports: [],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
      <div class="max-w-md w-full text-center space-y-6 bg-[var(--surface)] p-8 md:p-12 rounded-3xl border border-[var(--border)] shadow-sm">
        
        <div class="mx-auto w-20 h-20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600 dark:text-amber-500">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <path d="M12 9v4"/>
            <path d="M12 17h.01"/>
          </svg>
        </div>

        <div class="space-y-2">
          <h1 class="text-4xl font-black text-[var(--text-primary)]">500</h1>
          <h2 class="text-xl font-bold text-[var(--text-primary)]">Servicio no disponible</h2>
          <p class="text-sm text-[var(--text-secondary)] leading-relaxed">
            Estamos experimentando problemas técnicos o realizando tareas de mantenimiento. Por favor, intenta acceder más tarde.
          </p>
        </div>

        <div class="pt-4">
          <button onclick="window.location.reload()" class="inline-flex items-center justify-center px-6 py-3 bg-[#c2410c] text-white font-bold text-sm rounded-xl hover:bg-[#ea580c] transition-colors focus:outline-none focus:ring-2 focus:ring-[#c2410c] focus:ring-offset-2 w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Reintentar
          </button>
        </div>
        
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerError {
}
