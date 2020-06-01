import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import * as firebase from 'firebase/app';
import '@firebase/messaging';
import { BehaviorSubject } from 'rxjs';
// import {MatSnackBar} from '@angular/material';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  messaging: any = firebase.messaging();
  currentMessage: any = new BehaviorSubject(null);

  constructor(
    private authService: AuthService,
    private afs: AngularFirestore
  ) {}

  updateToken(token: any) {
    //  console.log('token value', token);
    if (this.authService.currentUser) {
      const fcmTokenRef: AngularFirestoreDocument = this.afs.doc(
        `fcmTokens/${this.authService.currentUserId}`
      );
      fcmTokenRef.set({ token: token }).catch((err) => console.log(err));
    }
  }

  getPermission() {
    // console.log(messaging);
    this.messaging
      .requestPermission()
      .then(() => {
        console.log('Notification permission granted.');
        return this.messaging.getToken();
      })
      .then((token) => {
        // console.log(token);
        this.updateToken(token);
      })
      .catch((err) => {
        console.log('Unable to get permission to notify.', err);
      });
  }

  receiveMessage() {
    this.messaging.onMessage((payload) => {
      // console.log('Message received.', payload);
      this.currentMessage.next(payload);
      /*  const message = payload.notification.body;
          console.log('notification', message);
          const snackbarRef = this.snackBar.open(message, 'Ok', {duration: 10000});
          snackbarRef.onAction().subscribe(() => {
            snackbarRef.dismiss();
          }); */
    });
  }
}
