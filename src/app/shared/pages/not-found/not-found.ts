import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [TranslocoPipe, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
      <div class="max-w-md w-full text-center space-y-6 bg-[var(--surface)] p-8 md:p-12 rounded-3xl border border-[var(--border)] shadow-sm">
        
        <div class="mx-auto w-20 h-20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--text-secondary)]">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="m9 15 6-6"/>
            <path d="m15 15-6-6"/>
          </svg>
        </div>

        <div class="space-y-2">
          <h1 class="text-4xl font-black text-[var(--text-primary)]">404</h1>
          <h2 class="text-xl font-bold text-[var(--text-primary)]">{{ 'UI_TEXT.PAGE_NOT_FOUND' | transloco }}</h2>
          <p class="text-sm text-[var(--text-secondary)] leading-relaxed">
            {{ 'UI_TEXT.THE_PAGE_OR_RESOURCE_YOU_ARE_LOOKING_FOR' | transloco }}
          </p>
        </div>

        <div class="pt-4">
          <a routerLink="/" class="inline-flex items-center justify-center px-6 py-3 bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] font-bold text-sm rounded-xl hover:bg-[var(--button-primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 w-full sm:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
              <path d="m12 19-7-7 7-7"/>
              <path d="M19 12H5"/>
            </svg>
            {{ 'UI_TEXT.BACK_TO_HOME' | transloco }}
          </a>
        </div>
        
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {
}
