import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MissionMessage, SendMessageModel } from '../_models/mission-message';

@Injectable({
    providedIn: 'root',
})
export class MissionMessageService {
    private _baseUrl = environment.baseUrl + '/api/mission-messages';
    private _http = inject(HttpClient);

    async getMessages(missionId: number, limit?: number, beforeId?: number, afterId?: number): Promise<MissionMessage[]> {
        let url = `${this._baseUrl}/${missionId}/messages?`;
        if (limit) url += `limit=${limit}&`;
        if (beforeId) url += `before_id=${beforeId}&`;
        if (afterId) url += `after_id=${afterId}&`;
        return await firstValueFrom(this._http.get<MissionMessage[]>(url));
    }

    async sendMessage(missionId: number, content: string): Promise<number> {
        const url = `${this._baseUrl}/${missionId}/messages`;
        const model: SendMessageModel = { content };
        const res = await firstValueFrom(this._http.post<{ id: number }>(url, model));
        return res.id;
    }
}
