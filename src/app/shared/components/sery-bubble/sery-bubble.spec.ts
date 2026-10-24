import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {TranslocoService} from '@jsverse/transloco';
import {Subject, of} from 'rxjs';
import {SeryBubble} from './sery-bubble';
import {SeryBubbleService} from './sery-bubble.service';
import {ChatService} from '../../../features/chat/data-access/chat.service';
import {ClassroomService} from '../../../features/classrooms/data-access/classroom.service';
import {ChatSession} from '../../../features/chat/data-access/models/chat-session.model';
import {UserDataService} from '../../services/user-data.service';
import {LanguageService} from '../../../core/i18n/language.service';

const session = (id: number): ChatSession => ({id, sessionNumber: id, courseId: null, userId: 7});

describe('Sery bubble session lifecycle', () => {
  let page: SeryBubble;
  let list: Subject<ChatSession[]>;
  let created: Subject<ChatSession>;
  let deleted: Subject<void>;
  let api: {getChatSessions: ReturnType<typeof vi.fn>; createChatSession: ReturnType<typeof vi.fn>; deleteChatSession: ReturnType<typeof vi.fn>; getChatHistory: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    list = new Subject(); created = new Subject(); deleted = new Subject();
    api = {getChatSessions: vi.fn(() => list), createChatSession: vi.fn(() => created),
      deleteChatSession: vi.fn(() => deleted), getChatHistory: vi.fn(() => of([]))};
    TestBed.configureTestingModule({providers: [
      {provide: ChatService, useValue: api},
      {provide: SeryBubbleService, useValue: {isOpen: signal(true), isMaximized: signal(false)}},
      {provide: ClassroomService, useValue: {}},
      {provide: UserDataService, useValue: {userProfile: () => null}},
      {provide: DomSanitizer, useValue: {}},
      {provide: LanguageService, useValue: {activeLanguage: () => 'es'}},
      {provide: TranslocoService, useValue: {translate: (key: string) => key}},
    ]});
    page = TestBed.runInInjectionContext(() => new SeryBubble());
    page.ngOnInit();
  });

  it('creates only one session when initialization and the open effect see an empty list', () => {
    TestBed.tick();
    expect(api.getChatSessions).toHaveBeenCalledTimes(1);
    list.next([]);
    TestBed.tick();
    page.loadSessionsAndSelect();
    page.createNewSession();
    expect(api.createChatSession).toHaveBeenCalledTimes(1);
    created.next(session(1));
    TestBed.tick();
    expect(page.sessions()).toEqual([session(1)]);
    expect(api.getChatSessions).toHaveBeenCalledTimes(1);
  });

  it('deleting both sessions creates exactly one replacement and never reloads an empty list', () => {
    list.next([session(1), session(2)]);
    page.deleteSession(1);
    expect(api.deleteChatSession).not.toHaveBeenCalled();
    page.confirmDeleteSession();
    deleted.next();
    TestBed.tick();
    expect(page.sessions()).toEqual([session(2)]);
    expect(api.createChatSession).not.toHaveBeenCalled();
    page.deleteSession(2);
    page.confirmDeleteSession();
    page.confirmDeleteSession();
    deleted.next();
    TestBed.tick();
    page.createNewSession();
    page.loadSessionsAndSelect();
    expect(api.deleteChatSession).toHaveBeenCalledTimes(2);
    expect(api.createChatSession).toHaveBeenCalledTimes(1);
    created.next(session(3));
    TestBed.tick();
    expect(page.sessions()).toEqual([session(3)]);
    expect(page.currentSessionId()).toBe(3);
    expect(api.getChatSessions).toHaveBeenCalledTimes(1);
  });

  it('cancel does not delete; a failed delete preserves the session and allows retry', () => {
    list.next([session(1)]);
    page.deleteSession(1);
    page.cancelDeleteSession();
    page.confirmDeleteSession();
    expect(api.deleteChatSession).not.toHaveBeenCalled();
    page.deleteSession(1);
    page.confirmDeleteSession();
    deleted.error(new Error('offline'));
    expect(page.deleteSessionError()).toBe(true);
    expect(page.deletingSession()).toBe(false);
    expect(page.pendingDeleteSession()?.id).toBe(1);
    expect(page.sessions()).toEqual([session(1)]);
    expect(api.createChatSession).not.toHaveBeenCalled();
  });

  it('a failed initial creation does not start an automatic creation loop', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    list.next([]);
    created.error(new Error('offline'));
    TestBed.tick();
    expect(page.creatingSession()).toBe(false);
    expect(api.createChatSession).toHaveBeenCalledTimes(1);
    expect(api.getChatSessions).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
