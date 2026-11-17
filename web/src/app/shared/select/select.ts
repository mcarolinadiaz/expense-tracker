import { CdkListbox, CdkOption, ListboxValueChangeEvent } from '@angular/cdk/listbox';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';

export interface SelectOption<T> {
  value: T;
  label: string;
}

const PANEL_GAP_PX = 4;

const PANEL_POSITIONS: ConnectedPosition[] = [
  {
    originX: 'start',
    originY: 'bottom',
    overlayX: 'start',
    overlayY: 'top',
    offsetY: PANEL_GAP_PX,
  },
  {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'bottom',
    offsetY: -PANEL_GAP_PX,
  },
];

const OPEN_KEYS = ['ArrowDown', 'ArrowUp'];
const CLOSE_KEYS = ['Escape', 'Tab'];

let nextId = 0;

/**
 * A dropdown that looks the same in every browser. Bind it to a Signal Forms field with
 * `[formField]`, or to a signal with `[(value)]`. It works with the keyboard: arrows to move,
 * Enter or Space to choose, typing to jump to an option, and Escape to close.
 * Give it an `inputId` so a `<label for>` can name it.
 */
@Component({
  imports: [CdkConnectedOverlay, CdkListbox, CdkOption, CdkOverlayOrigin],
  selector: 'app-select',
  styleUrl: './select.css',
  templateUrl: './select.html',
})
export class Select<T> implements FormValueControl<T> {
  private readonly injector = inject(Injector);

  readonly value = model.required<T>();
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly options = input.required<readonly SelectOption<T>[]>();
  readonly inputId = input(`app-select-${nextId++}`);

  protected readonly positions = PANEL_POSITIONS;
  protected readonly open = signal(false);
  protected readonly panelWidth = signal(0);
  protected readonly selectedValues = computed((): readonly T[] => [this.value()]);
  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? '',
  );

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly listbox = viewChild(CdkListbox);

  /** Lets Signal Forms focus this control, as `focusBoundControl()` does, by focusing the field button. */
  focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (OPEN_KEYS.includes(event.key) && !this.open()) {
      event.preventDefault();
      this.openPanel();
    }
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    if (CLOSE_KEYS.includes(event.key)) {
      event.preventDefault();
      this.close({ focusTrigger: true });
    }
  }

  protected onOutsideClick(event: MouseEvent): void {
    if (!this.trigger().nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected pick(event: ListboxValueChangeEvent<T>): void {
    const [value] = event.value;
    this.value.set(value);
    this.close({ focusTrigger: true });
  }

  protected close({ focusTrigger = false } = {}): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    if (focusTrigger) {
      this.trigger().nativeElement.focus();
    }
  }

  private openPanel(): void {
    if (this.disabled()) {
      return;
    }
    this.panelWidth.set(this.trigger().nativeElement.offsetWidth);
    this.open.set(true);
    afterNextRender(() => this.listbox()?.focus(), { injector: this.injector });
  }
}
