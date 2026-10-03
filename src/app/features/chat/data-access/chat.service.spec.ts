import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ChatService, ChatRequestError, chatErrorTranslationKey } from './chat.service';
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
  const csrf = { getToken: vi.fn(() => of('chat-csrf-fixture')), invalidate: vi.fn() };

  beforeEach(() => {
    csrf.getToken.mockReset().mockReturnValue(of('chat-csrf-fixture'));
    csrf.invalidate.mockReset();
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

  it('completes three consecutive messages without retrying or duplicating a response', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => eventStreamResponse([
      'event: token\ndata: {"text":"Synthetic answer"}\n\n', 'event: done\ndata: {}\n\n'
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const received: string[] = [];
    for (let turn = 0; turn < 3; turn++) await service.sendMessageStream(5, `greeting ${turn}`, text => received.push(text));
    expect(received).toEqual(['Synthetic answer', 'Synthetic answer', 'Synthetic answer']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(csrf.invalidate).not.toHaveBeenCalled();
  });

  it('renews an explicitly rejected CSRF token before starting the provider stream once', async () => {
    csrf.getToken.mockReturnValueOnce(of('old-chat-token')).mockReturnValueOnce(of('fresh-chat-token'));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({code: 'CSRF_TOKEN_INVALID'}), {status: 403}))
      .mockResolvedValueOnce(eventStreamResponse(['event: token\ndata: {"text":"answer"}\n\n', 'event: done\ndata: {}\n\n']));
    vi.stubGlobal('fetch', fetchMock);
    const received: string[] = [];
    await service.sendMessageStream(5, 'same question', text => received.push(text));
    expect(received).toEqual(['answer']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers['X-XSRF-TOKEN']).toBe('fresh-chat-token');
    expect(fetchMock.mock.calls[1][1].body).toBe(fetchMock.mock.calls[0][1].body);
    expect(csrf.invalidate).toHaveBeenCalledWith('old-chat-token');
  });

  it('does not loop after a second CSRF rejection', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(
      JSON.stringify({code: 'CSRF_TOKEN_MISSING'}), {status: 403}
    ));
    vi.stubGlobal('fetch', fetchMock);
    await expect(service.sendMessageStream(5, 'question', () => {})).rejects.toThrow('request failed (403)');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not replay permission, session, invalid JSON or server failures', async () => {
    for (const [status, body] of [[403, '{"code":"ACCESS_DENIED"}'], [403, 'not JSON'],
        [401, '{"code":"CSRF_TOKEN_INVALID"}'], [500, '{"code":"CSRF_TOKEN_INVALID"}']] as const) {
      const fetchMock = vi.fn().mockResolvedValue(new Response(body, {status}));
      vi.stubGlobal('fetch', fetchMock);
      await expect(service.sendMessageStream(5, 'question', () => {})).rejects.toThrow(`request failed (${status})`);
      expect(fetchMock).toHaveBeenCalledOnce();
    }
    expect(csrf.invalidate).not.toHaveBeenCalled();
  });

  it('does not retry a stream after partial output or network disconnection', async () => {
    const fetchMock = vi.fn().mockResolvedValue(eventStreamResponse([
      'event: token\ndata: {"text":"partial"}\n\n', 'event: error\ndata: {"code":"generation_failed"}\n\n'
    ]));
    vi.stubGlobal('fetch', fetchMock);
    await expect(service.sendMessageStream(5, 'question', () => {})).rejects.toThrow('incomplete response');
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockReset().mockRejectedValue(new TypeError('Synthetic disconnected network'));
    await expect(service.sendMessageStream(5, 'question', () => {})).rejects.toThrow('disconnected network');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('distinguishes rejected requests from interrupted streams in both chat interfaces', () => {
    expect(chatErrorTranslationKey(new ChatRequestError(401))).toBe('CHAT.SESSION_EXPIRED');
    expect(chatErrorTranslationKey(new ChatRequestError(403))).toBe('CHAT.REQUEST_REJECTED');
    expect(chatErrorTranslationKey(new ChatRequestError(500))).toBe('CHAT.REQUEST_FAILED');
    expect(chatErrorTranslationKey(new Error('incomplete stream'))).toBe('CHAT.STREAM_INTERRUPTED');
  });
});
