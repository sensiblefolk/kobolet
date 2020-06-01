import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '../../../layouts/layout.module';
import { WalletComponent } from './wallet.component';
import { CryptoComponent } from './crypto/crypto.component';
import { WalletRoutingModule } from './wallet.routing.module';
import { FormsModule } from '@angular/forms';

// tslint:disable-next-line:max-line-length
import {MatDividerModule, MatSortModule, MatPaginatorModule, MatTableModule, MatDialogModule, MatSnackBarModule, MatChipsModule} from '@angular/material';


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
    WalletRoutingModule
  ],
  declarations: [
    WalletComponent,
    CryptoComponent
  ]
})
export class WalletModule { }
