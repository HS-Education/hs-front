import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ClassroomService} from '../data-access/classroom.service';
import {Classroom} from '../data-access/classroom.model';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {UserDataService} from '../../../shared/services/user-data.service';
import {filter, switchMap} from 'rxjs';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-classroom-list',
  imports: [
    RouterLink
  ],
  template: `
    @let classroomList = classrooms();

    @if (classroomList.length > 0) {
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (classroom of classroomList; track classroom.id) {
          <a
            [routerLink]="['/classrooms', classroom.id]"
            [queryParams]="{ courseId: classroom.courseId }"
            class="block"
          >
            <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-sky-300 cursor-pointer">
              <div class="mb-3 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-slate-900">
                  {{ classroom.courseName }}
                </h3>
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {{ classroom.status }}
            </span>
              </div>

              <div class="space-y-1 text-sm text-slate-600">
                <p><span class="font-medium text-slate-800">ID:</span> {{ classroom.id }}</p>
                <p><span class="font-medium text-slate-800">Course ID:</span> {{ classroom.courseId }}</p>
                <p><span class="font-medium text-slate-800">Section name:</span> {{ classroom.section.name }}</p>
                <p><span class="font-medium text-slate-800">Academic year:</span> {{ classroom.academicYearName }}</p>
              </div>
            </article>
          </a>
        }
      </div>
    } @else {
      <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
        No hay aulas disponibles.
      </div>
    }
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomList {
  private readonly classroomService = inject(ClassroomService);
  private readonly userDataService = inject(UserDataService);

  private readonly userProfile$ = toObservable(this.userDataService.userProfile).pipe(
    filter((profile): profile is NonNullable<typeof profile> => profile !== null)
  );

  readonly classrooms = toSignal(
    this.userProfile$.pipe(
      switchMap((profile) => this.classroomService.getClassrooms(profile.id))
    ),
    { initialValue: [] as Classroom[] }
  )
}
