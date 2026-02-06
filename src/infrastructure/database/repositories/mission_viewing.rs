use std::sync::Arc;

use anyhow::Result;
use async_trait::async_trait;
use diesel::prelude::*;

use crate::domain::{
    entities::missions::MissionEntity,
    repositories::mission_viewing::MissionViewingRepository,
    value_objects::{brawler_model::BrawlerModel, mission_filter::MissionFilter},
};
use crate::infrastructure::database::{
    postgresql_connection::PgPoolSquad,
    schema::{crew_memberships, missions},
};

pub struct MissionViewingPostgres {
    db_pool: Arc<PgPoolSquad>,
}

impl MissionViewingPostgres {
    pub fn new(db_pool: Arc<PgPoolSquad>) -> Self {
        Self { db_pool }
    }
}

#[async_trait]
impl MissionViewingRepository for MissionViewingPostgres {
    async fn get_mission_crew(&self, mission_id: i32) -> Result<Vec<BrawlerModel>> {
        let mut conn = self.db_pool.get()?;

        let sql = r#"
                SELECT b.display_name,
                        COALESCE(b.avatar_url, '') AS avatar_url,
                        COALESCE(s.success_count, 0) AS mission_success_count,
                        COALESCE(j.joined_count, 0) AS mission_join_count
                FROM crew_memberships cm
                INNER JOIN brawlers b ON b.id = cm.brawler_id
                LEFT JOIN (
                    SELECT cm2.brawler_id, COUNT(*) AS success_count
                    FROM crew_memberships cm2
                    INNER JOIN missions m2 ON m2.id = cm2.mission_id
                    WHERE m2.status = 'success'
                    GROUP BY cm2.brawler_id
                ) s ON s.brawler_id = b.id
                LEFT JOIN (
                    SELECT cm3.brawler_id, COUNT(*) AS joined_count
                    FROM crew_memberships cm3
                    GROUP BY cm3.brawler_id
                ) j ON j.brawler_id = b.id
                WHERE cm.mission_id = $1
                        "#;

        let results = diesel::sql_query(sql)
            .bind::<diesel::sql_types::Int4, _>(mission_id)
            .load::<BrawlerModel>(&mut conn)?;

        Ok(results)
    }

    async fn crew_counting(&self, mission_id: i32) -> Result<u32> {
        let mut conn = self.db_pool.get()?;

        let count = crew_memberships::table
            .filter(crew_memberships::mission_id.eq(mission_id))
            .count()
            .get_result::<i64>(&mut conn)?;

        Ok(count as u32)
    }

    async fn view_detail(&self, mission_id: i32) -> Result<MissionEntity> {
        let mut conn = self.db_pool.get()?;
        let result = missions::table
            .filter(missions::id.eq(mission_id))
            .filter(missions::deleted_at.is_null())
            .select(MissionEntity::as_select())
            .first::<MissionEntity>(&mut conn)?;
        Ok(result)
    }

    async fn get(&self, filter: &MissionFilter) -> Result<Vec<(MissionEntity, i64)>> {
        let mut conn = self.db_pool.get()?;

        let mut query = missions::table
            .select(MissionEntity::as_select())
            .filter(missions::deleted_at.is_null())
            .into_boxed();

        if let Some(status) = &filter.status {
            query = query.filter(missions::status.eq(status.to_string()));
        };

        if let Some(name) = &filter.name {
            query = query.filter(missions::name.ilike(format!("%{}%", name)));
        };

        let missions_list = query
            .order_by(missions::created_at.desc())
            .load::<MissionEntity>(&mut conn)?;

        if missions_list.is_empty() {
            return Ok(Vec::new());
        }

        let ids: Vec<i32> = missions_list.iter().map(|m| m.id).collect();

        let counts: Vec<(i32, i64)> = crew_memberships::table
            .filter(crew_memberships::mission_id.eq_any(&ids))
            .group_by(crew_memberships::mission_id)
            .select((
                crew_memberships::mission_id,
                diesel::dsl::count(crew_memberships::brawler_id),
            ))
            .load::<(i32, i64)>(&mut conn)?;

        let counts_map: std::collections::HashMap<i32, i64> = counts.into_iter().collect();

        let result = missions_list
            .into_iter()
            .map(|m| {
                let count = counts_map.get(&m.id).copied().unwrap_or(0);
                (m, count)
            })
            .collect();

        Ok(result)
    }
}
