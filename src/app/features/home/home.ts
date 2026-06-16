import {ChangeDetectionStrategy, Component, inject, OnInit, signal, computed} from '@angular/core';
import {UserDataService} from '../../shared/services/user-data.service';
import {RouterModule} from '@angular/router';
import {ClassroomService} from '../classrooms/data-access/classroom.service';
import {Classroom} from '../classrooms/data-access/models/responses/classroom.model';
import {DatePipe} from '@angular/common';
import {TranslateEnumPipe} from '../../shared/pipes/translate-enum.pipe';

export interface RecentActivity {
  id: number;
  type: 'INSIGHT' | 'DOCUMENT' | 'SYSTEM';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, DatePipe, TranslateEnumPipe],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  protected readonly userDataService = inject(UserDataService);
  private readonly classroomService = inject(ClassroomService);

  readonly userProfile = this.userDataService.userProfile;
  readonly classrooms = signal<Classroom[]>([]);
  readonly loading = signal(true);

  // Computed KPIs
  readonly totalClassrooms = computed(() => this.classrooms().length);
  readonly totalCourses = computed(() => {
    const courseIds = new Set(this.classrooms().map(c => c.courseId));
    return courseIds.size;
  });

  // Mock Recent Activity
  readonly recentActivity = signal<RecentActivity[]>([
    {
      id: 1,
      type: 'INSIGHT',
      title: 'Sery analizó tus aulas',
      description: 'Nuevo insight generado para el aula Matemática Básica.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      icon: 'M13 10V3L4 14h7v7l9-11h-7z'
    },
    {
      id: 2,
      type: 'DOCUMENT',
      title: 'Documento procesado',
      description: 'El archivo "Ejercicios de Geometría.pdf" está listo en el repositorio.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      id: 3,
      type: 'SYSTEM',
      title: 'Actualización de Plataforma',
      description: 'Se activó el modo de lectura de métricas para el trimestre actual.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
    }
  ]);

  ngOnInit() {
    this.loadClassrooms();
  }

  private loadClassrooms() {
    const user = this.userProfile();
    if (!user) {
      this.loading.set(false);
      return;
    }

    this.classroomService.getClassrooms(user.id).subscribe({
      next: (data) => {
        this.classrooms.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
