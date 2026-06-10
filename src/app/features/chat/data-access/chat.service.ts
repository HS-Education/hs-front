import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../../../environment/environment';
import {ChatSession} from './models/chat-session.model';
import {ChatMessage} from './models/chat-message.model';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  getChatSessions(courseId?: number) {
    let params = new HttpParams();
    if (courseId) {
      params = params.set('courseId', courseId);
    }
    return this.http.get<ChatSession[]>(
      `${this.baseUrl}/chat/sessions`,
      { params, withCredentials: true }
    );
  }

  createChatSession(courseId?: number | null) {
    const body = courseId ? { courseId } : {};
    return this.http.post<ChatSession>(
      `${this.baseUrl}/chat/sessions`,
      body,
      { withCredentials: true }
    );
  }

  getChatHistory(sessionId: number) {
    return this.http.get<ChatMessage[]>(
      `${this.baseUrl}/chat/sessions/${sessionId}/messages`,
      { withCredentials: true }
    );
  }

  sendMessage(sessionId: number, question: string) {
    return this.http.post<ChatMessage>(
      `${this.baseUrl}/chat/sessions/${sessionId}/messages`,
      { question },
      { withCredentials: true }
    );
  }

  deleteChatSession(sessionId: number) {
    return this.http.delete<void>(
      `${this.baseUrl}/chat/sessions/${sessionId}`,
      { withCredentials: true }
    );
  }
}
