use crate::domain::entities::brawlers::RegisterBrawlerEntity;
use diesel::prelude::*;
use diesel::sql_types::{Int4, Varchar}; // Using Int4 and Varchar to be consistent with MissionModel
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
pub struct BrawlerModel {
    #[diesel(sql_type = Int4)]
    pub id: i32,
    #[diesel(sql_type = Varchar)]
    pub display_name: String,
    #[diesel(sql_type = Varchar)]
    pub avatar_url: String,
    #[diesel(sql_type = Varchar)]
    pub specialty: String,
    #[diesel(sql_type = Int4)]
    pub mission_success_count: i32,
    #[diesel(sql_type = Int4)]
    pub mission_join_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSpecialtyModel {
    pub specialty: String,
}
