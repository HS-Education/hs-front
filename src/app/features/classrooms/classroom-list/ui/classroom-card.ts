import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {Card} from '../../../../../shared/components/card/card';
import {Classroom} from '../../../data-access/models/responses/classroom.model';

@Component({
  selector: 'app-classroom-card',
  imports: [Card],
  template: `
    @if (classroom(); as c) {
      <app-card>
        <div card-header>
          <h3 class="text-lg font-semibold text-slate-900">{{ c.courseName }}</h3>
        </div>

        <div card-meta>
          <span
            class="rounded-full px-3 py-1 text-xs font-medium"
            [class.bg-blue-50]="statusColor() === 'blue'"
            [class.text-blue-700]="statusColor() === 'blue'"
            [class.bg-yellow-50]="statusColor() === 'yellow'"
            [class.text-yellow-700]="statusColor() === 'yellow'"
            [class.bg-gray-100]="statusColor() === 'gray'"
            [class.text-slate-700]="statusColor() === 'gray'"
          >
            {{ c.status }}
          </span>
        </div>

        <section>
          <div class="space-y-1 text-sm text-slate-600">
            <p><span class="font-medium text-slate-800">ID:</span> {{ c.id }}</p>
            <p><span class="font-medium text-slate-800">Course ID:</span> {{ c.courseId }}</p>
            <p><span class="font-medium text-slate-800">Section:</span> {{ sectionName() }}</p>
            <p><span class="font-medium text-slate-800">Academic year:</span> {{ academicYear() }}</p>
          </div>
        </section>

      </app-card>
    } @else {
      <app-card>
        <section class="text-sm text-slate-500">No hay información del aula.</section>
      </app-card>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomCard {
  // input() crea una signal que el padre puede establecer con [classroom]
  readonly classroom = input<Classroom | undefined>();

  // derived values con computed()
  readonly sectionName = computed(() => {
    const c = this.classroom();
    return c?.section?.name ?? '—';
  });

  readonly academicYear = computed(() => {
    const c = this.classroom();
    // academicYearName en el modelo es number según el repo; formateo seguro a string
    return c?.academicYearName != null ? String(c.academicYearName) : '—';
  });

  // ejemplo simple para decidir estilos según estado
  readonly statusColor = computed(() => {
    const s = this.classroom()?.status?.toLowerCase() ?? '';
    if (s.includes('active') || s.includes('activo')) return 'blue';
    if (s.includes('pending') || s.includes('pendiente')) return 'yellow';
    return 'gray';
  });
}
