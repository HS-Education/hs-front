import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CoursesManagementService } from './services/courses-management.service';
import { UserService } from '../users/services/user.service';
import { Area } from './models/area.model';
import { Course } from './models/course.model';
import { Section } from './models/section.model';
import { StudyPlan } from './models/study-plan.model';
import { User } from '../users/models/user.model';
import { ToastService } from '../../../shared/services/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Modal } from '../../../shared/components/modal/modal';
import { FormsModule } from '@angular/forms';

type Tab = 'AREAS_COURSES' | 'SECTIONS' | 'STUDY_PLANS';
import { TranslateEnumPipe } from '../../../shared/pipes/translate-enum.pipe';
import { ConfirmModal } from '../../../shared/components/modal/confirm-modal';

@Component({
  selector: 'app-courses-management',
  standalone: true,
  imports: [Modal, FormsModule, ConfirmModal, TranslateEnumPipe],
  templateUrl: './courses-management.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesManagement implements OnInit {
  private readonly coursesService = inject(CoursesManagementService);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  readonly activeTab = signal<Tab>('AREAS_COURSES');
  readonly isLoading = signal(false);

  // Data Signals
  readonly areas = signal<Area[]>([]);
  readonly selectedArea = signal<Area | null>(null);
  readonly courses = signal<Course[]>([]);
  readonly allCourses = signal<Course[]>([]); // For the Study Plan dropdown
  readonly coordinators = signal<User[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly studyPlans = signal<StudyPlan[]>([]);

  // Modal States
  readonly isAreaModalOpen = signal(false);
  readonly isCourseModalOpen = signal(false);
  readonly isSectionModalOpen = signal(false);
  readonly isStudyPlanModalOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly editingArea = signal<Area | null>(null);
  readonly editingCourse = signal<Course | null>(null);

  // Form Signals
  readonly areaName = signal('');
  readonly areaCoordinatorId = signal<number | null>(null);
  
  readonly courseName = signal('');

  readonly sectionName = signal('');
  readonly sectionEducationLevel = signal('SECONDARY');
  readonly sectionGradeLevel = signal('SECOND');

  // Study Plan filters and form
  readonly studyPlanEducationLevel = signal('SECONDARY');
  readonly studyPlanGradeLevel = signal('SECOND');
  readonly studyPlanCourseId = signal<number | null>(null);

  // Confirm Modal signals
  readonly confirmModalOpen = signal(false);
  readonly confirmModalTitle = signal('');
  readonly confirmModalMessage = signal('');
  readonly confirmAction = signal<() => void>(() => {});

  closeConfirmModal = (): void => this.confirmModalOpen.set(false);

  ngOnInit() {
    this.loadAreas();
    this.loadCoordinators();
  }

  setActiveTab(tab: Tab): void {
    this.activeTab.set(tab);
    if (tab === 'AREAS_COURSES' && this.areas().length === 0) {
      this.loadAreas();
    } else if (tab === 'SECTIONS' && this.sections().length === 0) {
      this.loadSections();
    } else if (tab === 'STUDY_PLANS' && this.studyPlans().length === 0) {
      this.loadStudyPlans();
    }
  }

  loadAreas() {
    this.isLoading.set(true);
    this.coursesService.getAreas().subscribe({
      next: (res) => {
        this.areas.set(res);
        this.isLoading.set(false);
        // If an area is already selected, update it or clear it if it was deleted
        if (this.selectedArea()) {
          const updated = res.find(a => a.id === this.selectedArea()?.id);
          if (updated) {
            this.selectedArea.set(updated);
          } else {
            this.selectedArea.set(null);
            this.courses.set([]);
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.areas.set([]);
        }       }
    });
  }

  loadCoordinators() {
    this.userService.getAllUsers().subscribe({
      next: (res: User[]) => {
        // Filter users who have COORDINATOR or ADMIN role
        const filtered = res.filter((u: User) => u.isActive && (u.roles.includes('COORDINATOR') || u.roles.includes('ADMIN')));
        this.coordinators.set(filtered);
      },
      error: () => {} });
  }

  selectArea(area: Area) {
    this.selectedArea.set(area);
    this.loadCourses(area.id);
  }

  loadCourses(areaId: number) {
    this.coursesService.getCourses(areaId).subscribe({
      next: (res) => this.courses.set(res),
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.courses.set([]);
        }       }
    });
  }

  // --- Area Modal Actions ---
  openAreaModal(area?: Area) {
    if (area) {
      this.editingArea.set(area);
      this.areaName.set(area.name);
      // We don't have coordinatorId in Area model directly, we have coordinatorName.
      // We will match the name to the coordinators array to preselect, or just require re-selection.
      const match = this.coordinators().find(c => c.name === area.coordinatorName);
      this.areaCoordinatorId.set(match ? match.id : null);
    } else {
      this.editingArea.set(null);
      this.areaName.set('');
      this.areaCoordinatorId.set(null);
    }
    this.isAreaModalOpen.set(true);
  }

  closeAreaModal = () => {
    this.isAreaModalOpen.set(false);
  }

  submitArea() {
    if (!this.areaName().trim() || !this.areaCoordinatorId()) return;
    this.isSubmitting.set(true);

    const payload = {
      name: this.areaName().trim(),
      coordinatorId: this.areaCoordinatorId()!
    };

    if (this.editingArea()) {
      this.coursesService.updateArea(this.editingArea()!.id, payload).subscribe({
        next: () => {
          this.toastService.success('Área actualizada');
          this.isSubmitting.set(false);
          this.closeAreaModal();
          this.loadAreas();
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          
        }
      });
    } else {
      this.coursesService.createArea(payload).subscribe({
        next: () => {
          this.toastService.success('Área creada');
          this.isSubmitting.set(false);
          this.closeAreaModal();
          this.loadAreas();
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          
        }
      });
    }
  }

  deleteArea(id: number) {
    this.confirmModalTitle.set('Eliminar Área');
    this.confirmModalMessage.set('¿Estás seguro de eliminar esta área?');
    this.confirmAction.set(() => {
      this.coursesService.deleteArea(id).subscribe({
        next: () => {
          this.toastService.success('Área eliminada');
          this.confirmModalOpen.set(false);
          this.loadAreas();
        },
        error: (err: HttpErrorResponse) => {
          this.confirmModalOpen.set(false);
          
        }
      });
    });
    this.confirmModalOpen.set(true);
  }

  // --- Course Modal Actions ---
  openCourseModal(course?: Course) {
    if (course) {
      this.editingCourse.set(course);
      this.courseName.set(course.name);
    } else {
      this.editingCourse.set(null);
      this.courseName.set('');
    }
    this.isCourseModalOpen.set(true);
  }

  closeCourseModal = () => {
    this.isCourseModalOpen.set(false);
  }

  submitCourse() {
    if (!this.courseName().trim() || !this.selectedArea()) return;
    this.isSubmitting.set(true);

    const payload = {
      name: this.courseName().trim(),
      areaId: this.selectedArea()!.id
    };

    if (this.editingCourse()) {
      this.coursesService.updateCourse(this.editingCourse()!.id, payload).subscribe({
        next: () => {
          this.toastService.success('Curso actualizado');
          this.isSubmitting.set(false);
          this.closeCourseModal();
          this.loadCourses(this.selectedArea()!.id);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          
        }
      });
    } else {
      this.coursesService.createCourse(payload).subscribe({
        next: () => {
          this.toastService.success('Curso creado');
          this.isSubmitting.set(false);
          this.closeCourseModal();
          this.loadCourses(this.selectedArea()!.id);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          
        }
      });
    }
  }

  deleteCourse(id: number) {
    this.confirmModalTitle.set('Eliminar Curso');
    this.confirmModalMessage.set('¿Estás seguro de eliminar este curso?');
    this.confirmAction.set(() => {
      this.coursesService.deleteCourse(id).subscribe({
        next: () => {
          this.toastService.success('Curso eliminado');
          this.confirmModalOpen.set(false);
          if (this.selectedArea()) this.loadCourses(this.selectedArea()!.id);
        },
        error: (err: HttpErrorResponse) => {
          this.confirmModalOpen.set(false);
          
        }
      });
    });
    this.confirmModalOpen.set(true);
  }

  // --- Section Actions ---
  loadSections() {
    this.isLoading.set(true);
    this.coursesService.getSections().subscribe({
      next: (res) => {
        this.sections.set(res);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.sections.set([]);
        }       }
    });
  }

  openSectionModal() {
    this.sectionName.set('');
    this.sectionEducationLevel.set('SECONDARY');
    this.sectionGradeLevel.set('SECOND');
    this.isSectionModalOpen.set(true);
  }

  closeSectionModal = () => {
    this.isSectionModalOpen.set(false);
  }

  submitSection() {
    if (!this.sectionName().trim()) return;
    this.isSubmitting.set(true);

    const payload = {
      name: this.sectionName().trim(),
      educationLevel: this.sectionEducationLevel(),
      gradeLevel: this.sectionGradeLevel()
    };

    this.coursesService.createSection(payload).subscribe({
      next: () => {
        this.toastService.success('Sección registrada exitosamente');
        this.isSubmitting.set(false);
        this.closeSectionModal();
        this.loadSections();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        
      }
    });
  }

  deleteSection(id: number) {
    this.confirmModalTitle.set('Eliminar Sección');
    this.confirmModalMessage.set('¿Estás seguro de eliminar esta sección?');
    this.confirmAction.set(() => {
      this.coursesService.deleteSection(id).subscribe({
        next: () => {
          this.toastService.success('Sección eliminada');
          this.confirmModalOpen.set(false);
          this.loadSections();
        },
        error: (err: HttpErrorResponse) => {
          this.confirmModalOpen.set(false);
          
        }
      });
    });
    this.confirmModalOpen.set(true);
  }

  // --- Study Plans Actions ---
  loadStudyPlans() {
    this.isLoading.set(true);
    this.coursesService.getStudyPlanCourses(this.studyPlanEducationLevel(), this.studyPlanGradeLevel()).subscribe({
      next: (res) => {
        this.studyPlans.set(res);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.studyPlans.set([]);
        }       }
    });
  }

  onStudyPlanFilterChange() {
    this.loadStudyPlans();
  }

  openStudyPlanModal() {
    // Load all courses if not loaded
    if (this.allCourses().length === 0) {
      this.coursesService.getCourses().subscribe({
        next: (res) => this.allCourses.set(res),
        error: (err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.allCourses.set([]);
          }         }
      });
    }
    this.studyPlanCourseId.set(null);
    this.isStudyPlanModalOpen.set(true);
  }

  closeStudyPlanModal = () => {
    this.isStudyPlanModalOpen.set(false);
  }

  submitStudyPlanCourse() {
    if (!this.studyPlanCourseId()) return;
    this.isSubmitting.set(true);

    const payload = {
      educationLevel: this.studyPlanEducationLevel(),
      gradeLevel: this.studyPlanGradeLevel(),
      courseId: this.studyPlanCourseId()!
    };

    this.coursesService.addCourseToStudyPlan(payload).subscribe({
      next: () => {
        this.toastService.success('Curso asignado al plan de estudios');
        this.isSubmitting.set(false);
        this.closeStudyPlanModal();
        this.loadStudyPlans();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        
      }
    });
  }

  removeCourseFromStudyPlan(studyPlanId: number) {
    this.confirmModalTitle.set('Remover Curso');
    this.confirmModalMessage.set('¿Estás seguro de quitar este curso del plan de estudios?');
    this.confirmAction.set(() => {
      this.coursesService.removeCourseFromStudyPlan(studyPlanId).subscribe({
        next: () => {
          this.toastService.success('Curso removido del plan');
          this.confirmModalOpen.set(false);
          this.loadStudyPlans();
        },
        error: (err: HttpErrorResponse) => {
          this.confirmModalOpen.set(false);
          
        }
      });
    });
    this.confirmModalOpen.set(true);
  }
}

