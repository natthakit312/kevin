import { HttpClient } from "@angular/common/http"
import { environment } from "../../environments/environment.development"
import { inject, Injectable, signal } from "@angular/core"
import { LoginModel, Passport, RegisterModel } from "../_models/passport"
import { firstValueFrom } from "rxjs"


@Injectable({
    providedIn: 'root'
})

export class PassportService {
    private _key = 'passport'
    private _base_url = environment.baseUrl + '/api'
    private _http = inject(HttpClient)


    data = signal<undefined | Passport>(undefined)



    private loadPassportFormLocalStorage(): string | null {
        const jsonString = localStorage.getItem(this._key)
        if (!jsonString) return 'notfound'
        try {
            const passport = JSON.parse(jsonString) as Passport
            console.log(passport);
            this.data.set(passport)
        } catch (error) {
            return ` ${error}`
        }
        return null
    }

    private savePassportToLocalStorage() {
        const passport = this.data()
        if (!passport) return
        localStorage.setItem(this._key, JSON.stringify(passport))
    }
    constructor() {
        this.loadPassportFormLocalStorage()

    }

    async get(login: LoginModel): Promise<null | string> {
        try {
            const api_url = this._base_url + '/authentication/login';
            await this.fetchPassport(api_url, login);
        } catch (error: any) {
            console.error('Login Error:', error);
            if (error.status === 404 || (error.error && typeof error.error === 'string' && error.error.toLowerCase().includes('not found'))) {
                return 'record not found';
            }
            return error.error?.message || error.message || 'An error occurred during login';
        }
        return null;
    }

    private async fetchPassport(api_url: string, model: LoginModel | RegisterModel) {
        const result = this._http.post<Passport>(api_url, model);
        const passport = await firstValueFrom(result);
        this.data.set(passport);
        this.savePassportToLocalStorage();
    }

    async register(model: RegisterModel): Promise<null | string> {
        try {
            const api_url = this._base_url + '/brawlers/register';
            await this.fetchPassport(api_url, model);
        } catch (error: any) {
            console.error('Register Error:', error);
            return error.error?.message || error.message || 'An error occurred during registration';
        }
        return null;
    }

    logout() {
        this.data.set(undefined);
        localStorage.removeItem(this._key);
    }
}

