import { Component, computed, signal, inject, DestroyRef, ElementRef, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../shared/components/modal/modal';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';
import { OnboardingService, OnboardingStatus } from '../onboarding/data-access/onboarding.service';
import { TutorialService, PlatformTutorial } from './data-access/tutorial.service';
import { UserDataService } from '../../shared/services/user-data.service';
import { ToastService } from '../../shared/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import {LanguageService} from '../../core/i18n/language.service';

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

export type HelpFilter = 'TUTORIAL' | 'VIDEO' | 'DOCUMENT' | 'FAQ' | 'FAVORITE' | null;

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, TranslocoPipe],
  templateUrl: './help.html',
  styleUrls: [],
  host: {
    class: 'block h-full min-h-0 overflow-hidden'
  }
})
export class HelpCenter {
  private readonly translocoService = inject(TranslocoService);
  private readonly language = inject(LanguageService);
  readonly searchQuery = signal('');
  readonly selectedFilter = signal<HelpFilter>(null);
  private readonly contentContainer = viewChild<ElementRef<HTMLDivElement>>('contentContainer');
  
  // Onboarding tracking
  private readonly onboardingService = inject(OnboardingService);
  readonly onboardingStatus = signal<OnboardingStatus | null>(null);

  // Services
  private readonly tutorialService = inject(TutorialService);
  readonly userDataService = inject(UserDataService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requestedTutorialId = signal<number | null>(null);

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
  readonly editingTutorialId = signal<number | null>(null);

  constructor() {
    const keydownHandler = (event: KeyboardEvent) => this.onDocumentKeydown(event);
    window.addEventListener('keydown', keydownHandler, true);
    this.destroyRef.onDestroy(() => window.removeEventListener('keydown', keydownHandler, true));

    this.route.queryParamMap.subscribe(params => {
      const tutorialId = Number(params.get('tutorial'));
      this.requestedTutorialId.set(Number.isInteger(tutorialId) && tutorialId > 0 ? tutorialId : null);
    });
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
          type: t.fileUrl?.trim() ? 'DOCUMENT' : 'TEXT',
          duration: t.fileUrl?.trim() ? this.getDocumentFormat(t.fileUrl) : '',
          documentUrl: t.fileUrl?.trim() || undefined
        }));
        
        // Append to existing tutorials
        this.tutorials.update(current => {
          // Remove previously loaded backend tutorials (id >= 1000)
          const mocks = current.filter(c => c.id < 1000);
          const tutorials = this.loadTutorialsWithFavorites([...mocks, ...mapped]);
          const requestedId = this.requestedTutorialId();
          const requestedTutorial = requestedId ? tutorials.find(tutorial => tutorial.id === 1000 + requestedId) : null;
          if (requestedTutorial) {
            this.selectedFilter.set('TUTORIAL');
            this.searchQuery.set(requestedTutorial.titleKey);
          }
          return tutorials;
        });
      },
      error: () => console.error('Failed to load tutorials from backend')
    });
  }

  openCreateModal() {
    this.editingTutorialId.set(null);
    this.createFormTitle.set('');
    this.createFormDesc.set('');
    this.isCreateModalOpen.set(true);
  }

  openEditTutorial(tutorial: Tutorial) {
    if (tutorial.id < 1000 || !this.userDataService.isCoordinator()) return;
    this.editingTutorialId.set(tutorial.id - 1000);
    this.createFormTitle.set(tutorial.titleKey);
    this.createFormDesc.set(tutorial.descriptionKey);
    this.isCreateModalOpen.set(true);
  }

  deleteTutorial(tutorial: Tutorial) {
    if (tutorial.id < 1000 || !this.userDataService.isCoordinator()) return;
    if (!window.confirm(this.translocoService.translate('UI_TEXT.DELETE_THIS_TUTORIAL'))) return;
    this.tutorialService.delete(tutorial.id - 1000).subscribe({
      next: () => { this.toastService.success(this.translocoService.translate('HELP.TUTORIAL_DELETED_SUCCESS')); this.loadBackendTutorials(); },
      error: () => this.toastService.error(this.translocoService.translate('HELP.TUTORIAL_DELETE_ERROR')),
    });
  }

  closeCreateModal = () => {
    this.isCreateModalOpen.set(false);
  };

  submitCreateTutorial() {
    const title = this.createFormTitle().trim();
    const desc = this.createFormDesc().trim();
    if (!title || !desc) return;

    this.creating.set(true);
    const tutorialId = this.editingTutorialId();
    const request = { title, description: desc, fileUrl: '' };
    const operation = tutorialId === null
      ? this.tutorialService.create(request)
      : this.tutorialService.update(tutorialId, request);
    operation.subscribe({
      next: () => {
        this.toastService.success(this.translocoService.translate(tutorialId === null ? 'HELP.TUTORIAL_CREATED_SUCCESS' : 'HELP.TUTORIAL_UPDATED_SUCCESS'));
        this.creating.set(false);
        this.closeCreateModal();
        this.editingTutorialId.set(null);
        this.loadBackendTutorials();
      },
      error: () => {
        this.toastService.error(this.translocoService.translate(tutorialId === null ? 'HELP.TUTORIAL_CREATE_ERROR' : 'HELP.TUTORIAL_UPDATE_ERROR'));
        this.creating.set(false);
      }
    });
  }

  readonly tutorials = signal<Tutorial[]>([]);

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
    this.language.activeLanguage();
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();

    // The initial Help screen is a welcome page. Searching without a category
    // selected searches all help content, including tutorials and FAQs.
    if (filter === null && !query) return [];

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
    this.language.activeLanguage();
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();

    if (filter === null && !query) return [];

    return this.faqs().filter(faq => {
      // 1. Filter by Type
      if (filter === 'TUTORIAL' || filter === 'VIDEO' || filter === 'DOCUMENT' || filter === 'FAVORITE') return false;
      
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
  readonly previewOpenUrl = signal<string | null>(null);
  readonly previewError = signal(false);
  readonly previewLoading = signal(false);

  private readonly sanitizer = inject(DomSanitizer);

  setFilter(filter: HelpFilter) {
    this.searchQuery.set('');
    this.selectedFilter.set(this.selectedFilter() === filter ? null : filter);
  }

  private getDocumentFormat(fileUrl: string): string {
    const fileName = fileUrl.split(/[?#]/, 1)[0].split('/').pop() ?? '';
    const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
    return extension && extension.length <= 6
      ? extension.toUpperCase()
      : this.translocoService.translate('HELP.CONTENT.FILE');
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    if (query.trim()) this.selectedFilter.set(null);
  }

  onHelpWheel(event: WheelEvent): void {
    const container = this.contentContainer()?.nativeElement;
    if (!container) return;

    // The header is outside the scrollable element, so forward its wheel gesture to the content.
    if (!container.contains(event.target as Node)) {
      event.preventDefault();
      container.scrollTop += event.deltaY;
    }
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target || target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    const delta = event.key === 'ArrowDown' ? 0.12 : event.key === 'ArrowUp' ? -0.12 : 0;
    if (delta === 0) return;

    const container = this.contentContainer()?.nativeElement;
    if (!container) return;

    event.preventDefault();
    container.scrollTop += delta > 0 ? 40 : -40;
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
    this.selectedPdf.set(tutorial);
    this.isPdfPreviewOpen.set(true);
    this.previewSecureUrl.set(null);
    this.previewOpenUrl.set(null);
    this.previewError.set(false);
    this.previewLoading.set(false);

    // Text tutorials use their description as the full article. Document
    // tutorials use the persisted fileUrl supplied by the API.
    if (tutorial.type === 'TEXT') return;

    const fileUrl = tutorial.documentUrl?.trim();
    if (!fileUrl) {
      this.previewError.set(true);
      return;
    }

    try {
      const resolvedUrl = new URL(fileUrl, window.location.origin);
      if (resolvedUrl.protocol !== 'http:' && resolvedUrl.protocol !== 'https:') {
        this.previewError.set(true);
        return;
      }
      this.previewOpenUrl.set(resolvedUrl.href);
      this.previewSecureUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(resolvedUrl.href));
    } catch {
      this.previewError.set(true);
    }
  }

  closePdfPreview = (): void => {
    this.isPdfPreviewOpen.set(false);
    this.selectedPdf.set(null);
    this.previewSecureUrl.set(null);
    this.previewOpenUrl.set(null);
    this.previewError.set(false);
    this.previewLoading.set(false);
  }
}
