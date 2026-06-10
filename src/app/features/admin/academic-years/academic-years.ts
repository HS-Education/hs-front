import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { AcademicYearService } from './services/academic-year.service';
import { AcademicYear, GradingPeriod } from './models/academic-year.model';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../shared/services/toast.service';
import { Modal } from '../../../shared/components/modal/modal';
import { TranslateEnumPipe } from '../../../shared/pipes/translate-enum.pipe';

@Component({
  selector: 'app-academic-years',
  standalone: true,
  imports: [DatePipe, NgClass, FormsModule, Modal, TranslateEnumPipe],
  templateUrl: './academic-years.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicYears implements OnInit {
  private readonly academicYearService = inject(AcademicYearService);
  private readonly toastService = inject(ToastService);

  readonly years = signal<AcademicYear[]>([]);
  readonly selectedYear = signal<AcademicYear | null>(null);
  readonly gradingPeriods = signal<GradingPeriod[]>([]);

  readonly isLoading = signal(false);
  readonly isGenerating = signal(false);
  readonly showConfirmGenerate = signal(false);

  // Inline edit state
  readonly editingPeriodId = signal<number | null>(null);
  readonly editStartDate = signal<string>('');
  readonly editEndDate = signal<string>('');

  ngOnInit() {
    this.loadYears();
  }

  loadYears() {
    this.isLoading.set(true);
    this.academicYearService.getAllAcademicYears().subscribe({
      next: (data) => {
        const sorted = data.sort((a, b) => b.year - a.year);
        this.years.set(sorted);
        this.isLoading.set(false);
        if (sorted.length > 0 && !this.selectedYear()) {
          this.selectYear(sorted[0]);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  selectYear(year: AcademicYear) {
    this.selectedYear.set(year);
    this.cancelEdit();
    this.loadGradingPeriods(year.id);
  }

  loadGradingPeriods(yearId: number) {
    this.academicYearService.getGradingPeriods(yearId).subscribe({
      next: (periods) => {
        const sorted = periods.sort((a, b) => {
          return Number(this.getBimesterNumber(a.bimester)) - Number(this.getBimesterNumber(b.bimester));
        });
        this.gradingPeriods.set(sorted);
      },
      error: () => {}
    });
  }

  requestGenerateYear() {
    this.showConfirmGenerate.set(true);
  }

  cancelGenerateYear = () => {
    this.showConfirmGenerate.set(false);
  };

  confirmGenerateYear() {
    this.showConfirmGenerate.set(false);
    this.isGenerating.set(true);
    this.academicYearService.generateAcademicYear().subscribe({
      next: (newYear) => {
        this.isGenerating.set(false);
        this.toastService.success(`Año ${newYear.year} generado con éxito`);
        this.loadYears();
        this.selectYear(newYear);
      },
      error: () => {
        this.isGenerating.set(false);
      }
    });
  }

  startEdit(period: GradingPeriod) {
    this.editingPeriodId.set(period.id);
    this.editStartDate.set(period.startDate ?? '');
    this.editEndDate.set(period.endDate ?? '');
  }

  cancelEdit() {
    this.editingPeriodId.set(null);
    this.editStartDate.set('');
    this.editEndDate.set('');
  }

  saveEdit(period: GradingPeriod) {
    if (!this.selectedYear() || !this.editStartDate() || !this.editEndDate()) return;

    this.academicYearService.updateGradingPeriod(
      this.selectedYear()!.id,
      period.id,
      { startDate: this.editStartDate(), endDate: this.editEndDate() }
    ).subscribe({
      next: (updatedPeriod) => {
        // Update the list locally
        this.gradingPeriods.update(periods => 
          periods.map(p => p.id === updatedPeriod.id ? updatedPeriod : p)
        );
        this.cancelEdit();
        // optionally reload years to update the general status if needed
        this.loadYears();
      },
      error: () => {}
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-[#166534] text-white border-[#166534]';
      case 'FINISHED':
      case 'CLOSED': return 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]';
      case 'PLANNED': return 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border)]';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getBimesterNumber(bimester: string): string {
    switch (bimester) {
      case 'FIRST':
      case 'BIMESTER_1': return '1';
      case 'SECOND':
      case 'BIMESTER_2': return '2';
      case 'THIRD':
      case 'BIMESTER_3': return '3';
      case 'FOURTH':
      case 'BIMESTER_4': return '4';
      default: return '?';
    }
  }
}
