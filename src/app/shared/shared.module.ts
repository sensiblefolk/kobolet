import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BankDetailsComponent } from './bank-details/bank-details.component';
import { RaveComponent } from './rave/rave.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule
  ],
  declarations: [
    BankDetailsComponent,
    RaveComponent
  ],
  exports: [
    BankDetailsComponent,
    RaveComponent
  ]
})
export class SharedModule { }
