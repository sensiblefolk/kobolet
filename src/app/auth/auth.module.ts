import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import {BaseRequestOptions, HttpModule} from '@angular/http';
import { HttpClientModule } from '@angular/common/http';
// import {MockBackend} from '@angular/http/testing';

import { AuthRoutingModule } from './auth-routing.routing';
import { FirebaseUIModule } from 'firebaseui-angular';
import { AuthComponent } from './auth.component';
import { AlertComponent } from './_directives/alert.component';
import { LogoutComponent } from './logout/logout.component';
import { AuthGuard } from './_guards/auth.guard';
import { AlertService } from './_services/alert.service';
import { AuthenticationService } from './_services/authentication.service';
// import {UserService} from './_services/user.service';

// import {fakeBackendProvider} from './_helpers/index';

@NgModule({
  declarations: [AuthComponent, AlertComponent, LogoutComponent],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    FirebaseUIModule,
    AuthRoutingModule,
  ],
  providers: [
    AuthGuard,
    AuthenticationService,
    AlertService,
    // api backend simulation
  ],
  entryComponents: [],
})
export class AuthModule {}
