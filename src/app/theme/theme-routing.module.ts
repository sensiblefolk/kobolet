import { NgModule } from '@angular/core';
import { ThemeComponent } from './theme.component';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from '../auth/_guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: ThemeComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./pages/home/index/index.module').then((m) => m.IndexModule),
      },
      {
        path: 'user',
        loadChildren: () =>
          import('./pages/default/user-profile/user-profile.module').then(
            (m) => m.UserProfileModule
          ),
      },
      {
        path: 'wallet',
        loadChildren: () =>
          import('./pages/default/wallet/wallet.module').then(
            (m) => m.WalletModule
          ),
      },
      {
        path: 'loans',
        loadChildren: () =>
          import('./pages/default/loans/loans.module').then(
            (m) => m.LoansModule
          ),
      },
      {
        path: '404',
        // 'loadChildren': '.\/pages\/default\/not-found\/not-found.module#NotFoundModule'
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'index',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '404',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ThemeRoutingModule {}
