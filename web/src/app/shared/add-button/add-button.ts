import { Component, input } from '@angular/core';

/**
 * The page's main "add" button, such as "Add transaction". From `xl` up it shows a plus and its
 * text; on narrower screens only the plus, and the text stays for screen readers and the tooltip.
 * On phones it floats at the bottom right of the window.
 */
@Component({
  selector: 'app-add-button',
  styleUrl: './add-button.css',
  template: `
    <button type="button" class="btn btn-primary add-button" [title]="label()">
      <svg
        class="add-button-icon"
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
      <span class="add-button-label">{{ label() }}</span>
    </button>
  `,
})
export class AddButton {
  readonly label = input.required<string>();
}
