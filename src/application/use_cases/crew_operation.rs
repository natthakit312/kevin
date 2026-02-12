use crate::domain::entities::crew_memberships::CrewMemberShips;
use crate::domain::repositories::crew_operation::CrewOperationRepository;
use crate::domain::repositories::mission_viewing::MissionViewingRepository;
use crate::domain::value_objects::mission_statuses::MissionStatuses;
use anyhow::Result;
use std::sync::Arc;

pub struct CrewOperationUseCase<T1, T2> {
    crew_operation_repository: Arc<T1>,
    mission_viewing_repository: Arc<T2>,
}

impl<T1, T2> CrewOperationUseCase<T1, T2>
where
    T1: CrewOperationRepository + Send + Sync + 'static,
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
            .await
            .map_err(|_| anyhow::anyhow!("Mission with ID {} not found", mission_id))?;

        let crew_count = self
            .mission_viewing_repository
            .crew_counting(mission_id)
            .await?;

        let mission_status_condition = mission.status == MissionStatuses::Open.to_string();
        if !mission_status_condition {
            return Err(anyhow::anyhow!("Mission is not joinable (must be Open)"));
        }

        let crew_count_condition = (crew_count as i32) < mission.max_crew;
        if !crew_count_condition {
            return Err(anyhow::anyhow!("Mission is full"));
        }

        match self
            .crew_operation_repository
            .join(CrewMemberShips {
                mission_id,
                brawler_id,
            })
            .await
        {
            Ok(_) => Ok(()),
            Err(e) => {
                // If the user is already joined (duplicate key), consider it a success.
                if e.to_string().to_lowercase().contains("duplicate key")
                    || e.to_string().to_lowercase().contains("unique constraint")
                {
                    return Ok(());
                }
                Err(e)
            }
        }
    }

    pub async fn leave(&self, mission_id: i32, brawler_id: i32) -> Result<()> {
        let mission = self
            .mission_viewing_repository
            .view_detail(mission_id)
            .await
            .map_err(|_| anyhow::anyhow!("Mission with ID {} not found", mission_id))?;

        if mission.status == MissionStatuses::Completed.to_string()
            || mission.status == MissionStatuses::Failed.to_string()
        {
            return Err(anyhow::anyhow!(
                "Cannot leave a mission that has already ended (Completed/Failed)"
            ));
        }

        println!(
            "Leaving mission: {} for brawler: {}",
            mission_id, brawler_id
        );
        self.crew_operation_repository
            .leave(CrewMemberShips {
                mission_id,
                brawler_id,
            })
            .await?;

        Ok(())
    }
}
