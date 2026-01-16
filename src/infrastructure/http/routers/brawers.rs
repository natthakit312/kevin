use crate::infrastructure::http::middleware::auth::authorization;
use crate::{
    application::use_cases::brawlers::BrawlersUseCase,
    domain::{
        repositories::brawlers::BrawlerRepository,
        value_objects::{brawler_model::RegisterBrawlerModel, uploaded_img::UploadBase64Img},
    },
    infrastructure::database::{
        postgresql_connection::PgPoolSquad, repositories::brawlers::BrawlerPostgres,
    },
};
use axum::{
    Extension, Json, Router, extract::State, http::StatusCode, response::IntoResponse,
    routing::post,
};

use std::sync::Arc;

pub fn routes(db_pool: Arc<PgPoolSquad>) -> Router {
    let repository = BrawlerPostgres::new(db_pool.clone());
    let use_case = BrawlersUseCase::new(Arc::new(repository));

    let protected_routes: Router<_> = Router::new()
        .route("/avatar", post(upload_avatar))
        .route_layer(axum::middleware::from_fn(authorization));

    Router::new()
        .merge(protected_routes)
        .route("/register", post(register))
        .with_state(Arc::new(use_case))
}

pub async fn register<T>(
    State(use_case): State<Arc<BrawlersUseCase<T>>>,
    Json(model): Json<RegisterBrawlerModel>,
) -> impl IntoResponse
where
    T: BrawlerRepository + Send + Sync,
{
    match use_case.register(model).await {
        Ok(passport) => (StatusCode::CREATED, Json(passport)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn upload_avatar<T>(
    State(use_case): State<Arc<BrawlersUseCase<T>>>,
    Extension(user_id): Extension<i32>,
    Json(model): Json<UploadBase64Img>,
) -> impl IntoResponse
where
    T: BrawlerRepository + Send + Sync,
{
    match use_case.upload_base64img(model.base64_img, user_id).await {
        Ok(uploaded) => (StatusCode::OK, Json(uploaded)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
