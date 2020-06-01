import {
  Component,
  OnInit,
  ViewEncapsulation,
  AfterViewInit,
} from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { Helpers } from '../helpers';
import { ScriptLoaderService } from '../_services/script-loader.service';
// import { SwUpdate } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material';

declare let mApp: any;
declare let mUtil: any;
declare let mLayout: any;

/* tslint:disable:component-selector */
@Component({
  selector: '.m-grid.m-grid--hor.m-grid--root.m-page',
  templateUrl: './theme.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class ThemeComponent implements OnInit, AfterViewInit {
  constructor(
    private _script: ScriptLoaderService,
    private _router: Router,
    private snackBar: MatSnackBar
  ) {}
  ngOnInit() {
    this._script
      .loadScripts(
        'body',
        [
          'assets/vendors/base/vendors.bundle.js',
          'assets/demo/demo6/base/scripts.bundle.js',
        ],
        true
      )
      .then((result) => {
        Helpers.setLoading(false);
        // optional js to be loaded once
        // this._script.loadScripts('head', ['assets/vendors/custom/fullcalendar/fullcalendar.bundle.js']);
      });
    this._router.events.subscribe((route) => {
      if (route instanceof NavigationStart) {
        (<any>mLayout).closeMobileAsideMenuOffcanvas();
        (<any>mLayout).closeMobileHorMenuOffcanvas();
        (<any>mApp).scrollTop();
        Helpers.setLoading(true);
        // hide visible popover
        (<any>$("[data-toggle='m-popover']")).popover('hide');
      }
      if (route instanceof NavigationEnd) {
        // init required js
        (<any>mApp).init();
        (<any>mUtil).init();
        Helpers.setLoading(false);
        // content m-wrapper animation
        const animation = 'm-animate-fade-in-up';
        $('.m-wrapper')
          .one(
            'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
            function (e) {
              $('.m-wrapper').removeClass(animation);
            }
          )
          .removeClass(animation)
          .addClass(animation);
      }
    });
  }

  ngAfterViewInit() {}

  /*openSnackBar() {

	console.log('lets see new worker');
				// service worker
				this.swUpdate.available.subscribe(event => {
					console.log('lets see in service worker');
					console.log(event);
					if (event.available) {
						console.log(event)
						this.openSnackBar()
					}
				});
	// Simple message with an action.
	let snackBarRef = this.snackBar.open('A new version of the app is availabe', 'Click to Reload', {
		duration: 900000,
	  });

	  snackBarRef.afterDismissed().subscribe(() => {
		this.swUpdate.activateUpdate().then(() => document.location.reload());
	  });


	  snackBarRef.onAction().subscribe(() => {
		this.swUpdate.activateUpdate().then(() => document.location.reload());
	  });
} */
}
