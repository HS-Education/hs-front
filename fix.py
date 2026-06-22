import sys

content = open('src/app/features/classrooms/classroom-detail/quizzes/quizzes.html', 'r', encoding='utf-8').read()
start_marker = '  <!-- Answers and AI Explanations List with Sidebar -->'
end_marker = '  }\n</div>\n}\n}\n} @else {'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Could not find markers')
    sys.exit(1)

new_block = """  <!-- Answers and AI Explanations List (2-column Grid) -->
  <div class="pt-2">
    <h4 class="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-6">Desglose de Preguntas y Feedback</h4>
    
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      @for (ans of sub.answers; track ans.questionId; let idx = $index) {
      <div [id]="'q-' + idx"
        class="rounded-xl border border-[var(--border)]/70 bg-[var(--surface)] p-5 md:p-6 flex flex-col shadow-sm">
        <!-- Question line -->
        <div class="flex items-start justify-between gap-4 border-b border-[var(--border)]/50 pb-4 mb-4">
          <div class="space-y-1.5">
            <span class="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Pregunta {{ idx + 1 }}</span>
            <p class="text-sm font-bold text-[var(--text-primary)] leading-relaxed">{{ ans.questionText }}</p>
          </div>
          <!-- Status tag -->
          <span [ngClass]="{
                        'bg-[var(--brand-forest)]/10 text-[var(--brand-forest)] border-[var(--brand-forest)]/20': ans.isCorrect,
                        'bg-[var(--brand-error)]/10 text-[var(--brand-error)] border-[var(--brand-error)]/20': !ans.isCorrect
                      }" class="inline-flex shrink-0 items-center rounded-lg border px-2.5 py-1 text-xs font-bold gap-2">
            <span>{{ ans.isCorrect ? 'Correcta' : 'Incorrecta' }}</span>
            @if (ans.isCorrect) {
            <span class="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--brand-forest)] text-white shrink-0">
              <i class="bi bi-check-lg !text-white text-[10px]"></i>
            </span>
            } @else {
            <span class="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--brand-error)] text-white shrink-0">
              <i class="bi bi-x-lg !text-white text-[9px]"></i>
            </span>
            }
          </span>
        </div>

        <!-- Options Grid in results -->
        <div class="grid gap-2.5 flex-1">
          @for (option of ans.options; track $index; let optIdx = $index) {
          <div [ngClass]="{
                          'border-[var(--brand-forest)] text-[var(--text-primary)]': optIdx === ans.correctOptionIndex,
                          'border-[var(--brand-error)] text-[var(--text-primary)]': optIdx === ans.selectedOptionIndex && optIdx !== ans.correctOptionIndex,
                          'border-[var(--border)] text-[var(--text-secondary)]/75': optIdx !== ans.selectedOptionIndex && optIdx !== ans.correctOptionIndex
                        }"
            [style.background-color]="optIdx === ans.correctOptionIndex ? 'color-mix(in srgb, var(--brand-forest) 8%, transparent)' : optIdx === ans.selectedOptionIndex ? 'color-mix(in srgb, var(--brand-error) 8%, transparent)' : 'var(--surface)'"
            class="flex items-center gap-3.5 p-3.5 rounded-lg border text-xs font-bold transition duration-150">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              [ngClass]="{
                                'bg-[var(--brand-forest)] text-white': optIdx === ans.correctOptionIndex,
                                'bg-[var(--brand-error)] text-white': optIdx === ans.selectedOptionIndex && optIdx !== ans.correctOptionIndex,
                                'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]': optIdx !== ans.selectedOptionIndex && optIdx !== ans.correctOptionIndex
                              }">
              @if (optIdx === ans.correctOptionIndex) {
              <i class="bi bi-check-lg !text-white"></i>
              } @else if (optIdx === ans.selectedOptionIndex) {
              <i class="bi bi-x-lg !text-white"></i>
              } @else {
              {{ optIdx + 1 }}
              }
            </span>
            <span class="leading-relaxed">{{ option }}</span>
            @if (optIdx === ans.correctOptionIndex) {
            <span class="text-[9px] font-extrabold uppercase tracking-wider text-[var(--brand-forest)] ml-auto shrink-0">Correcta</span>
            } @else if (optIdx === ans.selectedOptionIndex) {
            <span class="text-[9px] font-extrabold uppercase tracking-wider text-[var(--brand-error)] ml-auto shrink-0">Tu elección</span>
            }
          </div>
          }
        </div>

        <!-- Inline AI Feedback Bubble -->
        @if (ans.aiFeedback) {
        <div class="mt-5 pt-5 border-t border-[var(--border)]/50">
          <div class="rounded-xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 p-5 space-y-3">
            <div class="flex items-center gap-2.5">
              <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white font-extrabold text-[10px]">
                <i class="bi bi-lightbulb !text-white"></i>
              </span>
              <span class="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider">Explicación de Sery</span>
            </div>
            <div [innerHTML]="cleanMessageContent(ans.aiFeedback) | markdownMath" class="text-xs font-medium text-[var(--text-secondary)] leading-relaxed"></div>
            
            <!-- Sources Cards -->
            @if (getSources(ans.aiFeedback).length > 0) {
            <div class="mt-4 space-y-3 border-t border-[var(--brand-primary)]/10 pt-4">
              <div class="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-primary)]">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Documentos de Referencia
              </div>
              <div class="grid gap-2">
                @for (src of getSources(ans.aiFeedback); track src.documentId) {
                <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand-primary)]/30 p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 transition duration-150">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/15">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="25">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div class="min-w-0">
                      <h5 class="text-[11px] font-bold text-[var(--text-primary)] truncate" [title]="src.name">{{ src.name }}</h5>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button type="button" (click)="previewDocument(src.courseId, src.documentId, src.name)" class="flex-1 xl:flex-none justify-center flex items-center gap-1 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--text-primary)] transition active:scale-95">
                      Previsualizar
                    </button>
                    <button type="button" (click)="downloadSource(src.courseId, src.documentId)" class="flex-1 xl:flex-none justify-center flex items-center gap-1 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] px-2.5 py-1.5 text-[10px] font-bold text-white transition active:scale-95">
                      Descargar
                    </button>
                  </div>
                </div>
                }
              </div>
            </div>
            }
          </div>
        </div>
        } @else if (ans.isCorrect) {
        <div class="mt-5 pt-5 border-t border-[var(--border)]/50">
          <div class="rounded-xl bg-[var(--brand-forest)]/5 border border-[var(--brand-forest)]/20 p-5 flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-forest)]/10 text-[var(--brand-forest)] shrink-0">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p class="text-xs font-extrabold text-[var(--brand-forest)] uppercase tracking-wider mb-1">¡Respuesta Correcta!</p>
              <p class="text-[11px] font-medium text-[var(--text-secondary)] leading-relaxed">Sery genera explicaciones detalladas únicamente para las respuestas incorrectas con el fin de ayudarte a mejorar.</p>
            </div>
          </div>
        </div>
        }
      </div>
      }
    </div>
  </div>
"""

new_content = content[:start_idx] + new_block + content[end_idx:]

with open('src/app/features/classrooms/classroom-detail/quizzes/quizzes.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Success')
