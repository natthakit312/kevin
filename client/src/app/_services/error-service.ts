import { Injectable, inject, Injector } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { Observable, throwError } from 'rxjs';
import { PassportService } from './passport-service';

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  private router = inject(Router)
  private _snackbar = inject(MatSnackBar)
  private injector = inject(Injector);
  private _snackbarConfig: MatSnackBarConfig = {
    horizontalPosition: 'right',
    verticalPosition: 'top'
  }

  handleError(error: any): Observable<never> {
    if (error) {
      console.log('ErrorService caught:', error.status, error); // Debug log

      switch (error.status) {
        case 400:
          const msg = error.error?.message || error.error;
          if (msg === 'Record Not Found') {
            this._snackbar.open('invalid username or password', 'ok', this._snackbarConfig);
          } else {
            this._snackbar.open(typeof msg === 'string' ? msg : 'Bad Request', 'ok', this._snackbarConfig);
          }
          break;
        case 401:
          this._snackbar.open('Session expired. Please login again.', 'ok', this._snackbarConfig);

          // Lazy load PassportService to avoid Circular Dependency
          try {
            const passport = this.injector.get(PassportService);
            passport.destroy();
          } catch (e) {
            console.error('Could not destroy passport via DI', e);
            // Fallback
            localStorage.removeItem('passport');
          }

          this.router.navigate(['/login']); // Use /login direct route
          break;
        case 404:
          this.router.navigate(['/not-found'])
          break;
        case 500:
        case 502:
        case 503:
        case 504:
        case 505:
        case 506:
        case 507:
        case 508:
        case 509:
        case 510:
        case 511:
          const navExtra: NavigationExtras = {
            state: {
              error: error.error
            }
          }
          // Optionally don't navigate away on 500 loop for polling?
          // this.router.navigate(['/server-error'])
          break;
        default:
          this._snackbar.open('Something went wrong!!!, Please try again later', 'ok', this._snackbarConfig)
          break;
      }
    }
    return throwError(() => error);
  }
}
