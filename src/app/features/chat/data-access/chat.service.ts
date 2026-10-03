import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environment/environment';
import { ChatSession } from './models/chat-session.model';
import { ChatMessage } from './models/chat-message.model';
import { firstValueFrom } from 'rxjs';
import { CsrfService } from '../../../auth/services/csrf.service';
import { isCsrfRejection } from '../../../auth/services/csrf-error';

export class ChatRequestError extends Error {
  constructor(readonly status: number) { super(`Chat stream request failed (${status})`); }
}

export function chatErrorTranslationKey(error: unknown): string {
  if (!(error instanceof ChatRequestError)) return 'CHAT.STREAM_INTERRUPTED';
  if (error.status === 401) return 'CHAT.SESSION_EXPIRED';
  if (error.status === 403) return 'CHAT.REQUEST_REJECTED';
  return 'CHAT.REQUEST_FAILED';
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly csrf = inject(CsrfService);

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
    const response = await this.openMessageStream(sessionId, question);

    if (!response.ok) {
      throw new ChatRequestError(response.status);
    }

    await this.consumeMessageStream(response, onChunk);
  }

  private async openMessageStream(sessionId: number, question: string, retried = false): Promise<Response> {
    const csrfToken = await firstValueFrom(this.csrf.getToken());
    const response = await fetch(`${this.baseUrl}/chat/sessions/${sessionId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'X-XSRF-TOKEN': csrfToken,
      },
      body: JSON.stringify({ question }),
      credentials: 'include'
    });

    if (response.status === 403) {
      const body: unknown = await response.clone().json().catch(() => null);
      if (isCsrfRejection(response.status, body)) {
        this.csrf.invalidate(csrfToken);
        if (!retried) return this.openMessageStream(sessionId, question, true);
      }
    }
    return response;
  }

  private async consumeMessageStream(response: Response, onChunk: (text: string) => void): Promise<void> {
    if (!response.body) {
      throw new Error('El entorno no soporta streaming (response.body es nulo).');
    }

    if (!response.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
      throw new Error('El servidor devolvió un formato de streaming inesperado.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let completed = false;

    const consumeEvent = (frame: string): void => {
      let eventType = 'message';
      const dataLines: string[] = [];

      for (const line of frame.split('\n')) {
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).replace(/^ /, ''));
        }
      }

      if (dataLines.length === 0) return;
      const payload = JSON.parse(dataLines.join('\n')) as { text?: unknown };

      if (eventType === 'token') {
        if (typeof payload.text !== 'string') throw new Error('Invalid chat token event.');
        onChunk(payload.text);
      } else if (eventType === 'done') {
        completed = true;
      } else if (eventType === 'error') {
        throw new Error('The chat stream reported an incomplete response.');
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (value) buffer += decoder.decode(value, { stream: true });
        if (done) buffer += decoder.decode();

        buffer = buffer.replace(/\r\n/g, '\n');
        let separator = buffer.indexOf('\n\n');
        while (separator >= 0) {
          const frame = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          consumeEvent(frame);
          if (completed) break;
          separator = buffer.indexOf('\n\n');
        }

        if (completed) {
          await reader.cancel().catch(() => undefined);
          break;
        }
        if (done) break;
      }
    } catch (streamError) {
      await reader.cancel().catch(() => undefined);
      throw streamError;
    } finally {
      reader.releaseLock();
    }

    if (!completed) {
      throw new Error('El flujo de Sery terminó sin una señal de finalización.');
    }
  }

  deleteChatSession(sessionId: number) {
    return this.http.delete<void>(
      `${this.baseUrl}/chat/sessions/${sessionId}`,
      { withCredentials: true }
    );
  }
}
