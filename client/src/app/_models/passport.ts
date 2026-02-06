export interface Passport {
    id: number;
    username?: string;
    token: string;
    accessToken: string;
    displayName: string;
    avatarUrl?: string;
    specialty?: string;
    expiresIn?: number;
}

export interface RegisterModel {
    username: string;
    password: string;
    displayName: string;


}
export interface LoginModel {
    username: string;
    password: string;
}