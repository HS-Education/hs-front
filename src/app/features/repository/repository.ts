import {ChangeDetectionStrategy, Component, computed, inject, OnInit, signal} from '@angular/core';
import {ClassroomService} from '../classrooms/data-access/classroom.service';
import {UserDataService} from '../../shared/services/user-data.service';
import {Classroom} from '../classrooms/data-access/models/responses/classroom.model';
import {Topic} from '../classrooms/data-access/models/responses/topic.model';
import {Document} from '../classrooms/data-access/models/responses/document.model';
import {forkJoin, map, switchMap} from 'rxjs';
import {FormsModule} from '@angular/forms';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {Modal} from '../../shared/components/modal/modal';
import {ConfirmModal} from '../../shared/components/modal/confirm-modal';
import {TranslateEnumPipe} from '../../shared/pipes/translate-enum.pipe';
import {BIMESTER_OPTIONS, EDUCATION_LEVEL_OPTIONS, GRADE_LEVEL_OPTIONS} from '../../shared/models/academic-levels.model';
import {TranslocoPipe, TranslocoService} from '@jsverse/transloco';
import {StyledSelectDirective} from '../../shared/directives/styled-select.directive';

interface GradingPeriodResource {
  id: number;
  bimester: string;
}

interface UploadFileMetadata {
  file: File;
  title: string;
  topicId: number;
  educationLevel: string;
  gradeLevels: string[];
}

