import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { MessageService } from './_services/messaging.service';
import { MatSnackBar } from '@angular/material';
import { Helpers } from './helpers';

import { ConfigService } from '../app/_services/config.service';

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'body',
  templateUrl: './app.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {
  title = 'app';
  message: any;
  // tslint:disable-next-line:max-line-length
  globalBodyClass =
    'm-page--loading-non-block m-page--fluid m--skin- m-content--skin-light2 m-header--fixed m-header--fixed-mobile m-aside-left--enabled m-aside-left--skin-light m-aside-left--fixed m-aside-left--offcanvas m-aside-left--minimize m-brand--minimize m-footer--push m-aside--offcanvas-default';

  constructor(
    private _router: Router,
    private messageService: MessageService,
    private snackBar: MatSnackBar,
    private configService: ConfigService
  ) {
    // console.log('config', configService.config);
  }
  ngOnInit() {
    this._router.events.subscribe((route) => {
      if (route instanceof NavigationStart) {
        Helpers.setLoading(true);
        Helpers.bodyClass(this.globalBodyClass);
      }
      if (route instanceof NavigationEnd) {
        Helpers.setLoading(false);
      }
    });

    // this.messageService.getPermission();
    // this.messageService.receiveMessage();
    // this.message = this.messageService.currentMessage;
    // this.message.subscribe((data) => {
    //   if (data) {
    //     const message = data.notification.body;
    //     const snackbarRef = this.snackBar.open(message, 'Ok', {
    //       duration: 30000,
    //     });
    //     snackbarRef.onAction().subscribe(() => {
    //       snackbarRef.dismiss();
    //     });
    //   }
    // });
  }
}
