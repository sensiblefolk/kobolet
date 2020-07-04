import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BankDetailsComponent } from './bank-details/bank-details.component';
import { RaveComponent } from './rave/rave.component';
import { CryptoDepositComponent } from './crypto-deposit/crypto-deposit.component';

import { ClipboardModule } from '@angular/cdk/clipboard';
import { CountdownModule } from 'ngx-countdown';

@NgModule({
  imports: [CommonModule, FormsModule, ClipboardModule, CountdownModule],
  declarations: [BankDetailsComponent, RaveComponent, CryptoDepositComponent],
  exports: [BankDetailsComponent, RaveComponent, CryptoDepositComponent],
})
export class SharedModule {}
