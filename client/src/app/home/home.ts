import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PassportService } from '../_services/passport-service';


@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private _passport = inject(PassportService);
  private _router = inject(Router);
  constructor() {
    if (!this._passport.data()) {
      this._router.navigate(['/login']);
    }
  }
}
