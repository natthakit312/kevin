use crate::{
    config::{config_loader::get_cloundinary_env, config_model::CloudinaryEnv},
    domain::value_objects::{base64_img::Base64Img, uploaded_img::UploadedImg},
};

use anyhow::{Context, Ok, Result};
use chrono::Utc;
use reqwest::multipart::{Form, Part};

use sha1::{Digest, Sha1};
use std::collections::HashMap;

pub struct UploadImageOptions {
    pub folder: Option<String>,
    pub public_id: Option<String>,
    pub transformation: Option<String>,
}

fn form_builder(option: UploadImageOptions, cloud_env: &CloudinaryEnv) -> Result<Form> {
    let mut form = Form::new();
    let timestamp = Utc::now().timestamp_millis().to_string();
    let mut hasher = Sha1::new();

    let mut params_to_sign: HashMap<String, String> = HashMap::new();
    params_to_sign.insert("resource_type".to_string(), "image".to_string());
    params_to_sign.insert("timestamp".to_string(), timestamp.clone());
    if let Some(folder_name) = option.folder {
        params_to_sign.insert("folder".to_string(), folder_name);
    }
    if let Some(public_id) = option.public_id {
        params_to_sign.insert("public_id".to_string(), public_id);
    }
    if let Some(transformation) = option.transformation {
        params_to_sign.insert("transformation".to_string(), transformation);
    }

    let mut sign_params: Vec<String> = Vec::new();
    let mut sorted_keys: Vec<_> = params_to_sign.keys().collect();
    sorted_keys.sort();

    for key in sorted_keys {
        if key != "resource_type" {
            if let Some(value) = params_to_sign.get(key) {
                sign_params.push(format!("{}={}", key, value));
            }
        }
        // Always add to form
        if let Some(value) = params_to_sign.get(key) {
            form = form.text(key.clone(), value.clone());
        }
    }

    let sign_string = sign_params.join("&");
    hasher.update(sign_string);
    hasher.update(cloud_env.api_secret.clone());

    form = form.text("signature", format!("{:x}", hasher.finalize()));
    form = form.text("api_key", cloud_env.api_key.clone());
    form = form.text("timestamp", timestamp.clone());

    Ok(form)
}

pub async fn upload(base64_image: Base64Img, option: UploadImageOptions) -> Result<UploadedImg> {
    let cloud_env = get_cloundinary_env()?;

    let file = Part::text(base64_image.into_inner());
    let form = form_builder(option, &cloud_env)?;
    let multipart = form.part("file", file);
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.cloudinary.com/v1_1/{}/image/upload",
        cloud_env.cloud_name
    );

    let response = client
        .post(&url)
        .multipart(multipart)
        .send()
        .await
        .context(format!("upload to {}", url))?;

    let text = response.text().await?;
    let json: UploadedImg =
        serde_json::from_str(&text).context(format!("failed to parse:\n\n {}", text))?;
    Ok(json)
}
