import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  HostListener,
} from '@angular/core';

@Directive({
  // tslint:disable-next-line: directive-selector
  selector: '[Href]',
})
export class HrefPreventDefaultDirective implements AfterViewInit {
  @Input() href: string;

  constructor(private el: ElementRef) {}
  ngAfterViewInit() {}

  @HostListener('click') preventDefault(event) {
    if (this.href.length === 0 || this.href === '#') {
      event.preventDefault();
    }
  }
}
