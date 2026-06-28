import { Component, computed, signal, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../shared/components/modal/modal';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';
import { OnboardingService, OnboardingStatus } from '../onboarding/data-access/onboarding.service';
import { TutorialService, PlatformTutorial } from './data-access/tutorial.service';
import { UserDataService } from '../../shared/services/user-data.service';
import { ToastService } from '../../shared/services/toast.service';

export interface Tutorial {
  id: number;
  titleKey: string;
  descriptionKey: string;
  type: 'VIDEO' | 'DOCUMENT' | 'TEXT';
  duration: string; // e.g., '3 min', 'PDF', 'Texto'
  thumbnailUrl?: string;
  videoUrl?: string; // used for mock playback
  documentUrl?: string;
  isFavorite?: boolean;
}

export interface Faq {
  id: number;
  questionKey: string;
  answerKey: string;
  isOpen?: boolean;
}

export type HelpFilter = 'ALL' | 'VIDEO' | 'DOCUMENT' | 'FAQ' | 'FAVORITE';

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
  
  // Onboarding tracking
  private readonly onboardingService = inject(OnboardingService);
  readonly onboardingStatus = signal<OnboardingStatus | null>(null);

  // Services
  private readonly tutorialService = inject(TutorialService);
  readonly userDataService = inject(UserDataService);
  private readonly toastService = inject(ToastService);

  // Favorites
  private readonly FAVORITES_KEY = 'hs_tesis_tutorial_favorites';

  // Video Modal State
  readonly isVideoModalOpen = signal(false);
  readonly selectedVideo = signal<Tutorial | null>(null);

  // Create Tutorial Modal
  readonly isCreateModalOpen = signal(false);
  readonly createFormTitle = signal('');
  readonly createFormDesc = signal('');
  readonly creating = signal(false);

  constructor() {
    this.onboardingService.getStatus().subscribe(status => {
      this.onboardingStatus.set(status);
    });
    this.loadBackendTutorials();
  }

  private loadBackendTutorials() {
    this.tutorialService.getAll().subscribe({
      next: (tuts) => {
        // Map backend tutorials to frontend Tutorial interface
        const mapped: Tutorial[] = tuts.map(t => ({
          id: 1000 + t.id, // Offset ID to avoid collision with mocks
          titleKey: t.title, // Backend tutorials store literal strings for now, not translation keys
          descriptionKey: t.description,
          type: 'TEXT',
          duration: 'Texto'
        }));
        
        // Append to existing tutorials
        this.tutorials.update(current => {
          // Remove previously loaded backend tutorials (id >= 1000)
          const mocks = current.filter(c => c.id < 1000);
          return this.loadTutorialsWithFavorites([...mocks, ...mapped]);
        });
      },
      error: () => console.error('Failed to load tutorials from backend')
    });
  }

  openCreateModal() {
    this.createFormTitle.set('');
    this.createFormDesc.set('');
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal = () => {
    this.isCreateModalOpen.set(false);
  };

  submitCreateTutorial() {
    const title = this.createFormTitle().trim();
    const desc = this.createFormDesc().trim();
    if (!title || !desc) return;

    this.creating.set(true);
    this.tutorialService.create({ title, description: desc, fileUrl: '' }).subscribe({
      next: () => {
        this.toastService.success(this.translocoService.translate('HELP.TUTORIAL_CREATED_SUCCESS'));
        this.creating.set(false);
        this.closeCreateModal();
        this.loadBackendTutorials();
      },
      error: () => {
        this.toastService.error('Error al crear el tutorial');
        this.creating.set(false);
      }
    });
  }

  // Mock Data: Tutorials
  readonly tutorials = signal<Tutorial[]>(this.loadTutorialsWithFavorites([
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
  ]));

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

  private loadTutorialsWithFavorites(baseTutorials: Tutorial[]): Tutorial[] {
    const favsJson = localStorage.getItem(this.FAVORITES_KEY);
    let favIds: number[] = [];
    if (favsJson) {
      try {
        favIds = JSON.parse(favsJson);
      } catch (e) {}
    }
    return baseTutorials.map(t => ({
      ...t,
      isFavorite: favIds.includes(t.id)
    }));
  }

  toggleFavorite(tutorial: Tutorial) {
    this.tutorials.update(list => {
      const newList = list.map(t => {
        if (t.id === tutorial.id) {
          return { ...t, isFavorite: !t.isFavorite };
        }
        return t;
      });
      // Save to local storage
      const favIds = newList.filter(t => t.isFavorite).map(t => t.id);
      localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favIds));
      return newList;
    });
  }

  // Derived state: Filtered Tutorials
  readonly filteredTutorials = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();
    
    return this.tutorials().filter(tut => {
      // 1. Filter by Type
      if (filter === 'FAQ') return false; 
      if (filter === 'VIDEO' && tut.type !== 'VIDEO') return false;
      if (filter === 'DOCUMENT' && tut.type !== 'DOCUMENT') return false;
      if (filter === 'FAVORITE' && !tut.isFavorite) return false;
      
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
