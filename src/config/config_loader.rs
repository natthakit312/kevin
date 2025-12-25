use std::env;

use anyhow::Result;

use crate::config::{
    config_model::{CloudinaryEnv, Database, DotEnvyConfig, JwtEnv, Server},
    stage::Stage,
};

pub fn load() -> Result<DotEnvyConfig> {
    dotenvy::dotenv().ok();

    let server = Server {
        port: std::env::var("SERVER_PORT")
            .expect("SERVER_PORT is valid")
            .parse()?,
        body_limit: std::env::var("SERVER_BODY_LIMIT")
            .expect("SERVER_BODY_LIMIT is valid")
            .parse()?,
        timeout: std::env::var("SERVER_TIMEOUT")
            .expect("SERVER_TIMEOUT is valid")
            .parse()?,
    };

    let database = Database {
        url: std::env::var("DATABASE_URL")
            .expect("DATABASE_URL is valid")
            .parse()?,
    };

    let secret = std::env::var("JWT_USER_SECRET")
        .expect("SECRET is valid")
        .parse()?;

    let max_crew_size = std::env::var("MAX_CREW_SIZE")
        .expect("MAX_CREW_SIZE is valid")
        .parse()?;

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
