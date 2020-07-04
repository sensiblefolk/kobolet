import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { Helpers } from '../helpers';
import { ScriptLoaderService } from '../_services/script-loader.service';
// import { SwUpdate } from '@angular/service-worker';
// import { MatSnackBar } from '@angular/material';

declare let mApp: any;
declare let mUtil: any;
declare let mLayout: any;
declare const $: any;

@Component({
  selector: 'app-theme',
  templateUrl: './theme.component.html',
  styles: [
    `
      #page-container {
        position: relative;
        min-height: 100vh;
      }

      #content-wrap {
        padding-bottom: 2.5rem;
        /* Footer height */
      }

      @media only screen and (max-width: 840px) {
        #page-container {
          padding-bottom: 3rem;
        }
      }
    `,
  ],
  encapsulation: ViewEncapsulation.None,
})
export class ThemeComponent implements OnInit {
  constructor(private script: ScriptLoaderService, private router: Router) {}

  ngOnInit(): void {
    this.script
      .loadScripts(
        'body',
        [
          'assets/vendors/base/vendors.bundle.min.js',
          'assets/demo/demo6/base/scripts.bundle.min.js',
        ],
        true
      )
      .then(() => {
        Helpers.setLoading(false);
        // optional js to be loaded once
        // this.script.loadScripts('head', ['assets/vendors/custom/fullcalendar/fullcalendar.bundle.js']);
      });
    this.router.events.subscribe((route) => {
      if (route instanceof NavigationStart) {
        (mLayout as any).closeMobileAsideMenuOffcanvas();
        (mLayout as any).closeMobileHorMenuOffcanvas();
        (mApp as any).scrollTop();
        Helpers.setLoading(true);
        // hide visible popover
        // tslint:disable-next-line: quotemark
        ($("[data-toggle='m-popover']") as any).popover('hide');
      }
      if (route instanceof NavigationEnd) {
        // init required js
        (mApp as any).init();
        (mUtil as any).init();
        Helpers.setLoading(false);
        // content m-wrapper animation
        const animation = 'm-animate-fade-in-up';
        $('.m-wrapper')
          .one(
            'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',
            (e) => {
              $('.m-wrapper').removeClass(animation);
            }
          )
          .removeClass(animation)
          .addClass(animation);
      }
    });
  }
}
