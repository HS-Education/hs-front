import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassroomsService } from './services/classrooms.service';
import { AcademicYearService } from '../academic-years/services/academic-year.service';
import { UserService } from '../users/services/user.service';
import { Classroom } from './models/classroom.model';
import { Enrollment } from './models/enrollment.model';
import { User } from '../users/models/user.model';
import { AcademicYear } from '../academic-years/models/academic-year.model';
import { ToastService } from '../../../shared/services/toast.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmModal } from '../../../shared/components/modal/confirm-modal';
import { TranslateEnumPipe } from '../../../shared/pipes/translate-enum.pipe';

@Component({
  selector: 'app-classrooms-management',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, ConfirmModal, TranslateEnumPipe],
  templateUrl: './classrooms-management.html',
  host: {
    class: 'block h-full'
  }
})
export class ClassroomsManagement implements OnInit {
  private readonly classroomsService = inject(ClassroomsService);
  private readonly academicYearService = inject(AcademicYearService);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);

  // Data signals
  readonly classrooms = signal<Classroom[]>([]);
  readonly activeAcademicYear = signal<AcademicYear | null>(null);
  readonly teachers = signal<User[]>([]);
  readonly students = signal<User[]>([]);
  readonly availableStudents = signal<User[]>([]);
  
  // Filters
  readonly filterCourseName = signal('');
  readonly filterEducationLevel = signal('');
  readonly filterGradeLevel = signal('');
  readonly filterStatus = signal('');
  
  // Specific data for modals
  readonly classroomStudents = signal<Enrollment[]>([]);
  readonly selectedClassroomId = signal<number | null>(null);
  readonly selectedTeacherId = signal<number | null>(null);
  readonly selectedClassroomForEnrollment = signal<Classroom | null>(null);
  readonly selectedStudentIds = signal<number[]>([]);
  readonly classroomTeachers = signal<Record<number, {id: number, name: string}>>({});

  // Modals state
  readonly isGenerateModalOpen = signal(false);
  readonly isAssignModalOpen = signal(false);
  readonly isStudentsModalOpen = signal(false);
  readonly isEnrollStudentsModalOpen = signal(false);

  // Confirm Modal signals
  readonly confirmModalOpen = signal(false);
  readonly confirmModalTitle = signal('');
  readonly confirmModalMessage = signal('');
  readonly confirmAction = signal<() => void>(() => {});

  closeConfirmModal = (): void => this.confirmModalOpen.set(false);

  // Computed state
  readonly isPlanning = computed(() => this.activeAcademicYear()?.status === 'PLANNED');

  readonly filteredClassrooms = computed(() => {
    let result = this.classrooms();
    const courseName = this.filterCourseName().toLowerCase();
    const edLevel = this.filterEducationLevel();
    const gradeLevel = this.filterGradeLevel();
    const status = this.filterStatus();

    if (courseName) {
      result = result.filter(c => c.courseName.toLowerCase().includes(courseName));
    }
    if (edLevel) {
      result = result.filter(c => c.section.educationLevel === edLevel);
    }
    if (gradeLevel) {
      result = result.filter(c => c.section.gradeLevel === gradeLevel);
    }
    if (status) {
      result = result.filter(c => c.status === status);
    }
    return result;
  });

  clearFilters() {
    this.filterCourseName.set('');
    this.filterEducationLevel.set('');
    this.filterGradeLevel.set('');
    this.filterStatus.set('');
  }

  ngOnInit() {
    this.loadActiveAcademicYear();
    this.loadClassrooms();
  }

  loadActiveAcademicYear() {
    this.academicYearService.getAllAcademicYears().subscribe({
      next: (years) => {
        // Find the active or planning one (the system normally has 1)
        const current = years.find(y => y.status === 'PLANNED' || y.status === 'ACTIVE');
        if (current) this.activeAcademicYear.set(current);
      },
      error: () => {} });
  }

  loadClassrooms() {
    this.isLoading.set(true);
    this.classroomsService.getAllClassrooms().subscribe({
      next: (res) => {
        this.classrooms.set(res);
        this.isLoading.set(false);
        this.loadClassroomTeachers(res);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 404) {
          this.classrooms.set([]);
        }       }
    });
  }

  loadClassroomTeachers(classrooms: Classroom[]) {
    // For each classroom, fetch members and find the teacher
    classrooms.forEach(c => {
      this.classroomsService.getClassroomMembers(c.id).subscribe({
        next: (members) => {
          const teacher = members.find(m => m.roleInClassroom === 'TEACHER');
          if (teacher) {
            this.classroomTeachers.update(map => ({...map, [c.id]: {id: teacher.userId, name: teacher.userName}}));
          }
        }
      });
    });
  }

  loadTeachers() {
    if (this.teachers().length > 0) return;
    this.userService.getAllUsers().subscribe({
      next: (users: User[]) => {
        const onlyTeachers = users.filter((u: User) => u.roles.includes('TEACHER'));
        this.teachers.set(onlyTeachers);
      },
      error: () => {} });
  }

  loadStudents() {
    if (this.students().length > 0) return;
    return this.userService.getAllUsers().subscribe({
      next: (users: User[]) => {
        const onlyStudents = users.filter((u: User) => u.roles.includes('STUDENT'));
        this.students.set(onlyStudents);
      },
      error: () => {} });
  }

  // --- Generate Classrooms ---
  openGenerateModal() {
    if (!this.isPlanning()) {
      
      return;
    }
    this.isGenerateModalOpen.set(true);
  }

  closeGenerateModal = () => {
    this.isGenerateModalOpen.set(false);
  }

  confirmGenerateClassrooms() {
    this.isSubmitting.set(true);
    this.classroomsService.generateAllClassrooms().subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeGenerateModal();
        this.loadClassrooms();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        
        this.closeGenerateModal();
      }
    });
  }

  // --- Assign Teacher ---
  openAssignModal(classroomId: number) {
    this.selectedClassroomId.set(classroomId);
    this.selectedTeacherId.set(null);
    this.loadTeachers();
    this.isAssignModalOpen.set(true);
  }

  closeAssignModal = () => {
    this.isAssignModalOpen.set(false);
  }

  submitAssignTeacher() {
    if (!this.selectedTeacherId() || !this.selectedClassroomId()) return;
    this.isSubmitting.set(true);

    const payload = {
      teacherId: this.selectedTeacherId()!,
      classroomIds: [this.selectedClassroomId()!]
    };

    this.classroomsService.assignTeacher(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeAssignModal();
        this.loadClassrooms(); // Reload to reflect changes if applicable
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        
      }
    });
  }

  // --- View Students ---
  openStudentsModal(classroomId: number) {
    this.selectedClassroomId.set(classroomId);
    this.classroomStudents.set([]); // clear previous
    this.isStudentsModalOpen.set(true);
    
    this.classroomsService.getClassroomMembers(classroomId).subscribe({
      next: (members) => {
        const students = members.filter(m => m.roleInClassroom === 'STUDENT');
        this.classroomStudents.set(students);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status !== 404) {
          
        }
      }
    });
  }

  closeStudentsModal = () => {
    this.isStudentsModalOpen.set(false);
  }

  // --- Enroll Students ---
  openEnrollStudentsModal(classroom: Classroom) {
    this.selectedClassroomForEnrollment.set(classroom);
    this.selectedStudentIds.set([]);
    this.availableStudents.set([]); // Clear previous
    this.isEnrollStudentsModalOpen.set(true);

    if (this.students().length === 0) {
      this.userService.getAllUsers().subscribe({
        next: (users: User[]) => {
          const onlyStudents = users.filter((u: User) => u.roles.includes('STUDENT'));
          this.students.set(onlyStudents);
          this.filterAvailableStudents(classroom.id);
        },
        error: () => {} });
    } else {
      this.filterAvailableStudents(classroom.id);
    }
  }

  private filterAvailableStudents(classroomId: number) {
    this.classroomsService.getClassroomMembers(classroomId).subscribe({
      next: (members) => {
        const enrolledStudentIds = members
          .filter(m => m.roleInClassroom === 'STUDENT')
          .map(m => m.userId);
        
        const available = this.students().filter(s => !enrolledStudentIds.includes(s.id));
        this.availableStudents.set(available);
      }
    });
  }

  closeEnrollStudentsModal = () => {
    this.isEnrollStudentsModalOpen.set(false);
  }

  toggleStudentSelection(studentId: number) {
    const current = this.selectedStudentIds();
    if (current.includes(studentId)) {
      this.selectedStudentIds.set(current.filter(id => id !== studentId));
    } else {
      this.selectedStudentIds.set([...current, studentId]);
    }
  }

  submitEnrollStudents() {
    const classroom = this.selectedClassroomForEnrollment();
    const students = this.selectedStudentIds();
    if (!classroom || students.length === 0) return;

    this.isSubmitting.set(true);

    const payload = {
      studentIds: students,
      educationLevel: classroom.section.educationLevel,
      gradeLevel: classroom.section.gradeLevel,
      academicYearId: classroom.academicYearId
    };

    this.classroomsService.enrollStudents(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeEnrollStudentsModal();
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        
      }
    });
  }

  // --- Delete Classroom ---
  deleteClassroom(id: number) {
    this.confirmModalTitle.set('Eliminar Aula');
    this.confirmModalMessage.set('¿Estás seguro de eliminar esta aula? Se perderán las asignaciones y matrículas.');
    this.confirmAction.set(() => {
      this.classroomsService.deleteClassroom(id).subscribe({
        next: () => {
          this.toastService.success('Aula eliminada exitosamente');
          this.confirmModalOpen.set(false);
          this.loadClassrooms();
        },
        error: (err: HttpErrorResponse) => {
          this.confirmModalOpen.set(false);
          
        }
      });
    });
    this.confirmModalOpen.set(true);
  }

  // --- Unassign / Unenroll ---
  unassignTeacher(classroomId: number) {
    const teacher = this.classroomTeachers()[classroomId];
    if (!teacher) return;
    
    this.confirmModalTitle.set('Desvincular Profesor');
    this.confirmModalMessage.set(`¿Estás seguro de desvincular al profesor ${teacher.name} de esta aula?`);
    this.confirmAction.set(() => {
      this.classroomsService.unassignTeacher({
        teacherId: teacher.id,
        classroomIds: [classroomId]
      }).subscribe({
        next: (res) => {
          this.confirmModalOpen.set(false);
          this.classroomTeachers.update(map => {
            const newMap = { ...map };
            delete newMap[classroomId];
            return newMap;
          });
          this.loadClassrooms(); // Refresh all
        },
        error: (err: HttpErrorResponse) => {
          this.confirmModalOpen.set(false);
          
        }
      });
    });
    this.confirmModalOpen.set(true);
  }

  unenrollStudent(studentId: number, studentName: string) {
    const classroomId = this.selectedClassroomId();
    if (!classroomId) return;
    
    this.confirmModalTitle.set('Desvincular Alumno');
    this.confirmModalMessage.set(`¿Estás seguro de desvincular al alumno ${studentName}?`);
    this.confirmAction.set(() => {
      this.classroomsService.unenrollStudent({
        userId: studentId,
        classroomIds: [classroomId]
      }).subscribe({
        next: (res) => {
          this.confirmModalOpen.set(false);
          // Reload students for this modal
          this.classroomsService.getClassroomMembers(classroomId).subscribe({
            next: (members) => {
              const students = members.filter(m => m.roleInClassroom === 'STUDENT');
              this.classroomStudents.set(students);
            }
          });
        },
        error: (err: HttpErrorResponse) => {
          this.confirmModalOpen.set(false);
          
        }
      });
    });
    this.confirmModalOpen.set(true);
  }
}

