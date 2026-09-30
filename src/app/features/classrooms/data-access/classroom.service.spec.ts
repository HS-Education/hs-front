import {HttpErrorResponse, provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ClassroomService} from './classroom.service';

describe('ClassroomService empty collections', () => {
  let service: ClassroomService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    service = TestBed.inject(ClassroomService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('treats a legacy empty classroom response as an empty list', () => {
    let classrooms: unknown;
    service.getClassrooms(7).subscribe((value) => classrooms = value);

    http.expectOne((request) => request.url.endsWith('/classrooms') && request.params.get('userId') === '7')
      .flush(null, {status: 404, statusText: 'Not Found'});

    expect(classrooms).toEqual([]);
  });

  it('treats a legacy empty area response as an empty list', () => {
    let areas: unknown;
    service.getAreas().subscribe((value) => areas = value);

    http.expectOne((request) => request.url.endsWith('/areas'))
      .flush(null, {status: 404, statusText: 'Not Found'});

    expect(areas).toEqual([]);
  });

  it('still reports a real loading failure', () => {
    let receivedError: HttpErrorResponse | undefined;
    service.getClassrooms(7).subscribe({error: (error) => receivedError = error});

    http.expectOne((request) => request.url.endsWith('/classrooms'))
      .flush({message: 'Unavailable'}, {status: 503, statusText: 'Service Unavailable'});

    expect(receivedError?.status).toBe(503);
  });
});
