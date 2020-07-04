import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../_services/authentication.service';
import { Helpers } from '../../helpers';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class LogoutComponent implements OnInit {
  constructor(
    private router: Router,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    Helpers.setLoading(true);
    // reset login status
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
