use crate::domain::repositories::brawlers::BrawlerRepository;
use crate::domain::value_objects::base64_img::Base64Img;
use crate::domain::value_objects::brawler_model::RegisterBrawlerModel;
use crate::domain::value_objects::mission_model::MissionModel;
use crate::domain::value_objects::uploaded_img::UploadedImg;
use crate::infrastructure::argon2::hash;
use crate::infrastructure::cloundinary::UploadImageOptions;
use crate::infrastructure::jwt::jwt_model::Passport;
use anyhow::Result;
use std::sync::Arc;

pub struct BrawlersUseCase<T>
where
    T: BrawlerRepository + Send + Sync,
{
    brawler_repository: Arc<T>,
}

impl<T> BrawlersUseCase<T>
where
    T: BrawlerRepository + Send + Sync,
{
    pub fn new(brawler_repository: Arc<T>) -> Self {
        Self { brawler_repository }
    }

    pub async fn register(&self, mut register_model: RegisterBrawlerModel) -> Result<Passport> {
        register_model.password = hash(register_model.password.clone())?;

        let register_entity = register_model.to_entity();

        let username = register_model.username.clone();
        let display_name = register_model.display_name.clone();
        let brawler_id = self.brawler_repository.register(register_entity).await?;

        let passport = Passport::new(
            brawler_id,
            username,
            display_name,
            None,
            Some("RECON".to_string()),
        )?;

        Ok(passport)
    }

    pub async fn upload_base64img(
        &self,
        base64_string: String,
        brawler_id: i32,
    ) -> Result<UploadedImg> {
        let option = UploadImageOptions {
            folder: Some("brawlers_avatar".to_string()),
            public_id: Some(brawler_id.to_string()),
            transformation: Some("c_scale,w_256".to_string()),
        };

        let base64_image = Base64Img::new(base64_string)?;

        let uploaded = self
            .brawler_repository
            .upload_base64img(brawler_id, base64_image, option)
            .await?;

        Ok(uploaded)
    }

    pub async fn get_missions(&self, brawler_id: i32) -> Result<Vec<MissionModel>> {
        self.brawler_repository.get_missions(brawler_id).await
    }

    pub async fn crew_counting(&self, mission_id: i32) -> Result<u32> {
        self.brawler_repository.crew_counting(mission_id).await
    }

    pub async fn update_specialty(&self, user_id: i32, specialty: String) -> Result<()> {
        self.brawler_repository
            .update_specialty(user_id, specialty)
            .await
    }
}
