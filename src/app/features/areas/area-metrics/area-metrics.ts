import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { UserDataService } from '../../../shared/services/user-data.service';
import { ClassroomService } from '../../classrooms/data-access/classroom.service';
import { AchievementService, AreaAchievementResource, AreaPerformanceResource } from '../../classrooms/classroom-detail/progress/services/achievement.service';
import { MarkdownMathPipe } from '../../../shared/pipes/markdown-math.pipe';

@Component({
  selector: 'app-area-metrics',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoPipe],
  templateUrl: './area-metrics.html',
  styleUrls: []
})
export class AreaMetrics implements OnInit {
  private readonly userDataService = inject(UserDataService);
  private readonly classroomService = inject(ClassroomService);
  private readonly achievementService = inject(AchievementService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translocoService = inject(TranslocoService);

  readonly isLoading = signal(true);
  readonly coordinatorAreaId = signal<number | null>(null);
  readonly areaData = signal<AreaAchievementResource | null>(null);

  // Derived state
  readonly areaPerformance = computed(() => this.areaData()?.performance);
  readonly latestInsight = computed(() => this.areaData()?.latestInsight);
  readonly isGeneratingInsight = signal(false);

  readonly sortedClassrooms = computed(() => {
    const perf = this.areaPerformance();
    if (!perf || !perf.classrooms) return [];
    return [...perf.classrooms].sort((a, b) => b.averageScore - a.averageScore);
  });

  ngOnInit() {
    this.loadCoordinatorArea();
  }

  private loadCoordinatorArea() {
    this.isLoading.set(true);
    const user = this.userDataService.userProfile();
    if (!user) {
      this.isLoading.set(false);
      return;
    }

    this.classroomService.getAreas().subscribe({
      next: (areas) => {
        // The backend AreaResource only exposes coordinatorName, not coordinatorId.
        // We match by the user's full name to find their assigned area.
        const matchingArea = areas.find(a => a.coordinatorName === user.name);
        if (matchingArea) {
          this.coordinatorAreaId.set(matchingArea.id);
          this.loadAreaAchievements(matchingArea.id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  private loadAreaAchievements(areaId: number) {
    this.achievementService.getAreaAchievements(areaId).subscribe({
      next: (data) => {
        this.areaData.set(data);
        this.isLoading.set(false);
        
        // Autogenerate insight if missing
        if (!data.latestInsight) {
          this.generateAreaInsight();
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  generateAreaInsight() {
    const areaId = this.coordinatorAreaId();
    if (!areaId) return;

    this.isGeneratingInsight.set(true);
    this.achievementService.generateAreaInsight(areaId).subscribe({
      next: () => {
        this.isGeneratingInsight.set(false);
        this.loadAreaAchievements(areaId); // Reload to get the new insight
      },
      error: () => this.isGeneratingInsight.set(false)
    });
  }

  getSources(content: string | null | undefined): {name: string, courseId: number, documentId: number, downloadUrl: string}[] {
    if (!content) return [];
    const sources: {name: string, courseId: number, documentId: number, downloadUrl: string}[] = [];
    
    const regex1 = /(?:\*\*)?Fuente:(?:\*\*)?\s*(.*?)\s*(?:\*\*)?Enlace de descarga:(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
    let match: RegExpExecArray | null;
    while ((match = regex1.exec(content)) !== null) {
      sources.push({
        name: match[1].replace(/\*\*/g, '').trim(),
        courseId: Number(match[2]),
        documentId: Number(match[3]),
        downloadUrl: `/api/v1/courses/${match[2]}/documents/${match[3]}/download`
      });
    }

    const regex2 = /\[([^\]]+)\]\((?:.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download)\)/gi;
    while ((match = regex2.exec(content)) !== null) {
      if (!sources.some(s => s.courseId === Number(match![2]) && s.documentId === Number(match![3]))) {
        sources.push({
          name: match![1].replace(/\*\*/g, '').trim(),
          courseId: Number(match![2]),
          documentId: Number(match![3]),
          downloadUrl: `/api/v1/courses/${match![2]}/documents/${match![3]}/download`
        });
      }
    }

    return sources;
  }

  renderInsightContent(rawText: string | null | undefined): SafeHtml {
    rawText = rawText || '';
    const sources = this.getSources(rawText);

    if (sources.length > 0) {
      const regex1 = /\s*(?:\[\d+\])?\s*(?:\*\*)?Fuente:(?:\*\*)?\s*(.*?)\s*(?:\*\*)?Enlace de descarga:(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
      rawText = rawText.replace(regex1, '');

      const regex2 = /\s*(?:(?:\*\*)?Material de apoyo:(?:\*\*)?\s*)?\[([^\]]+)\]\((?:.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download)\)/gi;
      rawText = rawText.replace(regex2, '');
      
      // Cleanup AI hallucinated source text
      rawText = rawText.replace(/(?:\*\*)?Fuente:(?:\*\*)?\s*Contexto[^\n]*/gi, '');
    }

    let htmlString = MarkdownMathPipe.process(rawText);

    if (sources.length > 0) {
      htmlString = htmlString.replace(/\s*\[(\d+)\]/g, (match, p1) => {
        const idx = Number(p1) - 1;
        if (idx >= 0 && idx < sources.length) {
          return ''; // Strip inline citations
        }
        return match;
      });

      // Remove empty paragraphs that might be left over from stripping
      htmlString = htmlString.replace(/<p>(?:\s|<br\/>)*<\/p>/gi, '');

      let badgesHtml = '<div class="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-2.5">';
      sources.forEach((src, idx) => {
        badgesHtml += `<a href="javascript:void(0)" data-source-index="${idx}" class="inline-flex items-center gap-1.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 hover:underline px-3 py-1.5 rounded-lg font-semibold text-xs transition border border-[var(--brand-primary)]/20 w-auto">
            <span class="text-[var(--brand-primary)] font-bold px-0.5 py-0.5 text-[10px] tracking-wide">[${idx + 1}]</span> 
            <span>${src.name}</span>
          </a>`;
      });
      badgesHtml += '</div>';

      htmlString += badgesHtml;
    }

    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }

  handleInsightClick(event: MouseEvent, content: string | null | undefined): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a[data-source-index]');
    if (anchor) {
      event.preventDefault();
      const indexAttr = anchor.getAttribute('data-source-index');
      if (indexAttr !== null) {
        const idx = Number(indexAttr);
        const sources = this.getSources(content);
        if (idx >= 0 && idx < sources.length) {
          const src = sources[idx];
          this.classroomService.getDocumentDownloadUrl(src.courseId, src.documentId).subscribe({
            next: (response) => {
              const link = document.createElement('a');
              link.href = response.url;
              link.download = src.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            },
            error: (err) => console.error('Error getting download URL:', err)
          });
        }
      }
    }
  }

  getScoreColorClass(score: number): string {
    if (score >= 80) return 'text-[var(--brand-forest)]';
    if (score >= 50) return 'text-[var(--brand-mustard)]';
    return 'text-[var(--brand-error)]';
  }

  getScoreBgClass(score: number): string {
    if (score >= 80) return 'bg-[var(--brand-forest)]/10';
    if (score >= 50) return 'bg-[var(--brand-mustard)]/10';
    return 'bg-[var(--brand-error)]/10';
  }

  getScoreProgressClass(score: number): string {
    if (score >= 80) return 'bg-[var(--brand-forest)]';
    if (score >= 50) return 'bg-[var(--brand-mustard)]';
    return 'bg-[var(--brand-error)]';
  }

  getGradeCategory(score: number): string {
    if (score >= 80) return this.translocoService.translate('AREAS.GRADE_EXCELLENT');
    if (score >= 50) return this.translocoService.translate('AREAS.GRADE_IN_PROGRESS');
    return this.translocoService.translate('AREAS.GRADE_NEEDS_ATTENTION');
  }

  navigateToClassroom(classroomId: number) {
    // Add a state param to indicate we came from metrics, so the back button can be shown
    this.router.navigate(['/classrooms', classroomId], { state: { fromMetrics: true } });
  }
}
