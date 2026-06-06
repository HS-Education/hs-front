import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  template: `
    <article
      class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm transition-all duration-300 ease-out hover:shadow-md hover:border-[var(--brand-primary)]/30 hover:-translate-y-1 block"
      role="none"
    >
      <header class="mb-4 flex items-start justify-between">
        <div class="flex-1">
          <ng-content select="[card-header]"></ng-content>
        </div>
        <div class="ml-3 shrink-0">
          <ng-content select="[card-meta]"></ng-content>
        </div>
      </header>

      <section class="mb-4 text-sm text-[var(--text-secondary)] leading-relaxed">
        <ng-content></ng-content>
      </section>

      <footer class="mt-4">
        <ng-content select="[card-actions]"></ng-content>
      </footer>
    </article>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {}
