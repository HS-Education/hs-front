import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  template: `
    <article
      class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
      role="none"
    >
      <header class="mb-3 flex items-center justify-between">
        <div class="flex-1">
          <ng-content select="[card-header]"></ng-content>
        </div>
        <div class="ml-3">
          <ng-content select="[card-meta]"></ng-content>
        </div>
      </header>

      <section class="mb-3 text-sm text-slate-600">
        <ng-content></ng-content>
      </section>

      <footer class="mt-3">
        <ng-content select="[card-actions]"></ng-content>
      </footer>
    </article>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {}
