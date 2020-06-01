import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '../../../layouts/layout.module';
import { LoansComponent } from './loans.component';
import { AssetComponent } from './asset/asset.component';
import { NewLoanComponent } from './new-loan/new-loan.component';
import { FormsModule } from '@angular/forms';
import { LoansRoutingModule } from './loans.routing.module';

import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// tslint:disable-next-line:max-line-length
import {
  MatSortModule,
  MatPaginatorModule,
  MatTableModule,
  MatSnackBarModule,
  MatTooltipModule,
  MatButtonModule,
  MatDividerModule,
} from '@angular/material';
import { Ng5SliderModule } from 'ng5-slider';

import { ClipboardModule } from 'ngx-clipboard';
import { CountdownTimerModule } from 'ngx-countdown-timer';
import { SharedModule } from '../../../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    LayoutModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatTableModule,
    MatDividerModule,
    MatSortModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatListModule,
    MatProgressSpinnerModule,
    Ng5SliderModule,
    ClipboardModule,
    SharedModule,
    LoansRoutingModule,
    CountdownTimerModule.forRoot(),
  ],
  declarations: [LoansComponent, AssetComponent, NewLoanComponent],
})
export class LoansModule {}
