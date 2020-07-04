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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { NgxSliderModule } from '@m0t0r/ngx-slider';

import { SharedModule } from '../../../../shared/shared.module';

@NgModule({
  declarations: [LoansComponent, AssetComponent, NewLoanComponent],
  imports: [
    CommonModule,
    FormsModule,
    LayoutModule,
    LoansRoutingModule,
    NgxSliderModule,
    MatIconModule,
    MatExpansionModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule,
    MatTableModule,
    MatSnackBarModule,
    MatButtonModule,
    MatDividerModule,
    SharedModule,
  ],
})
export class LoansModule {}
