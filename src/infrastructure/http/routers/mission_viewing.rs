use std::sync::Arc;

use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
};

use crate::{
    application::use_cases::mission_viewing::MissionViewingUseCase,
    domain::{
        repositories::mission_viewing::MissionViewingRepository,
        value_objects::mission_filter::MissionFilter,
    },
    infrastructure::database::{
        postgresql_connection::PgPoolSquad, repositories::mission_viewing::MissionViewingPostgres,
    },
};
pub async fn view_detail<T>(
    State(mission_viewing_use_case): State<Arc<MissionViewingUseCase<T>>>,
    Path(mission_id): Path<i32>,
) -> impl IntoResponse
where
    T: MissionViewingRepository + Send + Sync,
{
    match mission_viewing_use_case.view_detail(mission_id).await {
        Ok(mission_model) => (StatusCode::OK, Json(mission_model)).into_response(),
        Err(e) => {
            if e.to_string().contains("NotFound") || e.to_string().contains("Record not found") {
                (
                    StatusCode::NOT_FOUND,
                    format!("Mission with ID {} not found", mission_id),
                )
                    .into_response()
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
            }
        }
    }
}

pub async fn gets<T>(
    State(mission_viewing_use_case): State<Arc<MissionViewingUseCase<T>>>,
    filter: Query<MissionFilter>,
) -> impl IntoResponse
where
    T: MissionViewingRepository + Send + Sync,
{
    match mission_viewing_use_case.get(&filter).await {
        Ok(mission_model) => (StatusCode::OK, Json(mission_model)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub fn routes(db_pool: Arc<PgPoolSquad>) -> Router {
    let mission_viewing_repository = MissionViewingPostgres::new(db_pool);

    let use_case = MissionViewingUseCase::new(Arc::new(mission_viewing_repository));

    Router::new()
        .route("/{mission_id}", get(view_detail))
        .route("/gets", get(gets))
        .with_state(Arc::new(use_case))
}
