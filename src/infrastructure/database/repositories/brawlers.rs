use anyhow::Result;
use async_trait::async_trait;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl, SelectableHelper, insert_into};
use std::sync::Arc;

use crate::{
    domain::{
        entities::brawlers::{BrawlerEntity, RegisterBrawlerEntity},
        repositories::brawlers::BrawlerRepository,
        value_objects::{
            base64_img::Base64Img, mission_model::MissionModel, uploaded_img::UploadedImg,
        },
    },
    infrastructure::{
        cloundinary::{self, UploadImageOptions},
        database::{
            postgresql_connection::PgPoolSquad,
            schema::{brawlers, crew_memberships},
        },
    },
};

pub struct BrawlerPostgres {
    db_pool: Arc<PgPoolSquad>,
}

impl BrawlerPostgres {
    pub fn new(db_pool: Arc<PgPoolSquad>) -> Self {
        Self { db_pool }
    }
}

#[async_trait]
impl BrawlerRepository for BrawlerPostgres {
    async fn register(&self, register_brawler_entity: RegisterBrawlerEntity) -> Result<i32> {
        let mut connection = Arc::clone(&self.db_pool).get()?;

        let user_id = insert_into(brawlers::table)
            .values(&register_brawler_entity)
            .returning(brawlers::id)
            .get_result::<i32>(&mut connection)?;

        Ok(user_id)
    }

    async fn find_by_username(&self, username: String) -> Result<BrawlerEntity> {
        let mut connection = Arc::clone(&self.db_pool).get()?;

        let result = brawlers::table
            .filter(brawlers::username.eq(username))
            .select(BrawlerEntity::as_select())
            .first::<BrawlerEntity>(&mut connection)?;

        Ok(result)
    }

    async fn find_by_id(&self, id: i32) -> Result<BrawlerEntity> {
        let mut connection = Arc::clone(&self.db_pool).get()?;

        let result = brawlers::table
            .filter(brawlers::id.eq(id))
            .select(BrawlerEntity::as_select())
            .first::<BrawlerEntity>(&mut connection)?;

        Ok(result)
    }

    async fn upload_base64img(
        &self,
        user_id: i32,
        base64_img: Base64Img,
        opt: UploadImageOptions,
    ) -> Result<UploadedImg> {
        let upload_img = cloundinary::upload(base64_img, opt).await?;
        let mut conn = Arc::clone(&self.db_pool).get()?;
        diesel::update(brawlers::table.filter(brawlers::id.eq(user_id)))
            .set((
                brawlers::avatar_url.eq(upload_img.url.clone()),
                brawlers::avatar_public_id.eq(upload_img.public_id.clone()),
            ))
            .execute(&mut conn)?;
        Ok(upload_img)
    }

    async fn crew_counting(&self, mission_id: i32) -> Result<u32> {
        let mut connection = Arc::clone(&self.db_pool).get()?;

        let count = crew_memberships::table
            .filter(crew_memberships::mission_id.eq(mission_id))
            .count()
            .get_result::<i64>(&mut connection)?;

        Ok(count as u32)
    }

    async fn get_missions(&self, brawler_id: i32) -> Result<Vec<MissionModel>> {
        let mut conn = Arc::clone(&self.db_pool).get()?;

        // Use a raw SQL query to select the MissionModel fields including
        // the chief's display name and the crew count.
        let sql = r#"
            SELECT
                missions.id,
                missions.name,
                missions.description,
                missions.status,
                missions.chief_id,
                brawlers.display_name AS chief_display_name,
                (SELECT COUNT(*)::BIGINT FROM crew_memberships WHERE crew_memberships.mission_id = missions.id) AS crew_count,
                missions.max_crew,
                missions.created_at,
                missions.updated_at
            FROM missions
            LEFT JOIN brawlers ON brawlers.id = missions.chief_id
            WHERE missions.deleted_at IS NULL
                AND (
                    missions.chief_id = $1 
                    OR EXISTS (
                        SELECT 1 
                        FROM crew_memberships 
                        WHERE crew_memberships.mission_id = missions.id 
                        AND crew_memberships.brawler_id = $1
                    )
                )
            ORDER BY missions.created_at DESC
        "#;

        let results = diesel::sql_query(sql)
            .bind::<diesel::sql_types::Int4, _>(brawler_id)
            .load::<MissionModel>(&mut conn)?;

        Ok(results)
    }

    async fn update_specialty(&self, user_id: i32, specialty: String) -> Result<()> {
        let mut conn = Arc::clone(&self.db_pool).get()?;
        diesel::update(brawlers::table.filter(brawlers::id.eq(user_id)))
            .set(brawlers::specialty.eq(specialty))
            .execute(&mut conn)?;
        Ok(())
    }
}
