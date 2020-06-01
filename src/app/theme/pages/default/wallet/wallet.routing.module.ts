import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {AuthGuard} from '../../../../auth/_guards/auth.guard';
import { CryptoComponent } from './crypto/crypto.component';
import { DefaultComponent } from '../default.component';

const routes: Routes = [
  {
      'path': '',
      'component': DefaultComponent,
      'canActivate': [AuthGuard],
      'children': [
          {
              'path': '',
              'component': CryptoComponent
          },
          {
            'path': '',
            'redirectTo': '',
            'pathMatch': 'full'
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
export class WalletRoutingModule { }
