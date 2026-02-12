use std::env;

use anyhow::Result;

use crate::config::{
    config_model::{CloudinaryEnv, Database, DotEnvyConfig, JwtEnv, Server},
    stage::Stage,
};

pub fn load() -> Result<DotEnvyConfig> {
    dotenvy::dotenv().ok();

    let server = Server {
        port: env::var("SERVER_PORT")
            .map_err(|_| anyhow::anyhow!("SERVER_PORT is missing"))?
            .parse()
            .map_err(|_| anyhow::anyhow!("SERVER_PORT must be a number"))?,
        body_limit: env::var("SERVER_BODY_LIMIT")
            .map_err(|_| anyhow::anyhow!("SERVER_BODY_LIMIT is missing"))?
            .parse()
            .map_err(|_| anyhow::anyhow!("SERVER_BODY_LIMIT must be a number"))?,
        timeout: env::var("SERVER_TIMEOUT")
            .map_err(|_| anyhow::anyhow!("SERVER_TIMEOUT is missing"))?
            .parse()
            .map_err(|_| anyhow::anyhow!("SERVER_TIMEOUT must be a number"))?,
    };

    let database = Database {
        url: env::var("DATABASE_URL").map_err(|_| anyhow::anyhow!("DATABASE_URL is missing"))?,
    };

    let secret =
        env::var("JWT_USER_SECRET").map_err(|_| anyhow::anyhow!("JWT_USER_SECRET is missing"))?;

    let max_crew_size = env::var("MAX_CREW_SIZE")
        .unwrap_or_else(|_| "5".to_string()) // Default to 5 if missing
        .parse()
        .map_err(|_| anyhow::anyhow!("MAX_CREW_SIZE must be a number"))?;

    let config = DotEnvyConfig {
        server,
        database,
        secret,
        max_crew_size,
    };

    Ok(config)
}

pub fn get_stage() -> Stage {
    dotenvy::dotenv().ok();

    let stage_str = std::env::var("STAGE").unwrap_or("".to_string());
    Stage::try_form(&stage_str).unwrap_or_default()
}

// pub fn get_user_secret() -> Result<String> {
//     let dotenvy_env = match load() {
//         Ok(env) => env,
//         Err(e) => {
//             error!("Failed to load env: {}", e);
//             std::process::exit(1);
//         }
//     };

//     Ok(dotenvy_env.secret)
// }

pub fn get_jwt_env() -> Result<JwtEnv> {
    dotenvy::dotenv().ok();
    Ok(JwtEnv {
        secret: env::var("JWT_USER_SECRET")?,
        lift_time_days: env::var("JWT_USER_LIFT_TIME_DAYS")?.parse::<i64>()?,
    })
}

pub fn get_cloundinary_env() -> Result<CloudinaryEnv> {
    dotenvy::dotenv().ok();
    Ok(CloudinaryEnv {
        cloud_name: env::var("CLOUDINARY_CLOUD_NAME")?,
        api_key: env::var("CLOUDINARY_API_KEY")?,
        api_secret: env::var("CLOUDINARY_API_SECRET")?,
    })
}
