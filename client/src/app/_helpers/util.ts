import { Passport } from "../_models/passport";

const _default_avatar = '/assets/default-avatar.jpg';

export function getAvatarUrl(source: Passport | string | undefined | null): string {
    if (typeof source === 'string' && source.trim() !== '') return source;
    if (source && typeof source === 'object' && 'avatarUrl' in source && source.avatarUrl) {
        return source.avatarUrl;
    }
    return _default_avatar;
}