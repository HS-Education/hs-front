import { TestBed } from '@angular/core/testing';
import { SeryGenerationStateService } from './sery-generation-state.service';

describe('SeryGenerationStateService', () => {
  let state: SeryGenerationStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    state = TestBed.inject(SeryGenerationStateService);
  });

  it('keeps one generation active across consumers and rejects duplicate starts', () => {
    expect(state.begin('area', 12)).toBe(true);
    expect(state.isGenerating('area', 12)).toBe(true);
    expect(state.begin('area', 12)).toBe(false);

    state.finish('area', 12);

    expect(state.isGenerating('area', 12)).toBe(false);
    expect(state.begin('area', 12)).toBe(true);
  });

  it('tracks different areas and classrooms independently', () => {
    state.begin('area', 12);
    state.begin('classroom', 12);
    state.begin('classroom', 13);

    state.finish('classroom', 12);

    expect(state.isGenerating('area', 12)).toBe(true);
    expect(state.isGenerating('classroom', 12)).toBe(false);
    expect(state.isGenerating('classroom', 13)).toBe(true);
  });
});
