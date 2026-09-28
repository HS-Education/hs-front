import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SeryBubbleService {
  /** Indica si la ventana emergente de chat del bubble está abierta */
  readonly isOpen = signal(false);
  readonly isMaximized = signal(false);

  /** Indica si en la vista actual se está filtrando por un curso específico */
  readonly isCourseFiltered = signal(false);

  toggleOpen(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }

    this.open();
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.isMaximized.set(false);
  }

  toggleMaximized(): void {
    this.isOpen.set(true);
    this.isMaximized.update((value) => !value);
  }

  setCourseFiltered(filtered: boolean): void {
    this.isCourseFiltered.set(filtered);
    if (filtered) {
      this.close();
    }
  }
}
