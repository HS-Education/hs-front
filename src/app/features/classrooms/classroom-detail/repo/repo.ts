import {ChangeDetectionStrategy, Component, effect, inject, input, signal} from '@angular/core';
import {ClassroomService} from '../../data-access/classroom.service';
import {Document} from '../../data-access/models/responses/document.model';
import {forkJoin} from 'rxjs';

@Component({
  selector: 'app-repo',
  imports: [],
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

  constructor() {
    effect(() => {
      this.fetchDocuments();
    });
  }

  private fetchDocuments() {
    const id = this.courseId();
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      topics: this.classroomService.getClassroomTopics(id),
      documents: this.classroomService.getClassroomDocuments(id)
    }).subscribe({
      next: ({ topics, documents }) => {
        // Map topicId to orderIndex for quick sorting lookup
        const topicOrderMap = new Map<number, number>();
        topics.forEach((t) => {
          topicOrderMap.set(t.id, t.orderIndex);
        });

        // Sort documents by topic orderIndex, putting unknown topics at the end
        const sortedDocs = documents.sort((a, b) => {
          const orderA = topicOrderMap.get(a.topicId) ?? 9999;
          const orderB = topicOrderMap.get(b.topicId) ?? 9999;
          return orderA - orderB;
        });

        this.documents.set(sortedDocs);
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
}
