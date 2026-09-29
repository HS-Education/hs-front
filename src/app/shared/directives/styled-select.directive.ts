import {
  AfterViewInit,
  Directive,
  DoCheck,
  ElementRef,
  inject,
  OnDestroy,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Directive({
  selector: 'select',
  standalone: true,
})
export class StyledSelectDirective implements AfterViewInit, DoCheck, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLSelectElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  private static activeInstance?: StyledSelectDirective;

  public static closeActive(): void {
    if (StyledSelectDirective.activeInstance) {
      StyledSelectDirective.activeInstance.setOpen(false);
      StyledSelectDirective.activeInstance = undefined;
    }
  }

  private root?: HTMLDivElement;
  private button?: HTMLButtonElement;
  private buttonLabel?: HTMLSpanElement;
  private menu?: HTMLDivElement;
  private observer?: MutationObserver;
  private cleanupListeners: Array<() => void> = [];
  private lastSelectedIndex = -2;
  private lastDisabled = false;
  private open = false;

  ngAfterViewInit(): void {
    const select = this.elementRef.nativeElement;
    const parent = select.parentNode;
    if (!parent) return;
    const initialWidth = select.getBoundingClientRect().width;

    this.root = this.document.createElement('div');
    this.root.className = 'app-select';
    if (select.dataset['accent'] === 'brand') this.root.classList.add('app-select--brand');
    if (select.classList.contains('w-full') || select.classList.contains('block')) {
      this.root.classList.add('app-select--full');
    } else if (initialWidth > 0) {
      this.root.style.width = `${Math.ceil(initialWidth)}px`;
    }

    this.button = this.document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'app-select__trigger';
    this.button.setAttribute('aria-haspopup', 'listbox');
    this.button.setAttribute('aria-expanded', 'false');

    this.buttonLabel = this.document.createElement('span');
    this.buttonLabel.className = 'app-select__label';

    const chevron = this.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('class', 'app-select__chevron');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2.5');
    const chevronPath = this.document.createElementNS('http://www.w3.org/2000/svg', 'path');
    chevronPath.setAttribute('d', 'm6 9 6 6 6-6');
    chevronPath.setAttribute('stroke-linecap', 'round');
    chevronPath.setAttribute('stroke-linejoin', 'round');
    chevron.appendChild(chevronPath);

    this.button.append(this.buttonLabel, chevron);
    parent.insertBefore(this.root, select);
    this.root.append(this.button, select);
    select.classList.add('app-select__native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    this.menu = this.document.createElement('div');
    this.menu.className = 'app-select__menu';
    if (select.dataset['accent'] === 'brand') this.menu.classList.add('app-select__menu--brand');
    if (select.dataset['menuLayout'] === 'compact') this.menu.classList.add('app-select__menu--compact');
    this.menu.setAttribute('role', 'listbox');
    this.menu.hidden = true;
    this.document.body.appendChild(this.menu);

    this.listen(this.button, 'click', event => {
      event.stopPropagation();
      if (select.disabled) return;
      if (!this.open) {
        StyledSelectDirective.closeActive();
        this.setOpen(true);
      } else {
        this.setOpen(false);
      }
    });
    this.listen(this.button, 'keydown', event => this.onKeydown(event as KeyboardEvent));
    this.listen(this.document, 'click', event => {
      const target = event.target as Node | null;
      if (target && !this.root?.contains(target) && !this.menu?.contains(target)) this.setOpen(false);
    });
    this.listen(this.document, 'scroll', event => {
      const target = event.target as Node | null;
      if (!target || !this.menu?.contains(target)) this.setOpen(false);
    }, true);
    this.listen(window, 'resize', () => this.setOpen(false));

    this.observer = new MutationObserver(() => {
      this.lastSelectedIndex = -2;
      this.syncFromSelect();
      if (this.open) this.renderOptions();
    });
    this.observer.observe(select, { childList: true, subtree: true, characterData: true, attributes: true });
    this.syncFromSelect();
  }

  ngDoCheck(): void {
    this.syncFromSelect();
  }

  ngOnDestroy(): void {
    if (StyledSelectDirective.activeInstance === this) {
      StyledSelectDirective.activeInstance = undefined;
    }
    this.observer?.disconnect();
    this.cleanupListeners.forEach(cleanup => cleanup());
    this.menu?.remove();
  }

  private syncFromSelect(): void {
    if (!this.button || !this.buttonLabel) return;
    const select = this.elementRef.nativeElement;
    if (select.selectedIndex !== this.lastSelectedIndex) {
      this.lastSelectedIndex = select.selectedIndex;
      const selectedOption = select.selectedOptions[0];
      this.buttonLabel.textContent = selectedOption?.dataset['triggerLabel']?.trim()
        || selectedOption?.textContent?.trim()
        || '';
      if (this.open) this.renderOptions();
    }
    if (select.disabled !== this.lastDisabled) {
      this.lastDisabled = select.disabled;
      this.button.disabled = select.disabled;
      this.root?.classList.toggle('app-select--disabled', select.disabled);
    }
  }

  private setOpen(open: boolean): void {
    if (!this.button || !this.menu || open === this.open) return;
    this.open = open;
    this.button.setAttribute('aria-expanded', String(open));
    this.button.classList.toggle('app-select__trigger--open', open);
    if (!open) {
      if (StyledSelectDirective.activeInstance === this) {
        StyledSelectDirective.activeInstance = undefined;
      }
      this.menu.hidden = true;
      return;
    }

    if (StyledSelectDirective.activeInstance && StyledSelectDirective.activeInstance !== this) {
      StyledSelectDirective.activeInstance.setOpen(false);
    }
    StyledSelectDirective.activeInstance = this;

    this.renderOptions();
    this.positionMenu();
    this.menu.hidden = false;
  }

  private renderOptions(): void {
    if (!this.menu) return;
    const select = this.elementRef.nativeElement;
    this.menu.replaceChildren();

    Array.from(select.options).forEach((option, index) => {
      if (option.hidden) return;
      // Skip empty placeholder option
      if (option.disabled && (!option.value || option.value === 'null' || option.value === '')) return;
      const item = this.document.createElement('button');
      item.type = 'button';
      item.className = 'app-select__option';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === select.selectedIndex));
      item.disabled = option.disabled;

      const label = this.document.createElement('span');
      const compact = select.dataset['menuLayout'] === 'compact';
      if (compact && option.dataset['menuSecondary']) {
        label.className = 'app-select__option-label';
        const primary = this.document.createElement('span');
        primary.className = 'app-select__option-primary';
        primary.textContent = option.dataset['menuPrimary'] || option.textContent?.trim() || '';
        const secondary = this.document.createElement('span');
        secondary.className = 'app-select__option-secondary';
        secondary.textContent = option.dataset['menuSecondary'];
        label.append(primary, secondary);
        item.setAttribute('aria-label', option.textContent?.trim() || '');
      } else {
        label.textContent = option.textContent?.trim() || '';
      }
      item.appendChild(label);

      if (index === select.selectedIndex) {
        item.classList.add('app-select__option--selected');
        const check = this.document.createElement('span');
        check.className = 'app-select__check';
        check.textContent = '✓';
        check.setAttribute('aria-hidden', 'true');
        item.appendChild(check);
      }

      item.addEventListener('click', event => {
        event.stopPropagation();
        if (option.disabled) return;
        select.selectedIndex = index;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        this.lastSelectedIndex = -2;
        this.syncFromSelect();
        this.setOpen(false);
        this.button?.focus();
      });
      this.menu?.appendChild(item);
    });
  }

  private positionMenu(): void {
    if (!this.button || !this.menu) return;
    const rect = this.button.getBoundingClientRect();
    const select = this.elementRef.nativeElement;
    const compact = select.dataset['menuLayout'] === 'compact';
    const estimatedHeight = Math.min(compact ? 192 : 280, Math.max(44, select.options.length * (compact ? 46 : 40) + 12));
    const preferUp = select.dataset['menuPlacement'] === 'top';
    const openUp = (preferUp || window.innerHeight - rect.bottom < estimatedHeight) && rect.top > estimatedHeight + 12;
    const menuWidth = this.getMenuWidth(rect.width);
    const menuLeft = select.dataset['menuAlign'] === 'end' ? rect.right - menuWidth : rect.left;
    this.menu.style.left = `${Math.max(12, Math.min(menuLeft, window.innerWidth - menuWidth - 12))}px`;
    this.menu.style.width = `${menuWidth}px`;
    this.menu.style.top = openUp ? 'auto' : `${rect.bottom + 6}px`;
    this.menu.style.bottom = openUp ? `${window.innerHeight - rect.top + 6}px` : 'auto';
  }

  private getMenuWidth(triggerWidth: number): number {
    if (this.elementRef.nativeElement.dataset['menuLayout'] === 'compact') {
      return Math.min(window.innerWidth - 24, Math.max(200, Math.min(220, triggerWidth)));
    }
    const canvas = this.document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return triggerWidth;

    context.font = '600 12px system-ui, sans-serif';
    const widestLabel = Array.from(this.elementRef.nativeElement.options)
      .filter(option => !option.hidden)
      .reduce((width, option) => Math.max(width, context.measureText(option.textContent?.trim() || '').width), 0);
    const availableWidth = Math.max(160, window.innerWidth - 24);
    return Math.min(availableWidth, Math.max(triggerWidth, Math.ceil(widestLabel + 68)));
  }

  private onKeydown(event: KeyboardEvent): void {
    const select = this.elementRef.nativeElement;
    if (event.key === 'Escape') {
      this.setOpen(false);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!this.open) {
      this.setOpen(true);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') return;

    const direction = event.key === 'ArrowDown' ? 1 : -1;
    let index = select.selectedIndex;
    do {
      index = Math.max(0, Math.min(select.options.length - 1, index + direction));
    } while (select.options[index]?.disabled && index > 0 && index < select.options.length - 1);
    if (!select.options[index]?.disabled) {
      select.selectedIndex = index;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      this.lastSelectedIndex = -2;
      this.syncFromSelect();
    }
  }

  private listen(target: EventTarget, eventName: string, handler: EventListener, capture = false): void {
    target.addEventListener(eventName, handler, capture);
    this.cleanupListeners.push(() => target.removeEventListener(eventName, handler, capture));
  }
}
