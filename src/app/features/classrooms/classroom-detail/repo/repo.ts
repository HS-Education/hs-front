import {ChangeDetectionStrategy, Component, computed, effect, inject, input, signal} from '@angular/core';
import {ClassroomService} from '../../data-access/classroom.service';
import {Document} from '../../data-access/models/responses/document.model';
import {forkJoin} from 'rxjs';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

export interface RepoDocument extends Document {
  topicName: string;
  topicOrder: number;
}

import {TranslocoPipe, TranslocoService} from '@jsverse/transloco';

@Component({
  selector: 'app-repo',
  imports: [TranslocoPipe],
  templateUrl: './repo.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Repo {
  private readonly classroomService = inject(ClassroomService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translocoService = inject(TranslocoService);

  readonly courseId = input.required<number>();
  readonly documents = signal<RepoDocument[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly downloadingId = signal<number | null>(null);

  // Preview Signals
  readonly previewDocumentTitle = signal<string>('');
  readonly previewSecureUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal<boolean>(false);

  // Filter Signals
  readonly filterTitle = signal('');
  readonly filterTopicId = signal<number | null>(null);
  readonly topicsList = signal<Array<{ id: number; title: string }>>([]);

  // Computed filtered list of documents
  readonly filteredDocuments = computed(() => {
    let list = this.documents();
    const title = this.filterTitle().trim().toLowerCase();
    const topicId = this.filterTopicId();

    if (title) {
      list = list.filter(d => d.title.toLowerCase().includes(title));
    }
    if (topicId !== null) {
      list = list.filter(d => d.topicId === topicId);
    }
    return list;
  });

  // Group filtered documents by topic
  readonly groupedDocuments = computed(() => {
    const list = this.filteredDocuments();
    const groups = new Map<number, { topicId: number, topicName: string, topicOrder: number, docs: RepoDocument[] }>();
    
    for (const doc of list) {
      if (!groups.has(doc.topicId)) {
        groups.set(doc.topicId, {
          topicId: doc.topicId,
          topicName: doc.topicName,
          topicOrder: doc.topicOrder,
          docs: []
        });
      }
      groups.get(doc.topicId)!.docs.push(doc);
    }
    
    return Array.from(groups.values()).sort((a, b) => a.topicOrder - b.topicOrder);
  });

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
        // Map topicId to orderIndex & name for quick lookup
        const topicMap = new Map<number, { name: string; orderIndex: number }>();
        topics.forEach((t) => {
          topicMap.set(t.id, { name: t.name, orderIndex: t.orderIndex });
        });

        // Set topics list for dropdown
        this.topicsList.set(topics.map(t => ({ id: t.id, title: `${this.translocoService.translate('CLASSROOMS.REPO.WEEK')} ${t.orderIndex}: ${t.name}` })));

        // Sort documents by topic orderIndex, putting unknown topics at the end
        const mappedDocs: RepoDocument[] = documents.map(doc => ({
          ...doc,
          topicName: topicMap.get(doc.topicId)?.name ?? this.translocoService.translate('CLASSROOMS.REPO.NO_TOPIC'),
          topicOrder: topicMap.get(doc.topicId)?.orderIndex ?? 9999
        }));

        const sortedDocs = mappedDocs.sort((a, b) => a.topicOrder - b.topicOrder);

        this.documents.set(sortedDocs);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.translocoService.translate('CLASSROOMS.REPO.ERROR_FETCH'));
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
        console.error(this.translocoService.translate('CLASSROOMS.REPO.ERROR_DOWNLOAD'), err);
        this.downloadingId.set(null);
      },
    });
  }

  previewDocument(courseId: number, documentId: number, name: string): void {
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
        alert(this.translocoService.translate('CLASSROOMS.REPO.PREVIEW_ERROR'));
      }
    });
  }

  closePreview(): void {
    this.previewSecureUrl.set(null);
    this.previewDocumentTitle.set('');
  }
}
