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

@Component({
  selector: 'app-chat',
  imports: [FormsModule, DatePipe, MarkdownMathPipe],
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
}
