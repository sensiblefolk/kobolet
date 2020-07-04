import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../../_services/auth.service';

@Component({
  selector: 'app-tooltips',
  templateUrl: './tooltips.component.html',
  styleUrls: ['./tooltips.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class TooltipsComponent implements OnInit {
  isMobileView: boolean;

  constructor(private authService: AuthService) {}
  ngOnInit(): void {
    this.isMobileView = this.authService.isMobileDevice();
  }
}
