import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ChatService } from './chat.service';
import { CsrfService } from '../../../auth/services/csrf.service';
import { of, throwError } from 'rxjs';

function eventStreamResponse(frames: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });

  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/event-stream; charset=UTF-8' },
  });
}

describe('ChatService streaming responses', () => {
  let service: ChatService;
  const csrf = { getToken: vi.fn(() => of('chat-csrf-fixture')) };

  beforeEach(() => {
    csrf.getToken.mockReset().mockReturnValue(of('chat-csrf-fixture'));
    TestBed.configureTestingModule({ providers: [
      { provide: HttpClient, useValue: {} }, { provide: CsrfService, useValue: csrf }
    ] });
    service = TestBed.runInInjectionContext(() => new ChatService());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('decodes token events split across arbitrary network chunks and requires completion', async () => {
    const completeFrame =
      'event: token\ndata: {"text":"Según "}\n\n' +
      'event: token\ndata: {"text":"tus documentos."}\n\n' +
      'event: done\ndata: {}\n\n';
    const encoded = new TextEncoder().encode(completeFrame);
    const chunks = Array.from({ length: encoded.length }, (_, index) => encoded.slice(index, index + 1));
    const splitStream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(splitStream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const received: string[] = [];

    await service.sendMessageStream(5, '¿Qué temas hay?', (token) => received.push(token));

    expect(received).toEqual(['Según ', 'tus documentos.']);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/chat/sessions/5/stream'),
      expect.objectContaining({ headers: expect.objectContaining({
        Accept: 'text/event-stream', 'X-XSRF-TOKEN': 'chat-csrf-fixture'
      }), credentials: 'include' })
    );
  });

  it('rejects an upstream error instead of leaving partial text as a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(eventStreamResponse([
      'event: token\ndata: {"text":"Respuesta parcial"}\n\n',
      'event: error\ndata: {"code":"generation_failed"}\n\n',
    ])));

    await expect(service.sendMessageStream(5, 'pregunta', () => {})).rejects.toThrow(
      'incomplete response'
    );
  });

  it('rejects a stream that closes without a terminal done event', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(eventStreamResponse([
      'event: token\ndata: {"text":"Respuesta parcial"}\n\n',
    ])));

    await expect(service.sendMessageStream(5, 'pregunta', () => {})).rejects.toThrow(
      'sin una señal de finalización'
    );
  });

  it('rejects provider or HTTP failures without swallowing the error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 502 })));

    await expect(service.sendMessageStream(5, 'pregunta', () => {})).rejects.toThrow(
      'request failed (502)'
    );
  });

  it('does not start the provider stream without a valid CSRF bootstrap', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    csrf.getToken.mockReturnValueOnce(throwError(() => new Error('CSRF unavailable')));
    await expect(service.sendMessageStream(5, 'pregunta', () => {})).rejects.toThrow('CSRF unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
