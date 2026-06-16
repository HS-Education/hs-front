import { Component, computed, signal, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../shared/components/modal/modal';

export interface Tutorial {
  id: number;
  title: string;
  description: string;
  type: 'VIDEO' | 'DOCUMENT';
  duration: string; // e.g., '3 min', 'PDF'
  thumbnailUrl?: string;
  videoUrl?: string; // used for mock playback
  documentUrl?: string;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  isOpen?: boolean;
}

export type HelpFilter = 'ALL' | 'VIDEO' | 'DOCUMENT' | 'FAQ';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './help.html',
  styleUrls: []
})
export class HelpCenter {
  readonly searchQuery = signal('');
  readonly selectedFilter = signal<HelpFilter>('ALL');

  // Video Modal State
  readonly isVideoModalOpen = signal(false);
  readonly selectedVideo = signal<Tutorial | null>(null);

  // Mock Data: Tutorials
  readonly tutorials = signal<Tutorial[]>([
    {
      id: 1,
      title: 'Cómo analizar el progreso del estudiante',
      description: 'Aprende a interpretar los gráficos de tendencia y rendimiento detallado por temas.',
      type: 'VIDEO',
      duration: '4:20',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' // placeholder or leave empty for mock
    },
    {
      id: 2,
      title: 'Carga masiva de documentos',
      description: 'Guía paso a paso para subir múltiples archivos al repositorio de la clase.',
      type: 'VIDEO',
      duration: '2:45'
    },
    {
      id: 3,
      title: 'Guía de Métricas del Área',
      description: 'Documento detallando cómo utilizar el panel de coordinación para tomar decisiones.',
      type: 'DOCUMENT',
      duration: 'PDF (2.3 MB)'
    },
    {
      id: 4,
      title: 'Uso de Sery para generar Insights',
      description: 'Aprovecha la inteligencia artificial para obtener resúmenes de rendimiento de tus aulas.',
      type: 'VIDEO',
      duration: '5:10'
    }
  ]);

  // Mock Data: FAQs
  readonly faqs = signal<Faq[]>([
    {
      id: 1,
      question: '¿Qué significan los colores en el rendimiento?',
      answer: 'El color verde indica un desempeño sobresaliente (mayor o igual a 80%). El color amarillo/mostaza significa que el rendimiento está en proceso o es aceptable (entre 50% y 79%). El color rojo indica que requiere atención inmediata (menor a 50%).'
    },
    {
      id: 2,
      question: '¿Cómo puedo cambiar mi contraseña?',
      answer: 'Actualmente, el cambio de contraseña debe solicitarse directamente al administrador del sistema o a través del enlace de "Olvidé mi contraseña" en la pantalla de inicio de sesión.'
    },
    {
      id: 3,
      question: '¿Quién tiene acceso a las Métricas del Área?',
      answer: 'Solo los usuarios con rol de Coordinador Académico o Administrador tienen acceso a esta sección. Los profesores solo pueden ver el progreso de las aulas que tienen asignadas.'
    },
    {
      id: 4,
      question: '¿Puedo subir videos al Repositorio de la clase?',
      answer: 'El repositorio está optimizado para documentos (PDF, Word, etc.). Si deseas compartir un video, te recomendamos subirlo a una plataforma de streaming externa y compartir el enlace en un documento.'
    }
  ]);

  // Derived state: Filtered Tutorials
  readonly filteredTutorials = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();
    
    return this.tutorials().filter(tut => {
      // 1. Filter by Type
      if (filter === 'FAQ') return false; // Hide tutorials if FAQ is explicitly selected
      if (filter === 'VIDEO' && tut.type !== 'VIDEO') return false;
      if (filter === 'DOCUMENT' && tut.type !== 'DOCUMENT') return false;
      
      // 2. Filter by Search Query
      if (query && !tut.title.toLowerCase().includes(query) && !tut.description.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  });

  // Derived state: Filtered FAQs
  readonly filteredFaqs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.selectedFilter();

    return this.faqs().filter(faq => {
      // 1. Filter by Type
      if (filter === 'VIDEO' || filter === 'DOCUMENT') return false; // Hide FAQs if video/doc is selected
      
      // 2. Filter by Search Query
      if (query && !faq.question.toLowerCase().includes(query) && !faq.answer.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  });

  readonly isPdfPreviewOpen = signal(false);
  readonly selectedPdf = signal<Tutorial | null>(null);
  readonly previewSecureUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal(false);

  private readonly sanitizer = inject(DomSanitizer);

  setFilter(filter: HelpFilter) {
    this.selectedFilter.set(filter);
  }

  toggleFaq(id: number) {
    this.faqs.update(list => list.map(f => {
      if (f.id === id) {
        return { ...f, isOpen: !f.isOpen };
      }
      return f;
    }));
  }

  openVideoModal(tutorial: Tutorial) {
    if (tutorial.type === 'VIDEO') {
      this.selectedVideo.set(tutorial);
      this.isVideoModalOpen.set(true);
    }
  }

  closeVideoModal = (): void => {
    this.isVideoModalOpen.set(false);
    this.selectedVideo.set(null);
  }

  previewDocument(tutorial: Tutorial) {
    if (tutorial.type === 'DOCUMENT') {
      this.selectedPdf.set(tutorial);
      this.isPdfPreviewOpen.set(true);
      this.previewLoading.set(true);
      
      // Simulate network delay to fetch safe URL
      setTimeout(() => {
        // A minimal blank PDF in base64 to avoid CSP / Frame-Ancestors errors
        const dummyPdfUrl = 'data:application/pdf;base64,JVBERi0xLjAKMSAwIG9iago8PC9QYWdlcyAyIDAgUiAvVHlwZSAvQ2F0YWxvZz4+CmVuZG9iagoyIDAgb2JqCjw8L0NvdW50IDEgL0tpZHMgWzMgMCBSXSAvVHlwZSAvUGFnZXM+PgplbmRvYmoKMyAwIG9iago8PC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9QYXJlbnQgMiAwIFIgL1R5cGUgL1BhZ2U+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8L1Jvb3QgMSAwIFIgL1NpemUgND4+CnN0YXJ0eHJlZgoxNzMKJSVFT0YK';
        this.previewSecureUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(dummyPdfUrl));
        this.previewLoading.set(false);
      }, 1200);
    }
  }

  closePdfPreview = (): void => {
    this.isPdfPreviewOpen.set(false);
    this.selectedPdf.set(null);
    this.previewSecureUrl.set(null);
    this.previewLoading.set(false);
  }
}
