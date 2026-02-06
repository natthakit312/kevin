import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordMatchValidator, PasswordValidator } from '../_helpers/password-validator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PassportService } from '../_services/passport-service';
import { MatIconModule } from '@angular/material/icon';
import { LanguageService } from '../_services/language-service';
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatProgressBarModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  animations: [
    trigger('formAnimation', [
      transition('login <=> regis', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('welcomeAnimation', [
      transition(':enter', [
        style({ opacity: 0, scale: 0.9 }),
        animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, scale: 1 }))
      ])
    ])
  ]
})
export class Login {
  private usernameMinLength = 4;
  private usernameMaxLength = 12;

  private passwordMinLength = 8;
  private passwordMaxLength = 12;

  private displayNameMinLength = 3;


  mode: 'login' | 'regis' = 'login';
  hidePassword = signal(true);
  form: FormGroup
  errorMsg = {
    username: signal<string | null>(''),
    password: signal<string | null>(''),
    displayName: signal<string | null>(''),
    cf_password: signal<string | null>(''),
    server: signal<string | null>(''),
  }

  loading = signal(false);
  showWelcome = signal(false);
  welcomeName = signal('');
  private _passport = inject(PassportService);
  private _router = inject(Router);
  private _route = inject(ActivatedRoute);
  public langService = inject(LanguageService);
  private passwordMatchValidator = PasswordMatchValidator('password', 'cf_password');

  constructor() {
    this.form = new FormGroup({
      username: new FormControl(null, [
        Validators.required,
        Validators.minLength(this.usernameMinLength),
        Validators.maxLength(this.usernameMaxLength)
      ]),
      password: new FormControl(null, [
        Validators.required,
        PasswordValidator(this.passwordMinLength, this.passwordMaxLength)
      ])
    })

    // Read initial mode from query params
    const modeParam = this._route.snapshot.queryParamMap.get('mode');
    if (modeParam === 'regis' || modeParam === 'register') {
      this.mode = 'regis';
      this.updateForm('regis');
    }
  }
  toggleMode() {
    if (this.mode === 'login') {
      this.updateForm('regis');
      this.mode = 'regis';
    } else {
      this.mode = 'login';
      this.updateForm('login');
    }
  }

  updateForm(targetMode: 'login' | 'regis') {
    if (targetMode === 'login') {
      this.form.removeControl('cf_password')
      this.form.removeValidators(this.passwordMatchValidator)
      this.form.removeControl('displayName')
    } else {
      this.form.addControl('cf_password', new FormControl(null, [Validators.required]))
      this.form.addValidators(this.passwordMatchValidator)
      this.form.addControl('displayName', new FormControl(null, [Validators.required, Validators.minLength(this.displayNameMinLength)]))
    }
    this.form.updateValueAndValidity();
    this.errorMsg.server.set('');
  }

  updateErrorMsg(ctrlName: string): void | null {
    const ctrl = this.form.controls[ctrlName]
    if (!ctrl) return null;
    switch (ctrlName) {
      case 'username':
        if (ctrl.hasError('required')) this.errorMsg.username.set(this.langService.translate('auth.error.required'))
        else if (ctrl.hasError('minlength')) {
          this.errorMsg.username.set(this.langService.translate('auth.error.min_length', { length: this.usernameMinLength }));
        }
        else if (ctrl.hasError('maxlength')) {
          this.errorMsg.username.set(this.langService.translate('auth.error.max_length', { length: this.usernameMaxLength }));
        }
        else this.errorMsg.username.set('')
        break;
      case 'password':
        if (ctrl.hasError('required')) this.errorMsg.password.set(this.langService.translate('auth.error.required'))
        else if (ctrl.hasError('invalidLength')) {
          this.errorMsg.password.set(this.langService.translate('auth.error.invalid_length', {
            min: this.passwordMinLength,
            max: this.passwordMaxLength
          }));
        }
        else this.errorMsg.password.set('')
        break;
      case 'cf_password':
        if (ctrl.hasError('required')) this.errorMsg.cf_password.set(this.langService.translate('auth.error.required'))
        else if (ctrl.hasError('invalid')) this.errorMsg.cf_password.set(this.langService.translate('auth.error.mismatch'))
        else this.errorMsg.cf_password.set('')
        break;
      case 'displayName':
        if (ctrl.hasError('required')) this.errorMsg.displayName.set(this.langService.translate('auth.error.required'))
        else if (ctrl.hasError('minlength')) {
          this.errorMsg.displayName.set(this.langService.translate('auth.error.min_length', { length: this.displayNameMinLength }));
        }
        else this.errorMsg.displayName.set('')
        break;
    }
  }
  async onSubmit() {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMsg.server.set('');

    const start = Date.now();
    let errMsg: string | null = null;

    if (this.mode === 'login') {
      errMsg = await this._passport.get(this.form.value);
    } else {
      errMsg = await this._passport.register(this.form.value);
    }

    // Ensure at least 1.5s of "scanning" time for the effect
    const elapsed = Date.now() - start;
    const minDelay = 1500;
    if (elapsed < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
    }

    if (!errMsg) {
      // Success - Show Welcome Animation
      const passportData = this._passport.data();
      this.welcomeName.set(passportData?.displayName || '');
      this.showWelcome.set(true);

      // Wait a bit for the user to feel "welcomed"
      setTimeout(() => {
        this._router.navigate(['/']);
      }, 2000);
    } else {
      this.loading.set(false);
      console.log('Server Error:', errMsg);

      // Localize common error messages
      if (errMsg.toLowerCase().includes('record not found')) {
        this.errorMsg.server.set(this.langService.translate('auth.error.not_found'));
      } else {
        this.errorMsg.server.set(this.langService.translate('auth.error.server'));
      }
    }
  }
}
