import { Component, OnInit, ViewEncapsulation } from '@angular/core';
// import { Helpers } from '../../../helpers';
import * as moment from 'moment';


@Component({
selector: 'app-footer',
templateUrl: './footer.component.html',
encapsulation: ViewEncapsulation.None,
})
export class FooterComponent implements OnInit {

  currentYear: any;

  ngOnInit()  {
  this.currentYear = moment().year();
    }

  }
