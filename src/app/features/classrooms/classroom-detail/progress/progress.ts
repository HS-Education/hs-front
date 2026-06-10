import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { UserDataService } from '../../../../shared/services/user-data.service';
import { AchievementService, ClassroomAchievementResource, StudentAchievementResource } from './services/achievement.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../../shared/services/toast.service';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { Modal } from '../../../../shared/components/modal/modal';
import { MarkdownMathPipe } from '../../../../shared/pipes/markdown-math.pipe';

@Component({
  selector: 'app-progress',
  imports: [ReactiveFormsModule, DecimalPipe, UpperCasePipe, Modal, MarkdownMathPipe],
  templateUrl: './progress.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  protected readonly userDataService = inject(UserDataService);
  private readonly achievementService = inject(AchievementService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  readonly classroomId = input.required<number>();

  // State
  readonly studentData = signal<StudentAchievementResource | null>(null);
  readonly classroomData = signal<ClassroomAchievementResource | null>(null);
  
  readonly isLoading = signal(false);
  readonly isGeneratingInsight = signal(false);

  // Recommendation Modal
  readonly isRecModalOpen = signal(false);
  readonly isGeneratingRec = signal(false);

  // Teacher View UI State
  readonly expandedStudentId = signal<number | null>(null);
  
  readonly recForm = this.fb.group({
    topicName: ['', Validators.required],
    contextText: ['', Validators.required],
    numQuestions: [5, [Validators.required, Validators.min(1), Validators.max(20)]]
  });

  constructor() {
    effect(() => {
      const cId = this.classroomId();
      if (cId) {
        this.loadData(cId);
      }
    });
  }

  private loadData(classroomId: number) {
    this.isLoading.set(true);
    if (this.userDataService.isStudentView()) {
      const studentId = this.userDataService.userProfile()?.id;
      if (!studentId) return;
      this.achievementService.getStudentAchievements(studentId).subscribe({
        next: (data) => {
          this.studentData.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else {
      this.achievementService.getClassroomAchievements(classroomId).subscribe({
        next: (data) => {
          this.classroomData.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  generateStudentInsight() {
    const studentId = this.userDataService.userProfile()?.id;
    if (!studentId) return;
    this.isGeneratingInsight.set(true);
    this.achievementService.generateStudentInsight(studentId).subscribe({
      next: () => {
        this.isGeneratingInsight.set(false);
        this.loadData(this.classroomId()); // reload
      },
      error: () => this.isGeneratingInsight.set(false)
    });
  }

  generateClassroomInsight() {
    this.isGeneratingInsight.set(true);
    this.achievementService.generateClassroomInsight(this.classroomId()).subscribe({
      next: () => {
        this.isGeneratingInsight.set(false);
        this.loadData(this.classroomId()); // reload
      },
      error: () => this.isGeneratingInsight.set(false)
    });
  }

  // Recommendations
  openRecModal() {
    this.recForm.reset({ numQuestions: 5 });
    this.isRecModalOpen.set(true);
  }

  closeRecModal = () => {
    this.isRecModalOpen.set(false);
  }

  toggleStudentDetails(studentId: number) {
    if (this.expandedStudentId() === studentId) {
      this.expandedStudentId.set(null);
    } else {
      this.expandedStudentId.set(studentId);
    }
  }

  submitRecommendation() {
    if (this.recForm.invalid) return;
    this.isGeneratingRec.set(true);
    const val = this.recForm.value;
    
    this.achievementService.generateClassroomRecommendation(this.classroomId(), {
      topicName: val.topicName!,
      contextText: val.contextText!,
      numQuestions: val.numQuestions!
    }).subscribe({
      next: () => {
        this.toastService.success('Cuestionario recomendado generado exitosamente');
        this.isGeneratingRec.set(false);
        this.closeRecModal();
      },
      error: () => this.isGeneratingRec.set(false)
    });
  }
}
