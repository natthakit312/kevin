use crate::domain::entities::crew_memberships::CrewMemberShips;
use crate::domain::repositories::crew_operation::CrewParticipationRepository;
use crate::domain::repositories::mission_viewing::MissionViewingRepository;
use crate::domain::value_objects::mission_statuses::MissionStatuses;
use anyhow::Result;
use std::sync::Arc;

const MAX_CREW_PER_MISSION: u32 = 5;

pub struct CrewOperationUseCase<T1, T2> {
    crew_operation_repository: Arc<T1>,
    mission_viewing_repository: Arc<T2>,
}

impl<T1, T2> CrewOperationUseCase<T1, T2>
where
    T1: CrewParticipationRepository + Send + Sync + 'static,
    T2: MissionViewingRepository + Send + Sync,
{
    pub fn new(crew_operation_repository: Arc<T1>, mission_viewing_repository: Arc<T2>) -> Self {
        Self {
            crew_operation_repository,
            mission_viewing_repository,
        }
    }

    pub async fn join(&self, mission_id: i32, brawler_id: i32) -> Result<()> {
        let mission = self
            .mission_viewing_repository
            .view_detail(mission_id)
            .await?;

        let crew_count = self
            .mission_viewing_repository
            .crew_counting(mission_id)
            .await?;

        let mission_status_condition = mission.status == MissionStatuses::Open.to_string()
            || mission.status == MissionStatuses::Failed.to_string();
        if !mission_status_condition {
            return Err(anyhow::anyhow!("Mission is not joinable"));
        }

        let crew_count_condition = crew_count < MAX_CREW_PER_MISSION;
        if !crew_count_condition {
            return Err(anyhow::anyhow!("Mission is full"));
        }

        self.crew_operation_repository
            .join(CrewMemberShips {
                mission_id,
                brawler_id,
            })
            .await?;

        Ok(())
    }
}
