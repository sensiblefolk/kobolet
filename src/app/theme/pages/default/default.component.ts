import { Component, OnInit } from '@angular/core';

@Component({
  selector:
    // tslint:disable-next-line: component-selector
    '.m-grid__item.m-grid__item--fluid.m-grid.m-grid--ver-desktop.m-grid--desktop.m-body',
  templateUrl: './default.component.html',
  styleUrls: ['./default.component.css'],
})
export class DefaultComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
