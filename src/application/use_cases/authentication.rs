use anyhow::Result;
use argon2::PasswordVerifier;
use chrono::{Duration, Utc};
use std::sync::Arc;

use crate::{
    config::config_loader::get_user_secret,
    domain::repositories::brawlers::BrawlerRepository,
    infrastructure::jwt::{
        authentication_model::LoginModel,
        generate_token,
        jwt_model::{Claims, Passport},
    },
};

pub struct AuthenticationUseCase<T>
where
    T: BrawlerRepository + Send + Sync,
{
    brawler_repository: Arc<T>,
}

impl<T> AuthenticationUseCase<T>
where
    T: BrawlerRepository + Send + Sync,
{
    pub fn new(brawler_repository: Arc<T>) -> Self {
        Self { brawler_repository }
    }
    pub async fn login(&self, login_model: LoginModel) -> Result<Passport> {
        let secret = get_user_secret()?;
        let username = login_model.username.clone();

        let user = self.brawler_repository.find_by_username(username).await?;
        let password = user.password;

        let parsed_hash = argon2::PasswordHash::new(&password)
            .map_err(|_| anyhow::anyhow!("Invalid password hash in database"))?;

        if argon2::Argon2::default()
            .verify_password(login_model.password.as_bytes(), &parsed_hash)
            
            .is_err()
        {
            return Err(anyhow::anyhow!("Invalid password"));
        }

        let claims = Claims {
            sub: user.id.to_string(),
            exp: (Utc::now() + Duration::days(5)).timestamp() as usize,
            iat: Utc::now().timestamp() as usize,
        };

        let token = generate_token(secret, &claims)?;

        Ok(Passport {
            access_token: token,
            refresh_token: "".to_string(),
        })
    }
}
