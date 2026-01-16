import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordMatchValidator, PasswordValidator } from '../_helpers/password-validator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ChangeDetectionStrategy } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PassportService } from '../_services/passport-service';


@Component({
  selector: 'app-login',
  imports: [FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatProgressBarModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private usernameMinLength = 4;
  private usernameMaxLength = 12;

  private passwordMinLength = 8;
  private passwordMaxLength = 12;

  private displayNameMinLength = 3;


  mode: 'login' | 'regis' = 'login';
  form: FormGroup
  errorMsg = {
    username: signal<string | null>(''),
    password: signal<string | null>(''),
    displayName: signal<string | null>(''),
    cf_password: signal<string | null>(''),
    server: signal<string | null>(''),
  }
  private _passport = inject(PassportService);
  private _router = inject(Router);
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
  }

  updateErrorMsg(ctrlName: string): void | null {
    const ctrl = this.form.controls[ctrlName]
    if (!ctrl) return null;
    switch (ctrlName) {
      case 'username':
        if (ctrl.hasError('required')) this.errorMsg.username.set('required')
        else if (ctrl.hasError('minLength')) this.errorMsg.username.set(`must be at least ${this.usernameMinLength} characters`)
        else if (ctrl.hasError('maxLength')) this.errorMsg.username.set(`must be at most ${this.usernameMaxLength} characters`)
        else this.errorMsg.username.set('')
        break;
      case 'password':
        if (ctrl.hasError('required')) this.errorMsg.password.set('required')
        else if (ctrl.hasError('invalidLength')) this.errorMsg.password.set(`must be ${this.passwordMinLength} - ${this.passwordMaxLength} characters long`)
        else if (ctrl.hasError('invalidLowerCase')) this.errorMsg.password.set(`must contain minimum of 1 lower-case letter [a-z]`)
        else if (ctrl.hasError('invalidUpperCase')) this.errorMsg.password.set(`must contain minimum of 1 upper-case letter [A-Z]`)
        else if (ctrl.hasError('invalidNumeric')) this.errorMsg.password.set(`must contain minimum of 1 numeric [0-9]`)
        else if (ctrl.hasError('invalidSpecialChar')) this.errorMsg.password.set(`must contain minimum of 1 special character [!@#$%^&*(),.?:{}|<>]`)
        else this.errorMsg.password.set('')

        break;
      case 'cf_password':
        if (ctrl.hasError('required')) this.errorMsg.cf_password.set('required')
        else this.errorMsg.cf_password.set('')
        break;
      case 'displayName': if (ctrl.hasError('required')) this.errorMsg.displayName.set('required')
      else if (ctrl.hasError('minLength')) this.errorMsg.displayName.set(`must be at least ${this.displayNameMinLength} characters`)
      else this.errorMsg.displayName.set('')

        break;
    }
    console.log(this.errorMsg.username());
  }
  async onSubmit() {
    let errMsg: string | null = null;
    if (this.mode === 'login') {
      errMsg = await this._passport.get(this.form.value);
    } else {
      errMsg = await this._passport.register(this.form.value);
    }

    if (!errMsg) {
      this._router.navigate(['/']);
    } else {
      console.log('Server Error:', errMsg);
      this.errorMsg.server.set(errMsg);
    }
  }
}

