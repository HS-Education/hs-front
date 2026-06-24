import { Component, computed, signal, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../shared/components/modal/modal';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';

export interface Tutorial {
  id: number;
  titleKey: string;
  descriptionKey: string;
  type: 'VIDEO' | 'DOCUMENT';
  duration: string; // e.g., '3 min', 'PDF'
  thumbnailUrl?: string;
  videoUrl?: string; // used for mock playback
  documentUrl?: string;
}

export interface Faq {
  id: number;
  questionKey: string;
  answerKey: string;
  isOpen?: boolean;
}

export type HelpFilter = 'ALL' | 'VIDEO' | 'DOCUMENT' | 'FAQ';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, TranslocoPipe],
  templateUrl: './help.html',
  styleUrls: []
})
export class HelpCenter {
  private readonly translocoService = inject(TranslocoService);
  readonly searchQuery = signal('');
  readonly selectedFilter = signal<HelpFilter>('ALL');

  // Video Modal State
  readonly isVideoModalOpen = signal(false);
  readonly selectedVideo = signal<Tutorial | null>(null);

  // Mock Data: Tutorials
  readonly tutorials = signal<Tutorial[]>([
    {
      id: 1,
      titleKey: 'HELP.TUTORIAL_1.TITLE',
      descriptionKey: 'HELP.TUTORIAL_1.DESC',
      type: 'VIDEO',
      duration: '4:20',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    {
      id: 2,
      titleKey: 'HELP.TUTORIAL_2.TITLE',
      descriptionKey: 'HELP.TUTORIAL_2.DESC',
      type: 'VIDEO',
      duration: '5:45'
    },
    {
      id: 3,
      titleKey: 'HELP.TUTORIAL_3.TITLE',
      descriptionKey: 'HELP.TUTORIAL_3.DESC',
      type: 'DOCUMENT',
      duration: 'PDF (2.3 MB)'
    },
    {
      id: 4,
      titleKey: 'HELP.TUTORIAL_4.TITLE',
      descriptionKey: 'HELP.TUTORIAL_4.DESC',
      type: 'VIDEO',
      duration: '3:15'
    },
    {
      id: 5,
      titleKey: 'HELP.TUTORIAL_5.TITLE',
      descriptionKey: 'HELP.TUTORIAL_5.DESC',
      type: 'DOCUMENT',
      duration: 'PDF (1.8 MB)'
    }
  ]);

  // Mock Data: FAQs
  readonly faqs = signal<Faq[]>([
    {
      id: 1,
      questionKey: 'HELP.FAQ_1.Q',
      answerKey: 'HELP.FAQ_1.A'
    },
    {
      id: 2,
      questionKey: 'HELP.FAQ_2.Q',
      answerKey: 'HELP.FAQ_2.A'
    },
    {
      id: 3,
      questionKey: 'HELP.FAQ_3.Q',
      answerKey: 'HELP.FAQ_3.A'
    },
    {
      id: 4,
      questionKey: 'HELP.FAQ_4.Q',
      answerKey: 'HELP.FAQ_4.A'
    },
    {
      id: 5,
      questionKey: 'HELP.FAQ_5.Q',
      answerKey: 'HELP.FAQ_5.A'
    }
  ]);

  // Derived state: Filtered Tutorials
  readonly filteredTutorials = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();
    
    return this.tutorials().filter(tut => {
      // 1. Filter by Type
      if (filter === 'FAQ') return false; // Hide tutorials if FAQ is explicitly selected
      if (filter === 'VIDEO' && tut.type !== 'VIDEO') return false;
      if (filter === 'DOCUMENT' && tut.type !== 'DOCUMENT') return false;
      
      // 2. Filter by Search Query
      if (query) {
        const title = this.translocoService.translate(tut.titleKey).toLowerCase();
        const desc = this.translocoService.translate(tut.descriptionKey).toLowerCase();
        if (!title.includes(query) && !desc.includes(query)) {
          return false;
        }
      }
      return true;
    });
  });

  // Derived state: Filtered FAQs
  readonly filteredFaqs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();

    return this.faqs().filter(faq => {
      // 1. Filter by Type
      if (filter === 'VIDEO' || filter === 'DOCUMENT') return false; // Hide FAQs if video/doc is selected
      
      // 2. Filter by Search Query
      if (query) {
        const question = this.translocoService.translate(faq.questionKey).toLowerCase();
        const answer = this.translocoService.translate(faq.answerKey).toLowerCase();
        if (!question.includes(query) && !answer.includes(query)) {
          return false;
        }
      }
      return true;
    });
  });

  readonly isPdfPreviewOpen = signal(false);
  readonly selectedPdf = signal<Tutorial | null>(null);
  readonly previewSecureUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal(false);

  private readonly sanitizer = inject(DomSanitizer);

  setFilter(filter: HelpFilter) {
    this.selectedFilter.set(filter);
  }

  toggleFaq(id: number) {
    this.faqs.update(list => list.map(f => {
      if (f.id === id) {
        return { ...f, isOpen: !f.isOpen };
      }
      return f;
    }));
  }

  openVideoModal(tutorial: Tutorial) {
    if (tutorial.type === 'VIDEO') {
      this.selectedVideo.set(tutorial);
      this.isVideoModalOpen.set(true);
    }
  }

  closeVideoModal = (): void => {
    this.isVideoModalOpen.set(false);
    this.selectedVideo.set(null);
  }

  previewDocument(tutorial: Tutorial) {
    if (tutorial.type === 'DOCUMENT') {
      this.selectedPdf.set(tutorial);
      this.isPdfPreviewOpen.set(true);
      this.previewLoading.set(true);
      
      // Simulate network delay to fetch safe URL
      setTimeout(() => {
        // A minimal blank PDF in base64 to avoid CSP / Frame-Ancestors errors
        const dummyPdfUrl = 'data:application/pdf;base64,JVBERi0xLjAKMSAwIG9iago8PC9QYWdlcyAyIDAgUiAvVHlwZSAvQ2F0YWxvZz4+CmVuZG9iagoyIDAgb2JqCjw8L0NvdW50IDEgL0tpZHMgWzMgMCBSXSAvVHlwZSAvUGFnZXM+PgplbmRvYmoKMyAwIG9iago8PC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9QYXJlbnQgMiAwIFIgL1R5cGUgL1BhZ2U+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8L1Jvb3QgMSAwIFIgL1NpemUgND4+CnN0YXJ0eHJlZgoxNzMKJSVFT0YK';
        this.previewSecureUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(dummyPdfUrl));
        this.previewLoading.set(false);
      }, 1200);
    }
  }

  closePdfPreview = (): void => {
    this.isPdfPreviewOpen.set(false);
    this.selectedPdf.set(null);
    this.previewSecureUrl.set(null);
    this.previewLoading.set(false);
  }
}
