export interface MissionMessage {
    id: number;
    mission_id: number;
    sender_id: number;
    sender_display_name: string;
    sender_avatar_url?: string;
    content: string;
    created_at: string; // ISO string
}

export interface SendMessageModel {
    content: string;
}
