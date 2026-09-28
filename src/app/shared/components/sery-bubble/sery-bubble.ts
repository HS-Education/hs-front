import {LanguageService} from '../../../core/i18n/language.service';
import {LocalizedDatePipe} from '../../pipes/localized-date.pipe';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatService } from '../../../features/chat/data-access/chat.service';
import { ChatSession } from '../../../features/chat/data-access/models/chat-session.model';
import { ChatMessage } from '../../../features/chat/data-access/models/chat-message.model';
import { Classroom } from '../../../features/classrooms/data-access/models/responses/classroom.model';
import { ClassroomService } from '../../../features/classrooms/data-access/classroom.service';
import { UserDataService } from '../../services/user-data.service';
import { MarkdownMathPipe } from '../../pipes/markdown-math.pipe';
import { SeryBubbleService } from './sery-bubble.service';

interface ChatSourceReference {
  name: string;
  courseId: number;
  documentId: number;
}

@Component({
  selector: 'app-sery-bubble',
  imports: [FormsModule, LocalizedDatePipe, TranslocoPipe, MarkdownMathPipe],
  templateUrl: './sery-bubble.html',
  styleUrl: './sery-bubble.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeryBubble implements OnInit {
  private readonly language = inject(LanguageService);
  private translate(key: string, params?: Record<string, unknown>): string {
    this.language.activeLanguage();
    return this.translocoService.translate(key, params);
  }
  protected readonly seryBubbleService = inject(SeryBubbleService);
  private readonly chatService = inject(ChatService);
  private readonly classroomService = inject(ClassroomService);
  private readonly userDataService = inject(UserDataService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly translocoService = inject(TranslocoService);

  readonly isOpen = this.seryBubbleService.isOpen;
  readonly isMaximized = this.seryBubbleService.isMaximized;
  readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  // Chat Data Signals
  readonly sessions = signal<ChatSession[]>([]);
  readonly currentSessionId = signal<number | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly loadingSessions = signal(false);
  readonly loadingMessages = signal(false);
  readonly sendingMessage = signal(false);
  readonly streamingResponse = signal(false);
  readonly questionText = signal('');
  readonly showSessionMenu = signal(false);
  readonly showCreateMenu = signal(false);
  readonly classrooms = signal<Classroom[]>([]);
  private readonly emptySessionId = signal<number | null>(null);
  private readonly historyLoadedSessionId = signal<number | null>(null);

  // Active session computed
  readonly activeSession = computed(() => {
    const id = this.currentSessionId();
    if (!id) return null;
    return this.sessions().find((s) => s.id === id) || null;
  });

  // Suggested prompt pills for quick start
  get suggestedPrompts(): string[] { return [
    this.translate('UI_TEXT.WHICH_STUDY_TOPICS_ARE_AVAILABLE_TO_ME'),
    this.translate('UI_TEXT.EXPLAIN_THE_MAIN_CONCEPTS_IN_MY_COURSE'),
    this.translate('UI_TEXT.HOW_CAN_I_PREPARE_FOR_MY_QUIZZES'),
  ]; }
  readonly isSourcePreviewOpen = signal(false);
  readonly previewDocumentTitle = signal('');
  readonly previewSecureUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal(false);
  readonly previewError = signal(false);

  getSources(content: string | null | undefined): ChatSourceReference[] {
    if (!content) return [];
    const sources: ChatSourceReference[] = [];
    const regex = /(?:\*\*)?(?:Fuente|Source):(?:\*\*)?\s*(.*?)\s*(?:\*\*)?(?:Enlace de descarga|Download link):(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      sources.push({
        name: match[1].replace(/\*\*/g, '').trim(),
        courseId: Number(match[2]),
        documentId: Number(match[3]),
      });
    }
    return sources;
  }

  previewSource(source: ChatSourceReference): void {
    this.previewDocumentTitle.set(source.name);
    this.previewSecureUrl.set(null);
    this.previewError.set(false);
    this.previewLoading.set(true);
    this.isSourcePreviewOpen.set(true);

    this.classroomService.getDocumentDownloadUrl(source.courseId, source.documentId).subscribe({
      next: (response) => {
        this.previewSecureUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(response.url));
        this.previewLoading.set(false);
      },
      error: (error: unknown) => {
        console.error('Error al obtener la fuente de Sery:', error);
        this.previewLoading.set(false);
        this.previewError.set(true);
      }
    });
  }

  closeSourcePreview(): void {
    this.isSourcePreviewOpen.set(false);
    this.previewDocumentTitle.set('');
    this.previewSecureUrl.set(null);
    this.previewLoading.set(false);
    this.previewError.set(false);
  }

  constructor() {
    // When the bubble is opened, ensure sessions and history are loaded
    effect(() => {
      if (this.isOpen()) {
        if (this.sessions().length === 0 && !this.loadingSessions()) {
          this.loadSessionsAndSelect();
        } else if (this.currentSessionId() && this.messages().length === 0 && !this.loadingMessages() && this.currentSessionId() !== this.emptySessionId() && this.currentSessionId() !== this.historyLoadedSessionId()) {
          this.fetchHistoryForSession(this.currentSessionId()!);
        }
        this.scrollToBottom();
      }
    });
  }

  ngOnInit(): void {
    // Lazy initial pre-load when component initializes
    this.loadSessionsAndSelect();
    const user = this.userDataService.userProfile();
    if (user) {
      this.classroomService.getClassrooms(user.id).subscribe({
        next: (list) => this.classrooms.set(list),
        error: (err: unknown) => console.error('Error al cargar cursos para Sery:', err),
      });
    }
  }

  toggleOpen(): void {
    this.seryBubbleService.toggleOpen();
  }

  close(): void {
    this.seryBubbleService.close();
  }

  maximize(): void {
    this.seryBubbleService.toggleMaximized();
  }

  loadSessionsAndSelect(): void {
    this.loadingSessions.set(true);
    this.chatService.getChatSessions().subscribe({
      next: (list) => {
        this.sessions.set(list);
        this.loadingSessions.set(false);

        if (list.length > 0) {
          // If no active session or current is not in list, select first
          if (!this.currentSessionId() || !list.some((s) => s.id === this.currentSessionId())) {
            this.selectSession(list[0].id);
          }
        } else {
          // Auto-create initial session if user has none
          this.createNewSession();
        }
      },
      error: (err: unknown) => {
        console.error('Error al cargar sesiones en bubble:', err);
        this.loadingSessions.set(false);
      },
    });
  }

  selectSession(sessionId: number): void {
    this.showSessionMenu.set(false);
    this.showCreateMenu.set(false);
    this.emptySessionId.set(null);
    this.historyLoadedSessionId.set(null);
    this.currentSessionId.set(sessionId);
    this.fetchHistoryForSession(sessionId);
  }

  toggleSessionMenu(): void {
    this.showSessionMenu.update((visible) => !visible);
    this.showCreateMenu.set(false);
  }

  toggleCreateMenu(): void {
    this.showCreateMenu.update((visible) => !visible);
    this.showSessionMenu.set(false);
  }

  deleteSession(sessionId: number): void {
    if (!window.confirm(this.translate('UI_TEXT.DELETE_THIS_CONVERSATION'))) return;

    this.chatService.deleteChatSession(sessionId).subscribe({
      next: () => {
        const remaining = this.sessions().filter((session) => session.id !== sessionId);
        this.sessions.set(remaining);
        if (this.currentSessionId() === sessionId) {
          if (remaining.length > 0) {
            this.selectSession(remaining[0].id);
          } else {
            this.currentSessionId.set(null);
            this.messages.set([]);
            this.createNewSession(null);
          }
        }
      },
      error: (err: unknown) => console.error('Error al eliminar sesión de Sery:', err),
    });
  }

  createNewSession(courseId: number | null = null): void {
    this.showSessionMenu.set(false);
    this.showCreateMenu.set(false);
    this.loadingMessages.set(true);
    this.messages.set([]);
    this.chatService.createChatSession(courseId).subscribe({
      next: (newSession) => {
        this.sessions.update((curr) => [newSession, ...curr]);
        this.currentSessionId.set(newSession.id);
        this.messages.set([]);
        this.emptySessionId.set(newSession.id);
        this.historyLoadedSessionId.set(newSession.id);
        this.loadingMessages.set(false);
      },
      error: (err: unknown) => {
        console.error('Error al crear sesión en bubble:', err);
        this.loadingMessages.set(false);
      },
    });
  }

  private fetchHistoryForSession(sessionId: number): void {
    this.historyLoadedSessionId.set(sessionId);
    this.loadingMessages.set(true);
    this.messages.set([]);

    this.chatService.getChatHistory(sessionId).subscribe({
      next: (history) => {
        this.messages.set(history);
        this.loadingMessages.set(false);
        this.scrollToBottom();
      },
      error: (err: unknown) => {
        console.error('Error al cargar historial en bubble:', err);
        this.loadingMessages.set(false);
      },
    });
  }

  sendSuggestedPrompt(prompt: string): void {
    this.questionText.set(prompt);
    this.sendMessage();
  }

  async sendMessage(): Promise<void> {
    const text = this.questionText().trim();
    if (!text || this.sendingMessage()) return;

    let sessionId = this.currentSessionId();
    // If no session exists yet, create one on the fly before sending
    if (!sessionId) {
      try {
        const newSession = await this.chatService.createChatSession(null).toPromise();
        if (newSession) {
          this.sessions.update((curr) => [newSession, ...curr]);
          sessionId = newSession.id;
          this.currentSessionId.set(sessionId);
        }
      } catch (err) {
        console.error('Error al crear sesión para enviar mensaje:', err);
        return;
      }
    }

    if (!sessionId) return;

    this.sendingMessage.set(true);
    this.questionText.set('');

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };

    const assistantId = Date.now() + 1;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'ASSISTANT',
      content: '',
      createdAt: new Date().toISOString(),
    };

    this.messages.update((prev) => [...prev, userMsg, assistantMsg]);
    this.scrollToBottom();

    try {
      let firstChunk = true;
      this.streamingResponse.set(true);
      await this.chatService.sendMessageStream(sessionId, text, (chunk) => {
        if (firstChunk) {
          this.sendingMessage.set(false);
          firstChunk = false;
        }
        this.messages.update((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: (msg.content || '') + chunk } : msg
          )
        );
        this.scrollToBottom();
      });
      this.sendingMessage.set(false);
      this.streamingResponse.set(false);
    } catch (err) {
      console.error('Error al enviar mensaje en bubble (stream):', err);
      this.sendingMessage.set(false);
      this.streamingResponse.set(false);
      this.messages.update((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content:
                  (msg.content || '') +
                  '\n\n**Error:** ' +
                  this.translate('CHAT.ERROR_RESPONSE'),
              }
            : msg
        )
      );
      this.scrollToBottom();
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const el = this.scrollContainer()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 50);
  }
}
