import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MissionMessage, SendMessageModel } from '../_models/mission-message';
import { SupabaseService } from './supabase-service';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({
    providedIn: 'root',
})
export class MissionMessageService {
    private _baseUrl = environment.baseUrl + '/api/mission-messages';
    private _http = inject(HttpClient);
    private _supabase = inject(SupabaseService);

    async getMessages(mission_id: number, limit?: number, before_id?: number, after_id?: number): Promise<MissionMessage[]> {
        let url = `${this._baseUrl}/${mission_id}/messages?`;
        if (limit) url += `limit=${limit}&`;
        if (before_id) url += `before_id=${before_id}&`;
        if (after_id) url += `after_id=${after_id}&`;
        return await firstValueFrom(this._http.get<MissionMessage[]>(url));
    }

    async sendMessage(mission_id: number, content: string): Promise<number> {
        const url = `${this._baseUrl}/${mission_id}/messages`;
        const model: SendMessageModel = { content };
        const res = await firstValueFrom(this._http.post<{ id: number }>(url, model));
        return res.id;
    }

    subscribeToMessages(mission_id: number, callback: (message: MissionMessage) => void): RealtimeChannel {
        return this._supabase.client
            .channel(`mission-messages-${mission_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mission_messages',
                    filter: `mission_id=eq.${mission_id}`,
                },
                (payload) => {
                    callback(payload.new as MissionMessage);
                }
            )
            .subscribe();
    }
}
