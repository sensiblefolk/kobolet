import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ThemeComponent } from './theme/theme.component';
import { LayoutModule } from './theme/layouts/layout.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireFunctionsModule } from '@angular/fire/functions';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ScriptLoaderService } from './_services/script-loader.service';
import { ThemeRoutingModule } from './theme/theme-routing.module';
import { AuthModule } from './auth/auth.module';
import { LoaderComponent } from './loader.component';

import { environment } from '../environments/environment';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ServiceWorkerModule } from '@angular/service-worker';

// import {FirebaseUIModule} from 'firebaseui-angular';
// import * as firebase from 'firebase/app';
// import * as firebaseui from 'firebaseui';
// currently there is a bug while building the app with --prod
// - https://github.com/RaphaelJenni/FirebaseUI-Angular/issues/76
// the plugin exposes the two libraries as well. You can use those:
import { FirebaseUIModule, firebase, firebaseui } from 'firebaseui-angular';

const firebaseUiAuthConfig: firebaseui.auth.Config = {
  signInFlow: 'redirect',
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    {
      requireDisplayName: true,
      provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
    },
  ],
  tosUrl: '<your-tos-link>',
  privacyPolicyUrl: '<your-privacyPolicyUrl-link>',
  credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
};

@NgModule({
  declarations: [LoaderComponent, ThemeComponent, AppComponent],
  imports: [
    LayoutModule,
    BrowserModule,
    FormsModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatSnackBarModule,
    AngularFireModule.initializeApp(environment.firebase),
    FirebaseUIModule.forRoot(firebaseUiAuthConfig),
    NgbModule,
    AngularFirestoreModule, // imports firebase/firestore, only needed for database features
    AngularFireAuthModule, // imports firebase/auth, only needed for auth features,
    AngularFireStorageModule, // imports firebase/storage only needed for storage features
    AngularFireFunctionsModule, // import firebase/functions
    AppRoutingModule,
    ThemeRoutingModule,
    AuthModule,
    ServiceWorkerModule.register('/ngsw-worker.js', {
      enabled: environment.production,
    }),
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
