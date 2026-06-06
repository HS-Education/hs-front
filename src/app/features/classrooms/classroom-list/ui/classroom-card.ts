import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {Card} from '../../../../shared/components/card/card';
import {Classroom} from '../../data-access/models/responses/classroom.model';

@Component({
  selector: 'app-classroom-card',
  imports: [Card],
  template: `
    @if (classroom(); as c) {
      <app-card>
        <div card-header class="flex items-start gap-3">
          <!-- Course Initials Emblem -->
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/15 text-[var(--brand-primary)] font-black text-base uppercase">
            {{ c.courseName.slice(0, 1) }}
          </div>
          <div class="space-y-1">
            <h3 class="text-sm font-extrabold text-[var(--text-primary)] leading-snug tracking-tight hover:text-[var(--brand-primary)] transition duration-150">
              {{ c.courseName }}
            </h3>
            <p class="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-wider">Curso Académico</p>
          </div>
        </div>

        <div card-meta>
          <span
            class="inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider"
            [class.bg-[var(--brand-forest)]/10]="statusColor() === 'blue'"
            [class.text-[var(--brand-forest)]]="statusColor() === 'blue'"
            [class.border-[var(--brand-forest)]/20]="statusColor() === 'blue'"
            [class.bg-[var(--brand-mustard)]/10]="statusColor() === 'yellow'"
            [class.text-[var(--brand-mustard)]]="statusColor() === 'yellow'"
            [class.border-[var(--brand-mustard)]/20]="statusColor() === 'yellow'"
            [class.bg-[var(--bg-secondary)]]="statusColor() === 'gray'"
            [class.text-[var(--text-secondary)]]="statusColor() === 'gray'"
            [class.border-[var(--border)]]="statusColor() === 'gray'"
          >
            {{ c.status === 'ACTIVE' || c.status === 'activo' ? 'Activo' : c.status === 'PENDING' ? 'Pendiente' : c.status }}
          </span>
        </div>

        <section class="mt-3">
          <!-- Metadata grid: Section and Period -->
          <div class="grid grid-cols-2 gap-3 text-xs text-[var(--text-secondary)]">
            <div class="flex items-center gap-2 rounded-md bg-[var(--bg-secondary)]/50 border border-[var(--border)]/40 p-2">
              <svg class="h-4 w-4 text-[var(--text-secondary)]/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div class="overflow-hidden">
                <span class="block text-[8px] font-bold text-[var(--text-secondary)]/60 uppercase tracking-wider">Sección</span>
                <span class="font-bold text-[var(--text-primary)] text-xxs truncate block">{{ sectionName() }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2 rounded-md bg-[var(--bg-secondary)]/50 border border-[var(--border)]/40 p-2">
              <svg class="h-4 w-4 text-[var(--text-secondary)]/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div class="overflow-hidden">
                <span class="block text-[8px] font-bold text-[var(--text-secondary)]/60 uppercase tracking-wider">Periodo</span>
                <span class="font-bold text-[var(--text-primary)] text-xxs truncate block">{{ academicYear() }}</span>
              </div>
            </div>
          </div>

          <!-- Subtle bottom identification meta info -->
          <div class="flex items-center justify-between text-[9px] text-[var(--text-secondary)]/40 pt-2.5 border-t border-[var(--border)]/40 mt-3.5">
            <span>Clase: #{{ c.id }}</span>
            <span>Curso: #{{ c.courseId }}</span>
          </div>
        </section>

      </app-card>
    } @else {
      <app-card>
        <section class="text-xs text-[var(--text-secondary)] py-2 text-center">No hay información del aula.</section>
      </app-card>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomCard {

  readonly classroom = input<Classroom | undefined>();

  readonly sectionName = computed(() => {
    const c = this.classroom();
    return c?.section?.name ?? '—';
  });

  readonly academicYear = computed(() => {
    const c = this.classroom();
    return c?.academicYearName != null ? String(c.academicYearName) : '—';
  });

  readonly statusColor = computed(() => {
    const s = this.classroom()?.status?.toLowerCase() ?? '';
    if (s.includes('active') || s.includes('activo')) return 'blue';
    if (s.includes('pending') || s.includes('pendiente')) return 'yellow';
    return 'gray';
  });
}
