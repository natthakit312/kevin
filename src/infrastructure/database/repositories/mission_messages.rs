use anyhow::Result;
use diesel::prelude::*;

use crate::{
    domain::entities::{
        brawlers::BrawlerEntity,
        mission_messages::{AddMissionMessageEntity, MissionMessageEntity},
    },
    domain::value_objects::mission_message_model::MissionMessageModel,
    infrastructure::database::{postgresql_connection::PgPoolSquad, schema::mission_messages},
};

pub struct MissionMessagePostgres {
    pool: PgPoolSquad,
}

impl MissionMessagePostgres {
    pub fn new(pool: PgPoolSquad) -> Self {
        Self { pool }
    }

    pub async fn add(&self, entity: AddMissionMessageEntity) -> Result<i32> {
        let mut conn = self.pool.get()?;
        let id = diesel::insert_into(mission_messages::table)
            .values(&entity)
            .returning(mission_messages::id)
            .get_result(&mut conn)?;
        Ok(id)
    }

    pub async fn get_by_mission_id(
        &self,
        mission_id: i32,
        limit: Option<i64>,
        before_id: Option<i32>,
        after_id: Option<i32>,
    ) -> Result<Vec<MissionMessageModel>> {
        use crate::infrastructure::database::schema::brawlers;
        let mut conn = self.pool.get()?;

        let mut query = mission_messages::table
            .inner_join(brawlers::table.on(mission_messages::sender_id.eq(brawlers::id)))
            .filter(mission_messages::mission_id.eq(mission_id))
            .into_boxed();

        if let Some(bid) = before_id {
            query = query.filter(mission_messages::id.lt(bid));
        }

        if let Some(aid) = after_id {
            query = query.filter(mission_messages::id.gt(aid));
        }

        let limit_val = limit.unwrap_or(100);

        let results = if after_id.is_some() {
            query
                .order(mission_messages::id.asc())
                .limit(limit_val)
                .select((
                    MissionMessageEntity::as_select(),
                    BrawlerEntity::as_select(),
                ))
                .load::<(MissionMessageEntity, BrawlerEntity)>(&mut conn)?
        } else {
            let mut res = query
                .order(mission_messages::id.desc())
                .limit(limit_val)
                .select((
                    MissionMessageEntity::as_select(),
                    BrawlerEntity::as_select(),
                ))
                .load::<(MissionMessageEntity, BrawlerEntity)>(&mut conn)?;
            res.reverse();
            res
        };

        let mut models: Vec<MissionMessageModel> = results
            .into_iter()
            .map(|(m, b)| MissionMessageModel {
                id: m.id,
                mission_id: m.mission_id,
                sender_id: m.sender_id,
                sender_display_name: b.display_name,
                sender_avatar_url: b.avatar_url,
                content: m.content,
                created_at: m.created_at,
            })
            .collect();

        // Reverse to get chronological order (oldest -> newest)
        models.reverse();

        Ok(models)
    }
}
