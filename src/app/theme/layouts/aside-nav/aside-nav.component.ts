import {
  Component,
  OnInit,
  AfterViewInit,
  ViewEncapsulation,
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
  ngOnInit(): void {}
  ngAfterViewInit(): void {
    mLayout.initAside();
  }

  logout(): void {
    this.authService.logOut();
  }
}
