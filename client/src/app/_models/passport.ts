export interface Passport {
    token: string;
    displayName: string;
    avatarUrl?: string;
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