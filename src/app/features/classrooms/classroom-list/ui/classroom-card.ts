import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {Classroom} from '../../data-access/models/responses/classroom.model';
import {TranslateEnumPipe} from '../../../../shared/pipes/translate-enum.pipe';
import {TranslocoPipe} from '@jsverse/transloco';

@Component({
  selector: 'app-classroom-card',
  imports: [TranslateEnumPipe, TranslocoPipe],
  host: { class: 'block h-full group' },
  template: `
    @if (classroom(); as c) {
      <article class="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-md">
        <header class="flex min-w-0 items-center gap-2 text-[11px] font-medium text-[var(--text-secondary)]">
          <span>{{ academicYear() }}</span>
          @if (c.section.gradeLevel && c.section.educationLevel) {
            <span class="text-[var(--border-strong)]">/</span>
            <span class="truncate">{{ c.section.gradeLevel | translateEnum }} {{ 'CLASSROOMS.CARD.OF' | transloco }} {{ c.section.educationLevel | translateEnum }}</span>
          }
          <span class="text-[var(--border-strong)]">/</span>
          <span class="shrink-0">{{ 'CLASSROOMS.CARD.SECTION' | transloco }} {{ sectionName() }}</span>
          @if (statusColor() !== 'hidden') {
            <span class="ml-auto block h-2 w-2 shrink-0 rounded-full border"
              [class.bg-[var(--brand-forest)]]="statusColor() === 'blue'"
              [class.border-[var(--brand-forest)]/30]="statusColor() === 'blue'"
              [class.bg-[var(--brand-mustard)]]="statusColor() === 'yellow'"
              [class.border-[var(--brand-mustard)]/30]="statusColor() === 'yellow'"
              [title]="c.status === 'ACTIVE' || c.status === 'activo' ? ('CLASSROOMS.STATUS.ACTIVE' | transloco) : ('CLASSROOMS.STATUS.INACTIVE' | transloco)"></span>
          }
        </header>

        <section class="mt-4 min-w-0">
          @if (c.areaName) {
            <p class="truncate text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--brand-primary)]/85">{{ c.areaName }}</p>
          }
          <h3 class="mt-1 line-clamp-2 text-lg font-bold leading-tight tracking-tight text-[var(--text-primary)]">
            {{ c.courseName }}
          </h3>
        </section>

        <footer class="mt-5 flex min-w-0 items-center gap-3 border-t border-[var(--border)] pt-3.5">
          <span class="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-secondary)]">{{ c.teacherName ? ('CLASSROOMS.CARD.TEACHER' | transloco: { name: c.teacherName }) : ('CLASSROOMS.CARD.NO_TEACHER' | transloco) }}</span>
          <svg class="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </footer>
      </article>
    } @else {
      <article class="h-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <section class="py-2 text-center text-xs text-[var(--text-secondary)]">{{ 'CLASSROOMS.CARD.NO_INFO' | transloco }}</section>
      </article>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomCard {
  readonly classroom = input<Classroom | undefined>();

  readonly sectionName = computed(() => this.classroom()?.section?.name ?? '—');

  readonly academicYear = computed(() => {
    const classroom = this.classroom();
    return classroom?.academicYearName != null ? String(classroom.academicYearName) : '—';
  });

  readonly statusColor = computed(() => {
    const status = this.classroom()?.status?.toLowerCase() ?? '';
    if (status === 'active' || status === 'activo') return 'blue';
    if (status === 'inactive' || status === 'inactivo') return 'yellow';
    return 'hidden';
  });
}
