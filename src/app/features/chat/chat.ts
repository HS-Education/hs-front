import {ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, signal, viewChild} from '@angular/core';
import {ChatService} from './data-access/chat.service';
import {ClassroomService} from '../classrooms/data-access/classroom.service';
import {UserDataService} from '../../shared/services/user-data.service';
import {ChatSession} from './data-access/models/chat-session.model';
import {ChatMessage} from './data-access/models/chat-message.model';
import {Classroom} from '../classrooms/data-access/models/responses/classroom.model';
import {FormsModule} from '@angular/forms';
import {DatePipe} from '@angular/common';
import {MarkdownMathPipe} from '../../shared/pipes/markdown-math.pipe';
import {ActivatedRoute, Router} from '@angular/router';
import {DomSanitizer, SafeResourceUrl, SafeHtml} from '@angular/platform-browser';
import {ConfirmModal} from '../../shared/components/modal/confirm-modal';

export interface ChatSource {
  name: string;
  courseId: number;
  documentId: number;
  downloadUrl: string;
}

@Component({
  selector: 'app-chat',
  imports: [FormsModule, DatePipe, ConfirmModal],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat implements OnInit {
  private readonly chatService = inject(ChatService);
  private readonly classroomService = inject(ClassroomService);
  protected readonly userDataService = inject(UserDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly sanitizer = inject(DomSanitizer);

  private readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  readonly classrooms = signal<Classroom[]>([]);
  readonly sessions = signal<ChatSession[]>([]);
  readonly currentSessionId = signal<number | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  
  // Filtering & creation selections
  readonly filterCourseId = signal<number | null>(null);
  readonly newSessionCourseId = signal<number | null>(null);
  
  readonly questionText = signal('');
  readonly sendingMessage = signal(false);
  readonly loadingSessions = signal(false);
  readonly loadingMessages = signal(false);

  // Confirm Modal signals
  readonly confirmModalOpen = signal(false);
  readonly confirmModalTitle = signal('');
  readonly confirmModalMessage = signal('');
  readonly confirmAction = signal<() => void>(() => {});

  closeConfirmModal = (): void => this.confirmModalOpen.set(false);

  // Computed list of unique courses for dropdown filter
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

  // Selected session details
  readonly activeSession = computed(() => {
    const id = this.currentSessionId();
    if (!id) return null;
    return this.sessions().find(s => s.id === id) || null;
  });

  ngOnInit(): void {
    const user = this.userDataService.userProfile();
    if (user) {
      this.classroomService.getClassrooms(user.id).subscribe({
        next: (list) => {
          this.classrooms.set(list);
        },
        error: (err: unknown) => {
          console.error('Error al cargar cursos para el chat:', err);
        }
      });
      
      // Load sessions and subscribe to query parameters
      this.loadSessions();

      this.route.queryParamMap.subscribe((params) => {
        const querySessionId = params.get('sessionId');
        if (querySessionId) {
          const parsed = Number(querySessionId);
          if (this.currentSessionId() !== parsed) {
            this.fetchHistoryForSession(parsed);
          }
        } else {
          this.currentSessionId.set(null);
          this.messages.set([]);
        }
      });
    }
  }

  loadSessions(): void {
    this.loadingSessions.set(true);
    const filterId = this.filterCourseId();
    
    this.chatService.getChatSessions(filterId || undefined).subscribe({
      next: (list) => {
        this.sessions.set(list);
        this.loadingSessions.set(false);

        // Read initial session from URL or default to first session
        const querySessionId = this.route.snapshot.queryParamMap.get('sessionId');
        if (querySessionId) {
          this.selectSession(Number(querySessionId));
        } else if (list.length > 0) {
          this.selectSession(list[0].id);
        }
      },
      error: (err: unknown) => {
        console.error('Error al cargar sesiones de chat:', err);
        this.loadingSessions.set(false);
      }
    });
  }

  onFilterCourseChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value ? Number(select.value) : null;
    this.filterCourseId.set(value);
    this.loadSessions();
  }

  selectSession(sessionId: number): void {
    // Navigate to set query parameter
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sessionId },
      queryParamsHandling: 'merge'
    });
  }

  closeSession(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sessionId: null },
      queryParamsHandling: 'merge'
    });
  }

  private fetchHistoryForSession(sessionId: number): void {
    this.currentSessionId.set(sessionId);
    this.loadingMessages.set(true);
    this.messages.set([]);
    
    this.chatService.getChatHistory(sessionId).subscribe({
      next: (history) => {
        this.messages.set(history);
        this.loadingMessages.set(false);
        this.scrollToBottom();
      },
      error: (err: unknown) => {
        console.error('Error al cargar historial de chat:', err);
        this.loadingMessages.set(false);
      }
    });
  }

  createNewSession(): void {
    const courseId = this.newSessionCourseId();
    this.chatService.createChatSession(courseId).subscribe({
      next: (newSession) => {
        this.sessions.update(current => [newSession, ...current]);
        this.selectSession(newSession.id);
        this.newSessionCourseId.set(null); // Reset select
      },
      error: (err: unknown) => {
        console.error('Error al crear sesión de chat:', err);
      }
    });
  }

  deleteSession(sessionId: number, event: Event): void {
    event.stopPropagation();
    this.confirmModalTitle.set('Eliminar Sesión');
    this.confirmModalMessage.set('¿Estás seguro de que deseas eliminar esta sesión de chat?');
    this.confirmAction.set(() => {
      this.chatService.deleteChatSession(sessionId).subscribe({
        next: () => {
          this.confirmModalOpen.set(false);
          this.sessions.update(list => list.filter(s => s.id !== sessionId));
          if (this.currentSessionId() === sessionId) {
            this.currentSessionId.set(null);
            this.messages.set([]);
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { sessionId: null },
              queryParamsHandling: 'merge'
            });
          }
        },
        error: (err: unknown) => {
          console.error('Error al eliminar sesión de chat:', err);
          this.confirmModalOpen.set(false);
          alert('No se pudo eliminar la sesión.');
        }
      });
    });
    this.confirmModalOpen.set(true);
  }

  getCourseName(courseId: number | null): string {
    if (!courseId) return 'Tutoría Global (General)';
    const classroom = this.classrooms().find(c => c.courseId === courseId);
    return classroom ? classroom.courseName : `Curso #${courseId}`;
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const container = this.scrollContainer()?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  sendMessage(): void {
    const sessionId = this.currentSessionId();
    const text = this.questionText().trim();
    if (!sessionId || !text || this.sendingMessage()) return;

    this.sendingMessage.set(true);
    this.questionText.set('');

    // Optimistic message append
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString()
    };
    this.messages.update(prev => [...prev, userMsg]);
    this.scrollToBottom();

    this.chatService.sendMessage(sessionId, text).subscribe({
      next: (assistantMsg) => {
        this.messages.update(prev => [...prev, assistantMsg]);
        this.sendingMessage.set(false);
        this.scrollToBottom();
      },
      error: (err: unknown) => {
        console.error('Error al enviar mensaje:', err);
        this.sendingMessage.set(false);
        // Show error message in chat window
        const errorMsg: ChatMessage = {
          id: Date.now() + 1,
          role: 'ASSISTANT',
          content: 'Lo siento, no pude procesar tu mensaje en este momento. Por favor, intenta de nuevo.',
          createdAt: new Date().toISOString()
        };
        this.messages.update(prev => [...prev, errorMsg]);
        this.scrollToBottom();
      }
    });
  }

  // Preview Signals
  readonly previewDocumentTitle = signal<string>('');
  readonly previewSecureUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal<boolean>(false);

  getSources(content: string | null | undefined): ChatSource[] {
    if (!content) return [];
    const sources: ChatSource[] = [];
    const regex = /(?:\*\*)?Fuente:(?:\*\*)?\s*(.*?)\s*(?:\*\*)?Enlace de descarga:(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      sources.push({
        name: match[1].replace(/\*\*/g, '').trim(),
        courseId: Number(match[2]),
        documentId: Number(match[3]),
        downloadUrl: `/api/v1/courses/${match[2]}/documents/${match[3]}/download`
      });
    }
    return sources;
  }

  renderMessageContent(msg: ChatMessage): SafeHtml {
    let rawText = msg.content || '';
    const sources = this.getSources(rawText);

    if (sources.length > 0) {
      const regex = /\s*(?:\[\d+\])?\s*(?:\*\*)?Fuente:(?:\*\*)?\s*(.*?)\s*(?:\*\*)?Enlace de descarga:(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
      rawText = rawText.replace(regex, (match) => {
        const idx = sources.findIndex(s => match.includes(`/documents/${s.documentId}/download`));
        if (idx >= 0) {
          const citation = `[${idx + 1}]`;
          // Original check to see if the AI referenced it inline
          if (!msg.content?.includes(citation)) {
            return ` ${citation}@@@SOURCEBLOCK:${idx}@@@`;
          }
          return `@@@SOURCEBLOCK:${idx}@@@`;
        }
        return match;
      });
    }

    let htmlString = MarkdownMathPipe.process(rawText);

    if (sources.length > 0) {
      // Replace inline [1]
      htmlString = htmlString.replace(/\[(\d+)\]/g, (match, p1) => {
        const idx = Number(p1) - 1;
        if (idx >= 0 && idx < sources.length) {
          return `<a href="javascript:void(0)" data-source-index="${idx}" class="text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] hover:underline font-bold font-mono">[${p1}]</a>`;
        }
        return match;
      });

      // Clean up any empty paragraphs generated by Markdown math pipe before source blocks
      htmlString = htmlString.replace(/<p>\s*@@@SOURCEBLOCK:(\d+)@@@\s*<\/p>/g, '@@@SOURCEBLOCK:$1@@@');

      // Replace block placeholders
      htmlString = htmlString.replace(/@@@SOURCEBLOCK:(\d+)@@@/g, (match, p1) => {
        const idx = Number(p1);
        if (idx >= 0 && idx < sources.length) {
          const src = sources[idx];
          return `<div class="mt-3"><a href="javascript:void(0)" data-source-index="${idx}" class="inline-flex items-center gap-1.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 hover:underline px-3 py-1.5 rounded-lg font-semibold text-xs transition border border-[var(--brand-primary)]/20 w-auto">
            <span class="text-[var(--brand-primary)] font-bold px-0.5 py-0.5 text-[10px] tracking-wide">[${idx + 1}]</span> 
            <span>${src.name}</span>
          </a></div>`;
        }
        return match;
      });

      // Remove any `<br/>` tags or whitespace right before the source block div to prevent huge gaps
      htmlString = htmlString.replace(/(?:<br\/>|\s)*<div class="mt-3">/g, '<div class="mt-3">');
    }

    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }

  handleMessageClick(event: MouseEvent, msg: ChatMessage): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a[data-source-index]');
    if (anchor) {
      event.preventDefault();
      const indexAttr = anchor.getAttribute('data-source-index');
      if (indexAttr !== null) {
        const idx = Number(indexAttr);
        const sources = this.getSources(msg.content);
        if (idx >= 0 && idx < sources.length) {
          const src = sources[idx];
          this.previewDocument(src.courseId, src.documentId, src.name);
        }
      }
    }
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
        alert('No se pudo cargar la previsualización del documento.');
      }
    });
  }

  closePreview(): void {
    this.previewSecureUrl.set(null);
    this.previewDocumentTitle.set('');
  }

  downloadSource(courseId: number, documentId: number): void {
    this.classroomService.getDocumentDownloadUrl(courseId, documentId).subscribe({
      next: (response) => {
        window.open(response.url, '_blank');
      },
      error: (err) => {
        console.error('Error al descargar:', err);
      }
    });
  }
}
