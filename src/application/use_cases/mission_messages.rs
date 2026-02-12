use anyhow::Result;
use std::sync::Arc;

use crate::{
    domain::entities::mission_messages::AddMissionMessageEntity,
    domain::value_objects::mission_message_model::{MissionMessageModel, SendMessageModel},
    infrastructure::database::repositories::{
        mission_messages::MissionMessagePostgres, mission_viewing::MissionViewingPostgres,
    },
};

pub struct MissionMessageUseCase {
    repo: Arc<MissionMessagePostgres>,
}

impl MissionMessageUseCase {
    pub fn new(repo: Arc<MissionMessagePostgres>) -> Self {
        Self { repo }
    }

    pub async fn send_message(
        &self,
        mission_id: i32,
        sender_id: i32,
        model: SendMessageModel,
    ) -> Result<i32> {
        // Check if mission exists and user is part of it (or is the chief)
        // For now, let's just check if it exists or keep it simple
        // In a real app, we'd check if sender_id is chief or in crew_memberships

        let entity = AddMissionMessageEntity {
            mission_id,
            sender_id,
            content: model.content,
        };

        self.repo.add(entity).await
    }

    pub async fn get_messages(
        &self,
        mission_id: i32,
        limit: Option<i64>,
        before_id: Option<i32>,
        after_id: Option<i32>,
    ) -> Result<Vec<MissionMessageModel>> {
        self.repo
            .get_by_mission_id(mission_id, limit, before_id, after_id)
            .await
    }
}
