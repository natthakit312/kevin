use crate::{config::config_loader::get_jwt_env, infrastructure};
use axum::{
    body::Body,
    http::{Request, StatusCode, header},
    middleware::Next,
    response::Response,
};

pub async fn authorization(mut req: Request<Body>, next: Next) -> Result<Response, StatusCode> {
    let token = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|auth_header| auth_header.to_str().ok())
        .and_then(|auth_value| auth_value.strip_prefix("Bearer "))
        .map(|token| token.to_string())
        .or_else(|| {
            req.headers()
                .get(header::COOKIE)
                .and_then(|cookie_header| cookie_header.to_str().ok())
                .and_then(|cookie_str| get_cookie_value(cookie_str, "token"))
        })
        .ok_or_else(|| {
            println!("Authorization header missing or invalid");
            StatusCode::UNAUTHORIZED
        })?;

    let jwt_env = get_jwt_env().unwrap();
    let secret = jwt_env.secret;

    let claims = infrastructure::jwt::verify_token(secret, token).map_err(|e| {
        println!("Token verification failed: {:?}", e);
        StatusCode::UNAUTHORIZED
    })?;

    let brawler_id = claims
        .sub
        .parse::<i32>()
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    req.extensions_mut().insert(brawler_id);

    Ok(next.run(req).await)
}

fn get_cookie_value(cookie_header: &str, key: &str) -> Option<String> {
    cookie_header.split("; ").find_map(|cookie| {
        let mut parts = cookie.splitn(2, '=');
        let name = parts.next()?.trim();
        let value = parts.next()?.trim();
        if name == key {
            Some(value.to_string())
        } else {
            None
        }
    })
}
