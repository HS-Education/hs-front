import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {Quizzes} from './quizzes/quizzes';
import {Repo} from './repo/repo';
import {Progress} from './progress/progress';
import {Members} from './members/members';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map, switchMap} from 'rxjs';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {ClassroomService} from '../data-access/classroom.service';

type ClassroomTab = 'quizzes' | 'repo' | 'progress' | 'members';

@Component({
  selector: 'app-classroom-detail',
  imports: [
    Quizzes,
    Repo,
    Progress,
    Members,
    RouterLink
  ],
  template: `
    <div class="p-4 sm:p-6 md:p-10 space-y-8 select-none">
      <!-- Breadcrumb / Header -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
          <a routerLink="/classrooms" class="hover:text-[var(--text-primary)] transition">Aulas</a>
          <span>/</span>
          <span class="text-[var(--text-primary)]">Detalle de Aula</span>
        </div>
        <h1 class="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Detalle de Aula</h1>
      </div>

      <div class="space-y-6">
        <!-- Tabs Segment Control -->
        <div class="flex border-b border-[var(--border)] overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div class="flex gap-2 min-w-max">
            @for (tab of tabs; track tab.id) {
              <button
                type="button"
                (click)="setTab(tab.id)"
                class="relative px-5 py-3 text-sm font-semibold tracking-tight transition duration-250 focus:outline-none shrink-0"
                [style.border-bottom]="activeTab() === tab.id ? '2px solid var(--brand-primary)' : '2px solid transparent'"
                [class.text-[var(--brand-primary)]]="activeTab() === tab.id"
                [class.text-[var(--text-secondary)]]="activeTab() !== tab.id"
                [class.hover:text-[var(--text-primary)]]="activeTab() !== tab.id"
              >
                {{ tab.label }}
              </button>
            }
          </div>
        </div>

        <!-- Tab Content Card -->
        <section class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          @switch (activeTab()) {
            @case ('quizzes') {
              @if (classroom(); as cls) {
                <app-quizzes [courseId]="cls.courseId" [classroomId]="cls.id" />
              }
            }
            @case ('repo') {
              @if (courseId(); as id) {
                <app-repo [courseId]="id" />
              }
            }
            @case ('progress') {
              @if (classroom(); as cls) {
                <app-progress [classroomId]="cls.id" [courseId]="cls.courseId" [academicYearId]="cls.academicYearId" />
              }
            }
            @case ('members') {
              @if (classroom(); as cls) {
                <app-members [classroomId]="cls.id" />
              }
            }
          }
        </section>
      </div>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly classroomService = inject(ClassroomService);

  readonly classroom = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ? +params.get('id')! : null),
      filter((id): id is number => id !== null),
      switchMap((id) => this.classroomService.getClassroomById(id))
    )
  );

  readonly courseId = computed(() => this.classroom()?.courseId ?? null);
  
  readonly activeTab = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => (params.get('tab') as ClassroomTab) || 'quizzes')
    ),
    { initialValue: 'quizzes' as ClassroomTab }
  );

  readonly tabs: Array<{ id: ClassroomTab; label: string }> = [
    { id: 'quizzes', label: 'Cuestionarios' },
    { id: 'repo', label: 'Repositorio' },
    { id: 'progress', label: 'Progreso' },
    { id: 'members', label: 'Miembros' },
  ];

  setTab(tab: ClassroomTab) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }
}
