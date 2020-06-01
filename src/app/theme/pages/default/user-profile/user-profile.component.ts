import { Component, OnInit, ViewEncapsulation } from '@angular/core';

declare var $: any ;

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class UserProfileComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
