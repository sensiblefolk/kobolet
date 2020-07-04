import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserProfileComponent } from './user-profile.component';
import { NewUserComponent } from './new-user/new-user.component';
import { ProfileComponent } from './profile/profile.component';
import { FormsModule } from '@angular/forms';
import { LayoutModule } from '../../../layouts/layout.module';
import { UserProfileRoutingModule } from './user-profile.routing.module';
import { FilestackModule } from '@filestack/angular';

import { environment } from '../../../../../environments/environment';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LayoutModule,
    UserProfileRoutingModule,
    FilestackModule.forRoot({ apikey: environment.fileStackApi }),
  ],
  declarations: [UserProfileComponent, ProfileComponent, NewUserComponent],
})
export class UserProfileModule {}
