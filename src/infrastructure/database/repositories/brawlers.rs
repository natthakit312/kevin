use anyhow::Result;
use async_trait::async_trait;
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl, SelectableHelper, insert_into};
use std::sync::Arc;

use crate::{
    domain::{
        entities::brawlers::{BrawlerEntity, RegisterBrawlerEntity},
        repositories::brawlers::BrawlerRepository,
        value_objects::{base64_img::Base64Img, uploaded_img::UploadedImg},
    },
    infrastructure::{
        cloundinary::{self, UploadImageOptions},
        database::{postgresql_connection::PgPoolSquad, schema::brawlers},
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
}
