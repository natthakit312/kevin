use anyhow::Result;
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::{config::config_loader::get_jwt_env, infrastructure::jwt::generate_token};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Passport {
    pub token_type: String,
    pub access_token: String,
    pub token: String,
    pub expires_in: usize,
    pub display_name: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
}
impl Passport {
    pub fn new(user_id: i32, display_name: String, avatar_url: Option<String>) -> Result<Self> {
        let jwt_env = get_jwt_env().unwrap_or(crate::config::config_model::JwtEnv {
            secret: std::env::var("JWT_USER_SECRET")
                .unwrap_or_else(|_| "default_secret".to_string()),
            lift_time_days: 7,
        });

        let token_type = "Bearer".to_string();
        let expires_in = (Utc::now() + Duration::days(jwt_env.lift_time_days)).timestamp() as usize;

        let access_token_claims = Claims {
            sub: user_id.to_string(),
            exp: expires_in,
            iat: Utc::now().timestamp() as usize,
        };

        let access_token = generate_token(jwt_env.secret, &access_token_claims)?;

        Ok(Self {
            token_type,
            access_token,
            token: "".to_string(),
            expires_in,
            display_name,
            avatar_url,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginModel {
    pub username: String,
    pub password: String,
}
