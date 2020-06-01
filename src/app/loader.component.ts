import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-loader',
  template: `
	<div class='loaded'>
	<div class='m-spinner m-spinner--info m-spinner--lg'></div>
</div>
  `,
  styles: []
})
export class LoaderComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
