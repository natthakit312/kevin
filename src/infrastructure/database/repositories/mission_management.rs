use std::sync::Arc;

use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use diesel::{
    ExpressionMethods, RunQueryDsl,
    dsl::{insert_into, update},
};

use crate::domain::{
    entities::missions::{AddMissionEntity, EditMissionEntity},
    repositories::mission_management::MissionManagementRepository,
};
use crate::infrastructure::database::{postgresql_connection::PgPoolSquad, schema::missions};

pub struct MissionManagementPostgres {
    db_pool: Arc<PgPoolSquad>,
}

impl MissionManagementPostgres {
    pub fn new(db_pool: Arc<PgPoolSquad>) -> Self {
        Self { db_pool }
    }
}

#[async_trait]
impl MissionManagementRepository for MissionManagementPostgres {
    async fn add(&self, add_mission_entity: AddMissionEntity) -> Result<i32> {
        let mut conn = self.db_pool.get()?;
        let id = insert_into(missions::table)
            .values(add_mission_entity)
            .returning(missions::id)
            .get_result(&mut conn)?;
        Ok(id)
    }

    async fn edit(&self, mission_id: i32, edit_mission_entity: EditMissionEntity) -> Result<i32> {
        let mut conn = self.db_pool.get()?;
        let id = update(missions::table)
            .filter(missions::id.eq(mission_id))
            .filter(missions::chief_id.eq(edit_mission_entity.chief_id))
            .set(edit_mission_entity)
            .returning(missions::id)
            .get_result(&mut conn)?;
        Ok(id)
    }

    async fn remove(&self, mission_id: i32, chief_id: i32) -> Result<()> {
        let mut conn = self.db_pool.get()?;
        update(missions::table)
            .filter(missions::id.eq(mission_id))
            .filter(missions::chief_id.eq(chief_id))
            .set(missions::deleted_at.eq(Utc::now().naive_utc()))
            .execute(&mut conn)?;
        Ok(())
    }
}
