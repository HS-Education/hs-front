import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environment/environment';
import { ChatSession } from './models/chat-session.model';
import { ChatMessage } from './models/chat-message.model';

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

  async sendMessageStream(sessionId: number, question: string, onChunk: (text: string) => void): Promise<void> {
    const startTime = performance.now();
    let isFirstToken = true;

    const response = await fetch(`${this.baseUrl}/chat/sessions/${sessionId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error en la solicitud: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('El entorno no soporta streaming (response.body es nulo).');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          onChunk(decoder.decode(value, { stream: true }));
        }
      }
      // Flush any remaining bytes in the decoder
      const remaining = decoder.decode();
      if (remaining) {
        onChunk(remaining);
      }
    } catch (streamError) {
      // When Spring closes the connection, the reader may throw.
      // This is expected behavior — the data was already delivered.
      console.warn('Stream ended:', streamError);
    } finally {
      reader.releaseLock();
    }
  }

  deleteChatSession(sessionId: number) {
    return this.http.delete<void>(
      `${this.baseUrl}/chat/sessions/${sessionId}`,
      { withCredentials: true }
    );
  }
}
