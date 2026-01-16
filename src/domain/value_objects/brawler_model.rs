use crate::domain::entities::brawlers::RegisterBrawlerEntity;
use diesel::prelude::*;
use diesel::sql_types::{Integer, Text};
use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterBrawlerModel {
    pub username: String,
    pub password: String,
    pub display_name: String,
}

impl RegisterBrawlerModel {
    pub fn to_entity(&self) -> RegisterBrawlerEntity {
        RegisterBrawlerEntity {
            username: self.username.clone(),
            password: self.password.clone(),
            display_name: self.display_name.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, QueryableByName)]
#[serde(rename_all = "camelCase")]
pub struct BrawlerModel {
    #[diesel(sql_type = Text)]
    pub display_name: String,
    #[diesel(sql_type = Text)]
    pub avatar_url: String,
    #[diesel(sql_type = Integer)]
    pub mission_success_count: i32,
    #[diesel(sql_type = Integer)]
    pub mission_join_count: i32,
}