@Component({
  selector: 'app-repository',
  imports: [Modal, ConfirmModal, FormsModule, TranslateEnumPipe, TranslocoPipe, StyledSelectDirective],
  templateUrl: './repository.html',
  styleUrl: './repository.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Repository implements OnInit {
  private readonly translocoService = inject(TranslocoService);
  private readonly classroomService = inject(ClassroomService);
  protected readonly userDataService = inject(UserDataService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly bimesterOptions = BIMESTER_OPTIONS;
  readonly educationLevelOptions = EDUCATION_LEVEL_OPTIONS;
  readonly gradeLevelOptions = GRADE_LEVEL_OPTIONS;

  readonly selectedCourseId = signal<number | null>(null);
  readonly classrooms = signal<Classroom[]>([]);
  readonly topics = signal<Topic[]>([]);
  readonly documents = signal<Document[]>([]);
  readonly gradingPeriods = signal<GradingPeriodResource[]>([]);

  readonly loadingClassrooms = signal(true);
  readonly loadingContent = signal(false);
  readonly downloadingId = signal<number | null>(null);

  readonly coordinatorArea = signal<string | null>(null);
  readonly coordinatorAreaId = signal<number | null>(null);

  // Preview Signals
  readonly previewDocumentTitle = signal<string>('');
  readonly previewSecureUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal<boolean>(false);

  // Computes reactively if the selected classroom academic year status is PLANNED
  readonly isAcademicYearPlanned = computed(() => {
    const courseId = this.selectedCourseId();
    if (!courseId) return false;
    const classroom = this.classrooms().find((c) => c.courseId === courseId);
    if (!classroom) return false;
    return classroom.academicYearStatus === 'PLANNED';
  });

  // Modals signals
  readonly isTopicModalOpen = signal(false);
  readonly newTopicName = signal('');
  readonly newTopicGradingPeriodId = signal<number | null>(null);

  readonly isUploadModalOpen = signal(false);
  readonly uploadBimester = signal<string>('');
  readonly selectedFiles = signal<UploadFileMetadata[]>([]);
  readonly isUploading = signal(false);

  readonly isEditModalOpen = signal(false);
  readonly editDocumentId = signal<number | null>(null);
  readonly editTitle = signal('');
  readonly editTopicId = signal<number | null>(null);
  readonly editEducationLevel = signal<string>('SECONDARY');
  readonly editGradeLevels = signal<string[]>(['SECOND']);
  readonly editFile = signal<File | null>(null);
  readonly isSavingEdit = signal(false);

  // Confirm Modal signals
  readonly confirmModalOpen = signal(false);
  readonly confirmModalTitle = signal('');
  readonly confirmModalMessage = signal('');
  readonly confirmAction = signal<() => void>(() => {});

  closeConfirmModal = (): void => this.confirmModalOpen.set(false);

  // Computes unique courses from user's classrooms
  readonly courses = computed(() => {
    const list = this.classrooms();
    const unique: Array<{ id: number; name: string }> = [];
    const seen = new Set<number>();
    for (const c of list) {
      if (!seen.has(c.courseId)) {
        seen.add(c.courseId);
        unique.push({ id: c.courseId, name: c.courseName });
      }
    }
    return unique;
  });

  // Filters topics belonging to the selected upload bimester
  readonly topicsForBimester = computed(() => {
    const bimester = this.uploadBimester();
    const period = this.gradingPeriods().find((gp) => gp.bimester === bimester);
    if (!period) return [];
    return this.topics().filter((t) => t.gradingPeriodId === period.id);
  });

  ngOnInit(): void {
    const user = this.userDataService.userProfile();
    if (user) {
      this.classroomService.getClassrooms(user.id).subscribe({
        next: (list) => {
          this.classrooms.set(list);
          this.loadingClassrooms.set(false);
          if (list.length > 0) {
            this.selectCourse(list[0].courseId);
          }
        },
        error: (err: unknown) => {
          console.error('Error al cargar aulas:', err);
          this.loadingClassrooms.set(false);
        }
      });

      this.classroomService.getAreas().subscribe({
        next: (areas) => {
          const matchingArea = areas.find(a => a.coordinatorName === user.name);
          if (matchingArea) {
            this.coordinatorArea.set(matchingArea.name);
            this.coordinatorAreaId.set(matchingArea.id);
          }
        },
        error: (err: unknown) => {
          console.error('Error al cargar áreas:', err);
        }
      });
    }
  }

  selectCourse(courseId: number): void {
    this.selectedCourseId.set(courseId);
    this.fetchCourseContent(courseId);
  }

  onCourseChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.selectCourse(Number(select.value));
    }
  }

  fetchCourseContent(courseId: number): void {
    this.loadingContent.set(true);
    const classroom = this.classrooms().find((c) => c.courseId === courseId);
    if (!classroom) {
      this.loadingContent.set(false);
      return;
    }

    forkJoin({
      topics: this.classroomService.getClassroomTopics(courseId),
      documents: this.classroomService.getClassroomDocuments(courseId),
      periods: this.classroomService.getGradingPeriods(classroom.academicYearId)
    }).subscribe({
      next: ({ topics, documents, periods }) => {
        this.topics.set(topics.sort((a, b) => a.orderIndex - b.orderIndex));
        this.documents.set(documents);
        
        if (periods && periods.length > 0) {
          this.gradingPeriods.set(this.sortGradingPeriods(periods));
        } else {
          this.useDefaultGradingPeriods();
        }
        this.loadingContent.set(false);
      },
      error: (err: unknown) => {
        console.error('Error al cargar contenido del curso:', err);
        this.useDefaultGradingPeriods();
        this.loadingContent.set(false);
      }
    });
  }

  useDefaultGradingPeriods(): void {
    this.gradingPeriods.set([
      { id: 1, bimester: 'BIMESTER_1' },
      { id: 2, bimester: 'BIMESTER_2' },
      { id: 3, bimester: 'BIMESTER_3' },
      { id: 4, bimester: 'BIMESTER_4' }
    ]);
  }

  private sortGradingPeriods(periods: GradingPeriodResource[]): GradingPeriodResource[] {
    const order = (value: string): number => {
      const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      const configuredIndex = BIMESTER_OPTIONS.findIndex(option => option.value === normalized);
      if (configuredIndex >= 0) return configuredIndex + 1;

      const numericOrder = normalized.match(/\d+/)?.[0];
      if (numericOrder) return Number(numericOrder);

      const ordinalNames = ['FIRST|PRIMER|PRIMERO', 'SECOND|SEGUNDO', 'THIRD|TERCER|TERCERO', 'FOURTH|CUARTO'];
      const ordinalIndex = ordinalNames.findIndex(names => new RegExp(`\\b(${names})\\b`).test(normalized));
      return ordinalIndex >= 0 ? ordinalIndex + 1 : Number.MAX_SAFE_INTEGER;
    };

    return [...periods].sort((a, b) => order(a.bimester) - order(b.bimester) || a.id - b.id);
  }

  getTopicBimester(gradingPeriodId: number): string {
    const period = this.gradingPeriods().find(gp => gp.id === gradingPeriodId);
    return period ? period.bimester : '';
  }

  getDocsForTopic(topicId: number): Document[] {
    return this.documents().filter((doc) => doc.topicId === topicId);
  }

  downloadDocument(documentId: number, documentTitle: string): void {
    const courseId = this.selectedCourseId();
    if (!courseId) return;

    this.downloadingId.set(documentId);
    this.classroomService.getDocumentDownloadUrl(courseId, documentId).subscribe({
      next: (response) => {
        const link = document.createElement('a');
        link.href = response.url;
        link.download = documentTitle;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.downloadingId.set(null);
      },
      error: (err) => {
        console.error('Error getting document download URL:', err);
        this.downloadingId.set(null);
      }
    });
  }

  previewDocument(documentId: number, name: string): void {
    const courseId = this.selectedCourseId();
    if (!courseId) return;

    this.previewDocumentTitle.set(name);
    this.previewSecureUrl.set(null);
    this.previewLoading.set(true);

    this.classroomService.getDocumentDownloadUrl(courseId, documentId).subscribe({
      next: (response) => {
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.url);
        this.previewSecureUrl.set(safeUrl);
        this.previewLoading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener URL de previsualización:', err);
        this.previewLoading.set(false);
        alert(this.translocoService.translate('UI_TEXT.UNABLE_TO_LOAD_THE_DOCUMENT_PREVIEW'));
      }
    });
  }

  closePreview(): void {
    this.previewSecureUrl.set(null);
    this.previewDocumentTitle.set('');
  }

  deleteDoc(documentId: number): void {
    const courseId = this.selectedCourseId();
    if (!courseId) return;

    this.confirmModalTitle.set('Eliminar Documento');
    this.confirmModalMessage.set(this.translocoService.translate('UI_TEXT.ARE_YOU_SURE_YOU_WANT_TO_DELETE_THIS'));
    this.confirmAction.set(() => {
      this.classroomService.deleteDocument(courseId, documentId).subscribe({
        next: () => {
          this.confirmModalOpen.set(false);
          this.fetchCourseContent(courseId);
        },
        error: (err: unknown) => {
          console.error('Error al borrar documento:', err);
          this.confirmModalOpen.set(false);
        }
      });
    });
    this.confirmModalOpen.set(true);
  }

  reorderTopic(index: number, direction: 'up' | 'down'): void {
    const courseId = this.selectedCourseId();
    if (!courseId) return;

    const topicsList = [...this.topics()];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= topicsList.length) return;

    // Swap their order indexes
    const tempIndex = topicsList[index].orderIndex;
    topicsList[index].orderIndex = topicsList[targetIndex].orderIndex;
    topicsList[targetIndex].orderIndex = tempIndex;

    // Swap positions in the array
    const tempTopic = topicsList[index];
    topicsList[index] = topicsList[targetIndex];
    topicsList[targetIndex] = tempTopic;

    // Build Payload for Backend API
    const payload = topicsList.map((t) => ({
      topicId: t.id,
      gradingPeriodId: t.gradingPeriodId,
      orderIndex: t.orderIndex
    }));

    this.classroomService.reorderTopics(courseId, payload).subscribe({
      next: () => {
        this.topics.set(topicsList);
      },
      error: (err: unknown) => {
        console.error('Error al reordenar topics:', err);
        this.fetchCourseContent(courseId);
      }
    });
  }

  // Topic Addition/Deletion (using arrow functions to preserve lexical this context)
  openTopicModal = (): void => {
    const periods = this.gradingPeriods();
    if (periods.length > 0) {
      this.newTopicGradingPeriodId.set(periods[0].id);
    }
    this.newTopicName.set('');
    this.isTopicModalOpen.set(true);
  }

  closeTopicModal = (): void => {
    this.isTopicModalOpen.set(false);
  }

  addTopic = (): void => {
    const courseId = this.selectedCourseId();
    const name = this.newTopicName().trim();
    const periodId = this.newTopicGradingPeriodId();

    if (!courseId || !name || !periodId) return;

    this.classroomService.addTopic(courseId, name, periodId).subscribe({
      next: () => {
        this.closeTopicModal();
        this.fetchCourseContent(courseId);
      },
      error: (err: unknown) => {
        console.error('Error al agregar tema:', err);
      }
    });
  }

  deleteTopic(topicId: number): void {
    const courseId = this.selectedCourseId();
    if (!courseId) return;

    this.confirmModalTitle.set('Eliminar Tema');
    this.confirmModalMessage.set(this.translocoService.translate('UI_TEXT.ARE_YOU_SURE_YOU_WANT_TO_DELETE_THIS_77'));
    this.confirmAction.set(() => {
      this.classroomService.deleteTopic(courseId, topicId).subscribe({
        next: () => {
          this.confirmModalOpen.set(false);
          this.fetchCourseContent(courseId);
        },
        error: (err: unknown) => {
          console.error('Error al eliminar tema:', err);
          this.confirmModalOpen.set(false);
        }
      });
    });
    this.confirmModalOpen.set(true);
  }

  // Bulk Upload (Multiple Files)
  openUploadModal = (): void => {
    const periods = this.gradingPeriods();
    if (periods.length > 0) {
      this.uploadBimester.set(periods[0].bimester);
    }
    this.selectedFiles.set([]);
    this.isUploadModalOpen.set(true);
  }

  closeUploadModal = (): void => {
    this.isUploadModalOpen.set(false);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    const topicsForSelectedBimester = this.topicsForBimester();
    const defaultTopicId = topicsForSelectedBimester[0]?.id ?? 0;

    const newFiles: UploadFileMetadata[] = files.map((file) => {
      const title = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      return {
        file,
        title,
        topicId: defaultTopicId,
        educationLevel: 'SECONDARY',
        gradeLevels: ['SECOND']
      };
    });

    this.selectedFiles.update((current) => [...current, ...newFiles]);
    input.value = '';
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.update((current) => current.filter((_, i) => i !== index));
  }

  moveFile(index: number, direction: 'up' | 'down'): void {
    this.selectedFiles.update((current) => {
      const updated = [...current];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return current;

      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  }

  updateFileMetadata(index: number, field: 'title' | 'topicId' | 'educationLevel' | 'gradeLevels', value: string | number | string[]): void {
    this.selectedFiles.update((current) => {
      const updated = [...current];
      if (field === 'title') {
        updated[index] = { ...updated[index], title: value as string };
      } else if (field === 'topicId') {
        updated[index] = { ...updated[index], topicId: value as number };
      } else if (field === 'educationLevel') {
        updated[index] = { ...updated[index], educationLevel: value as string };
      } else if (field === 'gradeLevels') {
        updated[index] = { ...updated[index], gradeLevels: value as string[] };
      }
      return updated;
    });
  }

  toggleFileGradeLevel(index: number, grade: string): void {
    const currentGrades = this.selectedFiles()[index].gradeLevels;
    const newGrades = currentGrades.includes(grade)
      ? currentGrades.filter(g => g !== grade)
      : [...currentGrades, grade];
    
    if (newGrades.length > 0) {
      this.updateFileMetadata(index, 'gradeLevels', newGrades);
    }
  }

  uploadBulk = (): void => {
    const courseId = this.selectedCourseId();
    const bimester = this.uploadBimester();
    const filesMetadata = this.selectedFiles();

    if (!courseId || !bimester || filesMetadata.length === 0) return;

    this.isUploading.set(true);

    const documentsPayload = filesMetadata.map((fm) => ({
      fileName: fm.file.name,
      title: fm.title,
      topicId: fm.topicId,
      educationLevel: fm.educationLevel,
      gradeLevels: fm.gradeLevels
    }));

    const files = filesMetadata.map((fm) => fm.file);

    this.classroomService.uploadBulkDocuments(courseId, bimester, documentsPayload, files).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.closeUploadModal();
        this.fetchCourseContent(courseId);
      },
      error: (err: unknown) => {
        console.error('Error al subir archivos:', err);
        this.isUploading.set(false);
      }
    });
  }

  // Document Editing
  openEditModal(doc: Document): void {
    this.editDocumentId.set(doc.id);
    this.editTitle.set(doc.title);
    this.editTopicId.set(doc.topicId);
    this.editFile.set(null);
    this.editEducationLevel.set('SECONDARY');
    this.editGradeLevels.set(['SECOND']);
    this.isEditModalOpen.set(true);
  }

  closeEditModal = (): void => {
    this.isEditModalOpen.set(false);
  }

  onEditFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.editFile.set(input.files[0]);
    }
  }

  toggleEditGradeLevel(grade: string): void {
    this.editGradeLevels.update((current) => {
      const newGrades = current.includes(grade)
        ? current.filter(g => g !== grade)
        : [...current, grade];
      return newGrades.length > 0 ? newGrades : current;
    });
  }

  saveEdit = (): void => {
    const courseId = this.selectedCourseId();
    const docId = this.editDocumentId();
    const title = this.editTitle().trim();
    const topicId = this.editTopicId();
    const educationLevel = this.editEducationLevel();
    const gradeLevels = this.editGradeLevels();

    if (!courseId || !docId || !title || !topicId) return;

    this.isSavingEdit.set(true);

    const topic = this.topics().find((t) => t.id === topicId);
    if (!topic) {
      this.isSavingEdit.set(false);
      return;
    }

    const period = this.gradingPeriods().find((gp) => gp.id === topic.gradingPeriodId);
    if (!period) {
      this.isSavingEdit.set(false);
      return;
    }

    const originalDoc = this.documents().find(d => d.id === docId);
    if (!originalDoc) {
      this.isSavingEdit.set(false);
      return;
    }

    let fileObs$;
    if (this.editFile()) {
      fileObs$ = forkJoin({
        file: Promise.resolve(this.editFile()!)
      });
    } else {
      fileObs$ = this.classroomService.getDocumentDownloadUrl(courseId, docId).pipe(
        switchMap((response) => 
          fetch(response.url).then(res => res.blob()).then(blob => 
            new File([blob], originalDoc.originalFileName, { type: 'application/pdf' })
          )
        ),
        map(file => ({ file }))
      );
    }

    fileObs$.subscribe({
      next: ({ file }) => {
        this.classroomService.deleteDocument(courseId, docId).subscribe({
          next: () => {
            const documentsPayload = [{
              fileName: file.name,
              title: title,
              topicId: topicId,
              educationLevel: educationLevel,
              gradeLevels: gradeLevels
            }];

            this.classroomService.uploadBulkDocuments(courseId, period.bimester, documentsPayload, [file]).subscribe({
              next: () => {
                this.isSavingEdit.set(false);
                this.closeEditModal();
                this.fetchCourseContent(courseId);
              },
              error: (err: unknown) => {
                console.error('Error al subir documento editado:', err);
                this.isSavingEdit.set(false);
              }
            });
          },
          error: (err: unknown) => {
            console.error('Error al eliminar documento anterior:', err);
            this.isSavingEdit.set(false);
          }
        });
      },
      error: (err: unknown) => {
        console.error('Error al recuperar archivo original:', err);
        this.isSavingEdit.set(false);
      }
    });
  }
}
