import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export const PasswordValidator = (min: number, max: number): ValidatorFn => {
    return (ctrl: AbstractControl): ValidationErrors | null => {
        const password = ctrl.value;
        if (!password) return null; // Let required validator handle empty
        if (password.length < min || password.length > max) return { invalidLength: true };

        return null;
    }
}

export const PasswordLengthValidator = (min: number, max: number): ValidatorFn => {
    return (ctrl: AbstractControl): ValidationErrors | null => {
        const password = ctrl.value;
        if (!password) return { required: true };
        if (password.length < min || password.length > max) return { invalidLength: true };
        return null;

    }
}

export const PasswordMatchValidator = (ctrl_pw_name: string, ctrl_cf_pw_name: string): ValidatorFn => {
    return (fromGroup: AbstractControl) => {
        const ctrlPw = fromGroup.get(ctrl_pw_name);
        const ctrlCfPw = fromGroup.get(ctrl_cf_pw_name);
        if (!ctrlPw || !ctrlCfPw) return null;
        const isMatch = ctrlPw.value === ctrlCfPw.value;
        if (!isMatch) ctrlCfPw.setErrors({ invalid: true });
        else ctrlCfPw.setErrors(null);

        return null;
    }
}