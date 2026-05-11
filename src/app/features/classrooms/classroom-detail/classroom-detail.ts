import {ChangeDetectionStrategy, Component, inject, input, signal} from '@angular/core';
import {Quizzes} from './quizzes/quizzes';
import {Repo} from './repo/repo';
import {Progress} from './progress/progress';
import {Members} from './members/members';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {ActivatedRoute} from '@angular/router';

type ClassroomTab = 'quizzes' | 'repo' | 'progress' | 'members';

@Component({
  selector: 'app-classroom-detail',
  imports: [
    Quizzes,
    Repo,
    Progress,
    Members
  ],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            (click)="setTab(tab.id)"
            class="rounded-t-lg px-4 py-2 text-sm font-medium transition"
            [class.bg-sky-600]="activeTab() === tab.id"
            [class.text-white]="activeTab() === tab.id"
            [class.bg-slate-100]="activeTab() !== tab.id"
            [class.text-slate-700]="activeTab() !== tab.id"
            [class.hover:bg-slate-200]="activeTab() !== tab.id"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        @switch (activeTab()) {
          @case ('quizzes') {
            <app-quizzes />
          }
          @case ('repo') {
            @if (courseId(); as id) {
              <app-repo [courseId]="id" />
            }
          }
          @case ('progress') {
            <app-progress />
          }
          @case ('members') {
            @if (courseId(); as id) {
              <app-members [courseId]="id" />
            }
          }
        }
      </section>
    </div>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomDetail {
  private readonly route = inject(ActivatedRoute);

  readonly courseId = toSignal(
    this.route.queryParams.pipe(
      map((params) => params['courseId'] ? +params['courseId'] : null)
    )
  );
  readonly activeTab = signal<ClassroomTab>('quizzes');

  readonly tabs: Array<{ id: ClassroomTab; label: string }> = [
    { id: 'quizzes', label: 'Cuestionarios' },
    { id: 'repo', label: 'Repositorio' },
    { id: 'progress', label: 'Progreso' },
    { id: 'members', label: 'Miembros' },
  ];

  setTab(tab: ClassroomTab) {
    this.activeTab.set(tab);
  }
}
