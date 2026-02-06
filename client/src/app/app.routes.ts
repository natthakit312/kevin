import { Routes } from '@angular/router';
import { Profile } from './profile/profile';
import { Login } from './login/login';
import { Home } from './home/home';
import { NotFound } from './not-found/not-found';
import { ServerError } from './server-error/server-error';
import { Missions } from './missions/missions';
import { MissionManager } from './missions/mission-manager/mission-manager';
import { JoinedMissions } from './missions/joined-missions/joined-missions';
import { MissionDetail } from './missions/mission-detail/mission-detail';
import { authGuard } from './_gurad/auth-guard';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'login', component: Login },
    { path: 'profile', component: Profile, canActivate: [authGuard], runGuardsAndResolvers: 'always' },
    { path: 'missions', component: Missions },
    { path: 'missions/:id', component: MissionDetail },
    {
        path: 'chief',
        component: MissionManager,
        runGuardsAndResolvers: 'always',
        canActivate: [authGuard]
    },
    {
        path: 'crew',
        component: JoinedMissions,
        canActivate: [authGuard]
    },
    { path: 'not-found', component: NotFound },
    { path: 'server-error', component: ServerError },
    { path: '**', component: NotFound }
];
