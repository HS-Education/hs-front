import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ClassroomService } from '../data-access/classroom.service';
import { Classroom } from '../data-access/models/responses/classroom.model';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UserDataService } from '../../../shared/services/user-data.service';
import { filter, switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { ClassroomCard } from './ui/classroom-card';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-classroom-list',
  imports: [
    RouterLink,
    ClassroomCard,
    TranslocoPipe
  ],
  template: `
    <div class="p-4 sm:p-6 md:p-10 space-y-8 select-none">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{{ 'CLASSROOMS.LIST.TITLE' | transloco }}</h1>
          <p class="text-sm text-[var(--text-secondary)] mt-1">{{ 'CLASSROOMS.LIST.SUBTITLE' | transloco }}</p>
        </div>
        <!-- Status Legend -->
        <div class="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-secondary)]/40 border border-[var(--border)]/30 rounded-xl px-3 py-2 self-start sm:self-center">
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-[var(--brand-forest)]"></span>
            <span>{{ 'CLASSROOMS.STATUS.ACTIVE' | transloco }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-[var(--brand-mustard)]"></span>
            <span>{{ 'CLASSROOMS.STATUS.INACTIVE' | transloco }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-full bg-[var(--brand-inactive)]"></span>
            <span>{{ 'CLASSROOMS.STATUS.ARCHIVED' | transloco }}</span>
          </div>
        </div>
      </div>

      @let classroomList = classrooms();

      @if (classroomList.length > 0) {
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          @for (classroom of classroomList; track classroom.id) {
            <a
              [routerLink]="['/classrooms', classroom.id]"
              class="block h-full focus:outline-none"
            >
              <app-classroom-card [classroom]="classroom" class="block h-full"></app-classroom-card>
            </a>
          }
        </div>
      } @else {
        <div class="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-secondary)] shadow-sm">
          <svg class="mx-auto h-12 w-12 text-[var(--text-secondary)]/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p class="text-sm font-semibold text-[var(--text-secondary)]">{{ 'CLASSROOMS.LIST.EMPTY' | transloco }}</p>
        </div>
      }
    </div>
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
