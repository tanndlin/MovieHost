use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(tag = "type")]
pub enum WsClientMessage {
    Control(ControlMessage),
    Handshake(HandshakeMessage),
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(tag = "type")]
pub enum WsServerMessage {
    Control(ControlMessage),
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ControlMessage {
    #[serde(rename = "userId")]
    pub user_id: u64,
    pub action: ControlAction,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(tag = "type")]
pub enum ControlAction {
    Play,
    Pause,
    Seek { seek: f64 },
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct HandshakeMessage {
    #[serde(rename = "userId")]
    pub user_id: u64,
}
