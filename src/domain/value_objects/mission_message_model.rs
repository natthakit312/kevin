use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MissionMessageModel {
    pub id: i32,
    pub mission_id: i32,
    pub sender_id: i32,
    pub sender_display_name: String,
    pub sender_avatar_url: Option<String>,
    pub content: String,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SendMessageModel {
    pub content: String,
}
