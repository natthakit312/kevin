use chrono::NaiveDateTime;
use diesel::prelude::*;

use crate::infrastructure::database::schema::mission_messages;

#[derive(Debug, Clone, Identifiable, Selectable, Queryable, Associations)]
#[diesel(table_name = mission_messages)]
#[diesel(belongs_to(crate::domain::entities::missions::MissionEntity, foreign_key = mission_id))]
#[diesel(belongs_to(crate::domain::entities::brawlers::BrawlerEntity, foreign_key = sender_id))]
pub struct MissionMessageEntity {
    pub id: i32,
    pub mission_id: i32,
    pub sender_id: i32,
    pub content: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Insertable)]
#[diesel(table_name = mission_messages)]
pub struct AddMissionMessageEntity {
    pub mission_id: i32,
    pub sender_id: i32,
    pub content: String,
}
