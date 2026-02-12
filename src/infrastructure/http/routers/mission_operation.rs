use std::sync::Arc;

use axum::{
    Extension, Router,
    extract::{Path, State},
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::patch,
};

use crate::{
    application::use_cases::mission_operation::MissionOperationUseCase,
    domain::{
        repositories::{
            mission_operation::MissionOperationRepository,
            mission_viewing::MissionViewingRepository,
        },
        value_objects::mission_statuses::MissionStatuses,
    },
    infrastructure::{
        database::{
            postgresql_connection::PgPoolSquad,
            repositories::{
                mission_operation::MissionOperationPostgres,
                mission_viewing::MissionViewingPostgres,
            },
        },
        http::middleware::auth::authorization,
    },
};

pub async fn in_progress<T1, T2>(
    State(mission_operation_repository): State<Arc<MissionOperationUseCase<T1, T2>>>,
    Extension(user_id): Extension<i32>,
    Path(mission_id): Path<i32>,
) -> impl IntoResponse
where
    T1: MissionOperationRepository + Send + Sync,
    T2: MissionViewingRepository + Send + Sync,
{
    match mission_operation_repository
        .in_progress(mission_id, user_id)
        .await
    {
        Ok(mission_id) => (
            StatusCode::OK,
            format!(
                "Mission({}) is now {:?}",
                mission_id,
                MissionStatuses::InProgress
            ),
        )
            .into_response(),
        Err(e) => {
            eprintln!("IN PROGRESS ERROR: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn to_completed<T1, T2>(
    State(mission_operation_repository): State<Arc<MissionOperationUseCase<T1, T2>>>,
    Extension(user_id): Extension<i32>,
    Path(mission_id): Path<i32>,
) -> impl IntoResponse
where
    T1: MissionOperationRepository + Send + Sync,
    T2: MissionViewingRepository + Send + Sync,
{
    match mission_operation_repository
        .to_completed(mission_id, user_id)
        .await
    {
        Ok(mission_id) => (
            StatusCode::OK,
            format!(
                "Mission({}) is now {:?}",
                mission_id,
                MissionStatuses::Completed
            ),
        )
            .into_response(),
        Err(e) => {
            eprintln!("COMPLETED ERROR: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn to_failed<T1, T2>(
    State(mission_operation_repository): State<Arc<MissionOperationUseCase<T1, T2>>>,
    Extension(user_id): Extension<i32>,
    Path(mission_id): Path<i32>,
) -> impl IntoResponse
where
    T1: MissionOperationRepository + Send + Sync,
    T2: MissionViewingRepository + Send + Sync,
{
    match mission_operation_repository
        .to_failed(mission_id, user_id)
        .await
    {
        Ok(mission_id) => (
            StatusCode::OK,
            format!(
                "Mission_id:({}) is now {:?}",
                mission_id,
                MissionStatuses::Failed
            ),
        )
            .into_response(),
        Err(e) => {
            eprintln!("FAILED ERROR: {:?}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub fn routes(db_pool: Arc<PgPoolSquad>) -> Router {
    let mission_operation_repository = MissionOperationPostgres::new(Arc::clone(&db_pool));
    let mission_viewing_repository = MissionViewingPostgres::new(Arc::clone(&db_pool));

    let use_case = MissionOperationUseCase::new(
        Arc::new(mission_operation_repository),
        Arc::new(mission_viewing_repository),
    );

    Router::new()
        .route(
            "/in_progress/{mission_id}",
            patch(in_progress::<MissionOperationPostgres, MissionViewingPostgres>),
        )
        .route(
            "/to_completed/{mission_id}",
            patch(to_completed::<MissionOperationPostgres, MissionViewingPostgres>),
        )
        .route(
            "/to_failed/{mission_id}",
            patch(to_failed::<MissionOperationPostgres, MissionViewingPostgres>),
        )
        .route_layer(middleware::from_fn(authorization))
        .with_state(Arc::new(use_case))
}
