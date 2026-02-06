import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../_services/language-service';

@Component({
  selector: 'app-server-error',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './server-error.html',
  styleUrl: './server-error.scss',
})
export class ServerError {
  private _router = inject(Router)
  public langService = inject(LanguageService);
  errorMsg: string | undefined | null = undefined

  constructor() {
    this.errorMsg = this._router.getCurrentNavigation()?.extras.state?.['error'] as string
  }

  retry() {
    this._router.navigate(['/']);
  }
}
