use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsClientMessage {
    Control(ControlMessage),
    Handshake(HandshakeMessage),
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsServerMessage {
    Control(ControlMessage),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ControlMessage {
    #[serde(rename = "userId")]
    pub user_id: u64,
    pub action: ControlAction,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ControlAction {
    Play,
    Pause,
    Seek { seek: f64 },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HandshakeMessage {
    #[serde(rename = "userId")]
    pub user_id: u64,
}
