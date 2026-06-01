import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Modal } from '../../../../../../shared/components/modal/modal';
import { ClassroomService } from '../../../../data-access/classroom.service';
import { Topic } from '../../../../data-access/models/responses/topic.model';
import {
  EDUCATION_LEVEL_OPTIONS,
  GRADE_LEVEL_OPTIONS,
  type EducationLevel,
  type GradeLevel,
} from '../../../../../../shared/models/academic-levels.model';
import {UploadDocumentRequest} from '../../../../data-access/models/requests/upload-document.request';

@Component({
  selector: 'app-upload-document-modal',
  imports: [Modal],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="'Agregar documento'" [onClose]="closeModal">
      <form class="space-y-4" (submit)="submit($event)">
        <div>
          <label class="text-sm font-medium" for="document-title">Título</label>
          <input
            id="document-title"
            class="mt-1 block w-full rounded border px-3 py-2 text-sm"
            [value]="titleField()"
            (input)="setTitle($event)"
            required
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium" for="document-topic">Topic</label>

            @if (topicsLoading()) {
              <p class="mt-1 text-sm text-slate-500">Cargando topics...</p>
            } @else if (topicsError()) {
              <p class="mt-1 text-sm text-red-600">{{ topicsError() }}</p>
            } @else if (sortedTopics().length === 0) {
              <p class="mt-1 text-sm text-slate-500">No hay topics disponibles</p>
            } @else {
              <select
                id="document-topic"
                class="mt-1 block w-full rounded border px-3 py-2 text-sm"
                [value]="topicIdField() ?? ''"
                (change)="setTopicId($event)"
                required
              >
                <option value="" disabled>Selecciona un topic</option>
                @for (topic of sortedTopics(); track topic.id) {
                  <option [value]="topic.id">{{ topic.name }}</option>
                }
              </select>
            }
          </div>

          <div>
            <label class="text-sm font-medium" for="document-education-level">Nivel educativo</label>
            <select
              id="document-education-level"
              class="mt-1 block w-full rounded border px-3 py-2 text-sm"
              [value]="educationLevelField()"
              (change)="setEducationLevel($event)"
              required
            >
              @for (level of educationLevelOptions; track level) {
                <option [value]="level">{{ level }}</option>
              }
            </select>
          </div>
        </div>

        <div>
          <label class="text-sm font-medium">Grados</label>
          <div class="mt-1 flex gap-2">
            @for (grade of gradeLevelOptions; track grade) {
              <label class="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  [checked]="gradeLevels().includes(grade)"
                  (change)="toggleGrade(grade)"
                />
                <span class="text-sm">{{ grade }}</span>
              </label>
            }
          </div>
        </div>

        <div>
          <label class="text-sm font-medium" for="document-file">Archivo PDF</label>
          <input
            id="document-file"
            type="file"
            accept="application/pdf"
            class="mt-1 block w-full text-sm"
            (change)="onFileChange($event)"
            required
          />

          @if (fileName()) {
            <p class="mt-1 text-sm text-slate-500">Archivo: {{ fileName() }}</p>
          }
        </div>

        <div class="flex items-center justify-end gap-2">
          <button type="button" class="rounded px-3 py-2" (click)="closeModal()">
            Cancelar
          </button>

          <button
            type="submit"
            class="rounded bg-sky-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="isUploading() || topicsLoading() || !canSubmit()"
          >
            @if (isUploading()) {
              Subiendo...
            } @else {
              Subir documento
            }
          </button>
        </div>

        @if (error()) {
          <div class="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800" role="alert">
            {{ error() }}
          </div>
        }
      </form>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadDocumentModal {
  private readonly classroomService = inject(ClassroomService);

  readonly isOpen = input.required<boolean>();
  readonly courseId = input.required<number>();
  readonly onClose = input<(() => void) | null>(null);
  readonly onAdded = input<(() => void) | null>(null);

  readonly educationLevelOptions = EDUCATION_LEVEL_OPTIONS;
  readonly gradeLevelOptions = GRADE_LEVEL_OPTIONS;

  readonly titleField = signal<string>('');
  readonly topicIdField = signal<number | null>(null);
  readonly educationLevelField = signal<EducationLevel>(this.educationLevelOptions[0]);
  readonly gradeLevels = signal<GradeLevel[]>([this.gradeLevelOptions[0]]);
  readonly file = signal<File | null>(null);

  readonly topics = signal<Topic[]>([]);
  readonly topicsLoading = signal(true);
  readonly topicsError = signal<string | null>(null);

  readonly isUploading = signal(false);
  readonly error = signal<string | null>(null);

  readonly sortedTopics = computed(() => {
    return [...this.topics()].sort((a, b) => a.orderIndex - b.orderIndex);
  });

  readonly fileName = computed(() => this.file()?.name ?? '');

  constructor() {
    effect((onCleanup) => {
      const courseId = this.courseId();

      this.topicsLoading.set(true);
      this.topicsError.set(null);

      const subscription = this.classroomService.getClassroomTopics(courseId).subscribe({
        next: (topics) => {
          this.topics.set(topics);

          const currentTopicId = this.topicIdField();
          const firstTopic = topics[0] ?? null;

          if (currentTopicId === null || !topics.some((topic) => topic.id === currentTopicId)) {
            this.topicIdField.set(firstTopic?.id ?? null);
          }

          this.topicsLoading.set(false);
        },
        error: (err: unknown) => {
          console.error(err);
          this.topics.set([]);
          this.topicsError.set('No se pudieron cargar las topics');
          this.topicsLoading.set(false);
        },
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  closeModal = () => {
    this.resetForm();
    this.onClose()?.();
  };

  private resetForm() {
    this.titleField.set('');
    this.topicIdField.set(this.sortedTopics()[0]?.id ?? null);
    this.educationLevelField.set(this.educationLevelOptions[0]);
    this.gradeLevels.set([this.gradeLevelOptions[0]]);
    this.file.set(null);
    this.error.set(null);
    this.isUploading.set(false);
  }

  setTitle(event: Event) {
    const input = event.target as HTMLInputElement;
    this.titleField.set(input.value);
  }

  setTopicId(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;

    this.topicIdField.set(value === '' ? null : Number(value));
  }

  setEducationLevel(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.educationLevelField.set(select.value as EducationLevel);
  }

  toggleGrade(grade: GradeLevel) {
    this.gradeLevels.update((current) => {
      if (current.includes(grade)) {
        // Evita dejarlo vacío si por ahora solo hay un valor
        return current.length > 1 ? current.filter((item) => item !== grade) : current;
      }

      return [...current, grade];
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file && file.type !== 'application/pdf') {
      this.error.set('Solo se permiten archivos PDF');
      this.file.set(null);
      return;
    }

    this.error.set(null);
    this.file.set(file);
  }

  canSubmit() {
    return (
      this.titleField().trim().length > 0 &&
      this.topicIdField() !== null &&
      this.file() !== null &&
      this.gradeLevels().length > 0
    );
  }

  submit(event: Event) {
    event.preventDefault();

    const topicId = this.topicIdField();
    const file = this.file();

    if (!this.canSubmit() || topicId === null || file === null) {
      this.error.set('Rellena todos los campos y selecciona un archivo PDF');
      return;
    }

    const request: UploadDocumentRequest = {
      title: this.titleField().trim(),
      topicId,
      educationLevel: this.educationLevelField(),
      gradeLevels: this.gradeLevels(),
    };

    this.isUploading.set(true);
    this.error.set(null);

    this.classroomService.uploadDocument(this.courseId(), request, file).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.onAdded()?.();
        this.closeModal();
      },
      error: (err: unknown) => {
        console.error(err);
        this.error.set('Error al subir el documento');
        this.isUploading.set(false);
      },
    });
  }
}
