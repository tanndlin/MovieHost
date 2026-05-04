use std::sync::{Arc, Mutex};

use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;

use crate::{
    AppState,
    ws::types::{ControlMessage, WsClientMessage, WsServerMessage},
};

pub async fn handle_ws(socket: WebSocket, state: Arc<Mutex<AppState>>) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();

    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    let mut authed_user_id: Option<u64> = None;

    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Close(_) => break,
            Message::Text(text) => match serde_json::from_str::<WsClientMessage>(&text) {
                Ok(client_msg) => match client_msg {
                    WsClientMessage::Handshake { userId } => {
                        authed_user_id = Some(userId);
                        state
                            .lock()
                            .unwrap()
                            .websockets
                            .entry(userId)
                            .or_default()
                            .push(tx.clone());
                        println!("User {} connected", userId);
                    }
                    WsClientMessage::Control(control_message) => {
                        handle_control_message(control_message, &state).await;
                    }
                },
                Err(e) => eprintln!("Failed to parse: {}", e),
            },
            _ => {}
        }
    }

    if let Some(user_id) = authed_user_id {
        state.lock().unwrap().websockets.remove(&user_id);
        println!("User {} disconnected", user_id);
    }
}

async fn handle_control_message(control_message: ControlMessage, state: &Arc<Mutex<AppState>>) {
    let user_id = control_message.user_id;
    // Wrap the control message in a server message and serialize it
    let server_msg = WsServerMessage::Control(control_message);
    let message = Message::Text(serde_json::to_string(&server_msg).unwrap().into());

    let mut state = state.lock().unwrap();
    if let Some(senders) = state.websockets.get_mut(&user_id) {
        senders.retain(|tx| tx.send(message.clone()).is_ok());
    }
}
