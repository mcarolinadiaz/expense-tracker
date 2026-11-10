import { CdkListbox, CdkOption, ListboxValueChangeEvent } from '@angular/cdk/listbox';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption<T> {
  value: T;
  label: string;
}

const PANEL_GAP_PX = 4;

// Below the field, or above it when there is no room below.
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
 * A dropdown that looks the same in every browser. It works with reactive forms, and with the
 * keyboard: arrows to move, Enter or Space to choose, typing to jump to an option, and Escape to close.
 * Give it an `inputId` so a `<label for>` can name it.
 */
@Component({
  imports: [CdkConnectedOverlay, CdkListbox, CdkOption, CdkOverlayOrigin],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true }],
  selector: 'app-select',
  styleUrl: './select.css',
  templateUrl: './select.html',
})
export class Select<T> implements ControlValueAccessor {
  private readonly injector = inject(Injector);

  readonly options = input.required<readonly SelectOption<T>[]>();
  readonly inputId = input(`app-select-${nextId++}`);
  readonly invalid = input(false);

  protected readonly positions = PANEL_POSITIONS;
  protected readonly value = signal<T | null>(null);
  protected readonly disabled = signal(false);
  protected readonly open = signal(false);
  protected readonly panelWidth = signal(0);
  protected readonly selectedValues = computed((): readonly T[] => {
    const value = this.value();
    return value === null ? [] : [value];
  });
  protected readonly selectedLabel = computed(
    () => this.options().find((option) => option.value === this.value())?.label ?? '',
  );

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly listbox = viewChild(CdkListbox);

  private onChange: (value: T) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
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
    // A click on the field itself already toggles the panel.
    if (!this.trigger().nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected pick(event: ListboxValueChangeEvent<T>): void {
    const [value] = event.value;
    this.value.set(value);
    this.onChange(value);
    this.close({ focusTrigger: true });
  }

  protected close({ focusTrigger = false } = {}): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.onTouched();
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
    // The list exists only once the panel renders. Focusing it moves to the selected option.
    afterNextRender(() => this.listbox()?.focus(), { injector: this.injector });
  }
}
