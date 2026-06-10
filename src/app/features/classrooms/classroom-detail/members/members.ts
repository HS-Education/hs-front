import {ChangeDetectionStrategy, Component, effect, inject, input, signal} from '@angular/core';
import { ClassroomService } from "../../data-access/classroom.service";
import {Member} from '../../data-access/models/responses/member.model';

@Component({
  selector: 'app-members',
  imports: [],
  templateUrl: './members.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Members {
  private readonly classroomService = inject(ClassroomService);

  readonly classroomId = input.required<number>();
  readonly members = signal<Member[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.classroomId();
      this.loading.set(true);
      this.error.set(null);

      this.classroomService.getClassroomMembers(id).subscribe({
        next: (members) => {
          // Sort: Docente/Teacher first, then by name
          const sorted = [...members].sort((a, b) => {
            const isTeacherA = a.roleInClassroom.toLowerCase() === 'docente' || a.roleInClassroom.toLowerCase() === 'teacher';
            const isTeacherB = b.roleInClassroom.toLowerCase() === 'docente' || b.roleInClassroom.toLowerCase() === 'teacher';
            if (isTeacherA && !isTeacherB) return -1;
            if (!isTeacherA && isTeacherB) return 1;
            return a.userName.localeCompare(b.userName);
          });
          this.members.set(sorted);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set('Error al cargar miembros');
          this.loading.set(false);
          console.error(err);
        },
      });
    });
  }
}
