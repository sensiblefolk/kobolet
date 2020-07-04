import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '../../../layouts/layout.module';
import { WalletComponent } from './wallet.component';
import { CryptoComponent } from './crypto/crypto.component';
import { WalletRoutingModule } from './wallet.routing.module';
import { FormsModule } from '@angular/forms';

import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

@NgModule({
  imports: [
    CommonModule,
    LayoutModule,
    MatTableModule,
    MatDividerModule,
    MatChipsModule,
    MatSortModule,
    MatPaginatorModule,
    MatSnackBarModule,
    FormsModule,
    WalletRoutingModule,
  ],
  declarations: [WalletComponent, CryptoComponent],
})
export class WalletModule {}
