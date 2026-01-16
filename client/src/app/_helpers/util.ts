import { Passport } from "../_models/passport";

const _default_avatar = 'assets/defult avartar.jpg';

export function getAvatar(passport: Passport | undefined): string {
    if (passport?.avatarUrl) return passport.avatarUrl;
    return _default_avatar;
}