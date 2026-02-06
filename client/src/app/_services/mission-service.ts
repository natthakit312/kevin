import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Mission } from '../_models/mission';
import { MissionFilter } from '../_models/mission-filter';
import { firstValueFrom } from 'rxjs';
import { AddMission } from '../_models/add-mission';

@Injectable({
  providedIn: 'root',
})
export class MissionService {
  private _baseUrl = environment.baseUrl + '/api';
  private _http = inject(HttpClient);

  filter: MissionFilter = {};

  async gets(filter: MissionFilter): Promise<Mission[]> {
    const queryString = this.toQueryString(filter);
    const response = await firstValueFrom(
      this._http.get<Mission[]>(`${this._baseUrl}/mission-viewing/gets${queryString}`)
    );
    return response;
  }

  async get(id: number): Promise<Mission> {
    const response = await firstValueFrom(
      this._http.get<Mission>(`${this._baseUrl}/mission-viewing/${id}`)
    );
    return response;
  }

  async getCrew(id: number): Promise<any[]> {
    const response = await firstValueFrom(
      this._http.get<any[]>(`${this._baseUrl}/mission-viewing/crew/${id}`)
    );
    return response;
  }

  async getMyMissions(): Promise<Mission[]> {
    const url = this._baseUrl + '/brawler/my-missions'
    const observable = this._http.get<Mission[]>(url)
    const missions = await firstValueFrom(observable)
    return missions
  }

  async add(mission: AddMission): Promise<number> {
    const url = this._baseUrl + '/mission-management';
    const observable = this._http.post<{ mission_id: number }>(url, mission);
    const resp = await firstValueFrom(observable);
    return resp.mission_id;
  }

  async join(missionId: number): Promise<void> {
    const url = `${this._baseUrl}/crew/join/${missionId}`;
    await firstValueFrom(this._http.post(url, {}, { responseType: 'text' }));
  }

  async leave(missionId: number): Promise<void> {
    const url = `${this._baseUrl}/crew/leave/${missionId}`;
    await firstValueFrom(this._http.delete(url, { responseType: 'text' }));
  }

  async delete(missionId: number): Promise<void> {
    const url = `${this._baseUrl}/mission-management/${missionId}`;
    await firstValueFrom(this._http.delete(url, { responseType: 'text' }));
  }

  async updateStatusToInProgress(missionId: number): Promise<void> {
    const url = `${this._baseUrl}/mission-operation/in_progress/${missionId}`;
    await firstValueFrom(this._http.patch(url, {}, { responseType: 'text' }));
  }

  async updateStatusToCompleted(missionId: number): Promise<void> {
    const url = `${this._baseUrl}/mission-operation/to_completed/${missionId}`;
    await firstValueFrom(this._http.patch(url, {}, { responseType: 'text' }));
  }

  async updateStatusToFailed(missionId: number): Promise<void> {
    const url = `${this._baseUrl}/mission-operation/to_failed/${missionId}`;
    await firstValueFrom(this._http.patch(url, {}, { responseType: 'text' }));
  }

  async update(missionId: number, model: { name?: string, description?: string, status?: string }): Promise<void> {
    const url = `${this._baseUrl}/mission-management/${missionId}`;
    await firstValueFrom(this._http.patch(url, model, { responseType: 'text' }));
  }

  private toQueryString(filter: MissionFilter): string {
    const params = new URLSearchParams();

    if (filter.name) {
      params.append('name', filter.name);
    }

    if (filter.status) {
      params.append('status', filter.status);
    }

    if (filter.limit !== undefined) {
      params.append('limit', filter.limit.toString());
    }

    if (filter.offset !== undefined) {
      params.append('offset', filter.offset.toString());
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }
}
