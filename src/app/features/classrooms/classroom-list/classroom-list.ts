import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ClassroomService} from '../data-access/classroom.service';
import {Classroom} from '../data-access/models/responses/classroom.model';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {UserDataService} from '../../../shared/services/user-data.service';
import {filter, switchMap} from 'rxjs';
import {RouterLink} from '@angular/router';
import {ClassroomCard} from './ui/classroom-card';

@Component({
  selector: 'app-classroom-list',
  imports: [
    RouterLink,
    ClassroomCard
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
            <app-classroom-card [classroom]="classroom"></app-classroom-card>
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
