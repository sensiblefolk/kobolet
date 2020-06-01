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
        loadChildren:
          './pages/subheader-type-search/index/index.module#IndexModule',
      },
      {
        path: 'user',
        loadChildren:
          './pages/default/user-profile/user-profile.module#UserProfileModule',
      },
      {
        path: 'wallet',
        loadChildren: './pages/default/wallet/wallet.module#WalletModule',
      },
      {
        path: 'loans',
        loadChildren: './pages/default/loans/loans.module#LoansModule',
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
