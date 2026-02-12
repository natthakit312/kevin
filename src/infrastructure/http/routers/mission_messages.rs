use std::sync::Arc;

use axum::{
    Extension, Json, Router,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};

use crate::{
    application::use_cases::mission_messages::MissionMessageUseCase,
    domain::value_objects::mission_message_model::SendMessageModel,
    infrastructure::{
        database::{
            postgresql_connection::PgPoolSquad,
            repositories::{
                mission_messages::MissionMessagePostgres, mission_viewing::MissionViewingPostgres,
            },
        },
        http::middleware::auth::authorization,
    },
};

pub fn routes(db_pool: Arc<PgPoolSquad>) -> Router {
    let repo = Arc::new(MissionMessagePostgres::new((*db_pool).clone()));
    let use_case = Arc::new(MissionMessageUseCase::new(repo));

    let protected_routes = Router::new()
        .route("/{mission_id}/messages", post(send_message))
        .route_layer(axum::middleware::from_fn(authorization));

    Router::new()
        .route("/{mission_id}/messages", get(get_messages))
        .merge(protected_routes)
        .with_state(use_case)
}

use serde::Deserialize;

#[derive(Deserialize)]
struct GetMessagesParams {
    limit: Option<i64>,
    before_id: Option<i32>,
    after_id: Option<i32>,
}

async fn get_messages(
    State(use_case): State<Arc<MissionMessageUseCase>>,
    Path(mission_id): Path<i32>,
    params: axum::extract::Query<GetMessagesParams>,
) -> impl IntoResponse {
    match use_case
        .get_messages(mission_id, params.limit, params.before_id, params.after_id)
        .await
    {
        Ok(messages) => (StatusCode::OK, Json(messages)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn send_message(
    State(use_case): State<Arc<MissionMessageUseCase>>,
    Extension(user_id): Extension<i32>,
    Path(mission_id): Path<i32>,
    Json(model): Json<SendMessageModel>,
) -> impl IntoResponse {
    match use_case.send_message(mission_id, user_id, model).await {
        Ok(msg_id) => (
            StatusCode::CREATED,
            Json(serde_json::json!({ "id": msg_id })),
        )
            .into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
