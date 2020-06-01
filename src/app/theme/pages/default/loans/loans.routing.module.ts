import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {AuthGuard} from '../../../../auth/_guards/auth.guard';
import { DefaultComponent } from '../default.component';
import { AssetComponent } from './asset/asset.component';
import { NewLoanComponent } from './new-loan/new-loan.component';

const routes: Routes = [
  {
      'path': '',
      'component': DefaultComponent,
      'canActivate': [AuthGuard],
      'children': [
          {
              'path': '',
              'component': AssetComponent
          },
          {
            'path': 'new',
            'component': NewLoanComponent
          }
      ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule],
  declarations: []
})
export class LoansRoutingModule { }
