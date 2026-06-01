import {ChangeDetectionStrategy, Component, effect, inject, input, signal} from '@angular/core';
import {ClassroomService} from '../../data-access/classroom.service';
import {Document} from '../../data-access/models/responses/document.model';
import {UploadDocumentModal} from './ui/upload-document-modal';

@Component({
  selector: 'app-repo',
  imports: [UploadDocumentModal],
  templateUrl: './repo.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Repo {
  private readonly classroomService = inject(ClassroomService);

  readonly courseId = input.required<number>();
  readonly documents = signal<Document[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly downloadingId = signal<number | null>(null);

  readonly isAddModalOpen = signal(false);

  constructor() {
    effect(() => {
      this.fetchDocuments();
    });
  }

  private fetchDocuments() {
    const id = this.courseId();
    this.loading.set(true);
    this.error.set(null);

    this.classroomService.getClassroomDocuments(id).subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar documentos');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  downloadDocument(documentId: number) {
    this.downloadingId.set(documentId);

    this.classroomService.getDocumentDownloadUrl(this.courseId(), documentId).subscribe({
      next: (response) => {
        window.open(response.url, '_blank');
        this.downloadingId.set(null);
      },
      error: (err) => {
        console.error('Error al descargar:', err);
        this.downloadingId.set(null);
      },
    });
  }

  openAddModal = () => {
    this.isAddModalOpen.set(true);
  };

  closeAddModal = () => {
    this.isAddModalOpen.set(false);
  };

  onAdded = () => {
    this.fetchDocuments();
  };
}
