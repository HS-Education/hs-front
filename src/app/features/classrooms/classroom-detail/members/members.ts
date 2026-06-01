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

  readonly courseId = input.required<number>();
  readonly members = signal<Member[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.courseId();
      this.loading.set(true);
      this.error.set(null);

      this.classroomService.getClassroomMembers(id).subscribe({
        next: (members) => {
          this.members.set(members);
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
