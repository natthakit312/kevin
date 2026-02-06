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
    isSignin = signal<boolean>(false)

    saveAvatarImgUrl(url: string) {
        const passport = this.data();
        if (passport) {
            this.data.set({ ...passport, avatarUrl: url });
            this.savePassportToLocalStorage();
        }
    }


    private loadPassportFormLocalStorage(): string | null {
        const jsonString = localStorage.getItem(this._key)
        if (!jsonString) return 'notfound'
        try {
            const passport = JSON.parse(jsonString) as Passport

            // STRICT CHECK: If expiresIn is missing (legacy token) or expired -> LOGOUT
            if (!passport.expiresIn) {
                console.warn('Legacy token detected (no expiry). Forcing logout.');
                this.destroy();
                return 'legacy_token';
            }

            // Also check for required fields that might be missing in corrupt sessions
            if (!passport.displayName || !passport.token && !passport.accessToken) {
                console.warn('Corrupt passport data. Forcing logout.');
                this.destroy();
                return 'corrupt_data';
            }

            const now = Math.floor(Date.now() / 1000);
            if (now >= passport.expiresIn) {
                console.warn('Session expired, clearing passport.');
                this.destroy();
                return 'session_expired';
            }

            console.log('Passport loaded:', passport);
            this.data.set(passport)
            this.isSignin.set(true)
        } catch (error) {
            return ` ${error}`
        }
        return null
    }

    private savePassportToLocalStorage(): void {
        const passport = this.data()
        if (!passport) return
        localStorage.setItem(this._key, JSON.stringify(passport))
        this.isSignin.set(true)
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
            const api_url = this._base_url + '/brawler/register';
            await this.fetchPassport(api_url, model);
        } catch (error: any) {
            console.error('Register Error:', error);
            return error.error?.message || error.message || 'An error occurred during registration';
        }
        return null;
    }

    async updateSpecialty(specialty: string): Promise<void> {
        const passport = this.data();
        if (!passport) return;

        const api_url = this._base_url + '/brawler/specialty';
        await firstValueFrom(this._http.post(api_url, { specialty }));

        this.data.set({ ...passport, specialty });
        this.savePassportToLocalStorage();
    }

    destroy() {
        this.data.set(undefined);
        localStorage.removeItem(this._key);
        this.isSignin.set(false);
    }
}

