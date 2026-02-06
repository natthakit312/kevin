use anyhow::Result;
use async_trait::async_trait;
use mockall::automock;

use crate::domain::{
    entities::missions::MissionEntity, value_objects::mission_filter::MissionFilter,
};

use crate::domain::value_objects::brawler_model::BrawlerModel;

#[async_trait]
#[automock]
pub trait MissionViewingRepository {
    async fn view_detail(&self, mission_id: i32) -> Result<MissionEntity>;
    async fn get(&self, filter: &MissionFilter) -> Result<Vec<(MissionEntity, i64)>>;
    async fn crew_counting(&self, mission_id: i32) -> Result<u32>;
    async fn get_mission_crew(&self, mission_id: i32) -> Result<Vec<BrawlerModel>>;
}
