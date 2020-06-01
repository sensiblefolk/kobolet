import {
  Component,
  OnInit,
  ViewEncapsulation,
  AfterViewInit,
} from '@angular/core';
import { AuthService } from '../../../_services/auth.service';
// import { Helpers } from '../../../helpers';

declare let mLayout: any;
@Component({
  selector: 'app-aside-nav',
  templateUrl: './aside-nav.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class AsideNavComponent implements OnInit, AfterViewInit {
  constructor(private authService: AuthService) {}
  ngOnInit() {}
  ngAfterViewInit() {
    mLayout.initAside();
  }

  logout() {
    this.authService.logOut();
  }
}
