import { Directive, inject, Injectable, OnDestroy, OnInit, signal, TemplateRef } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavbarActionsService {
  readonly template = signal<TemplateRef<unknown> | null>(null);
}

@Directive({ selector: 'ng-template[appNavbarActions]' })
export class NavbarActions implements OnInit, OnDestroy {
  private readonly service = inject(NavbarActionsService);
  private readonly template = inject(TemplateRef);

  ngOnInit(): void {
    this.service.template.set(this.template);
  }

  ngOnDestroy(): void {
    if (this.service.template() === this.template) {
      this.service.template.set(null);
    }
  }
}
