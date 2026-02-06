import { Component, inject, computed, Signal, effect, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PassportService } from '../_services/passport-service';
import { MissionService } from '../_services/mission-service';
import { Mission } from '../_models/mission';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { getAvatarUrl } from '../_helpers/util';

import { LanguageService } from '../_services/language-service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private _passport = inject(PassportService);
  private _missionService = inject(MissionService);
  private _router = inject(Router);
  public langService = inject(LanguageService);

  user = computed(() => this._passport.data());
  avatarUrl = computed(() => {
    const user = this.user();
    // Use a placeholder if no avatar, or return the user's avatar. 
    // For CoD feel, we could use a tall portrait.
    return getAvatarUrl(user);
  });

  stats = signal({
    totalCreated: 0,
    totalJoined: 0,
    totalCompleted: 0
  });

  recentActivities = signal<any[]>([]);
  topMissions = signal<Mission[]>([]);

  constructor() {
    effect(() => {
      const user = this.user();
      untracked(() => {
        this.loadDashboardData();
      });
    });
  }

  private resetData() {
    this.stats.set({ totalCreated: 0, totalJoined: 0, totalCompleted: 0 });
    this.recentActivities.set([]);
    this.topMissions.set([]);
  }

  async loadDashboardData() {
    try {
      const user = untracked(() => this.user());
      const myId = user?.id;

      if (myId) {
        const myMissions = await this._missionService.getMyMissions();
        this.stats.set({
          totalCreated: myMissions.filter(m => m.chief_id === myId).length,
          totalJoined: myMissions.filter(m => m.chief_id !== myId).length,
          totalCompleted: myMissions.filter(m => m.status === 'Completed').length
        });
      } else {
        this.resetData();
      }

      const allMissions = await this._missionService.gets({});
      const sortedMissions = [...allMissions].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      this.topMissions.set(sortedMissions.slice(0, 10));

      const activities = sortedMissions.slice(0, 20).map(m => {
        let actionKey = '';
        if (m.status === 'Open') actionKey = 'home.activity.created';
        else if (m.status === 'InProgress') actionKey = 'home.activity.started';
        else if (m.status === 'Completed') actionKey = 'home.activity.completed';
        else if (m.status === 'Failed') actionKey = 'home.activity.failed';

        return {
          user: m.chief_display_name,
          actionKey: actionKey,
          missionName: m.name,
          time: m.updated_at,
          missionId: m.id
        };
      });

      this.recentActivities.set(activities);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }
}
