use std::sync::{Arc, Mutex};

use axum::{extract::ws::WebSocket, http::StatusCode, response::IntoResponse};

use crate::AppState;

pub async fn handle_ws(socket: WebSocket, state: Arc<Mutex<AppState>>) -> impl IntoResponse {
    let mut socket = socket;
    // Handle the WebSocket connection here
    // You can read and write messages using the `socket` object
    // For example, you can read messages in a loop:
    while let Some(Ok(msg)) = socket.recv().await {
        // Process the received message
        println!("Received message: {:?}", msg);

        // You can also send messages back to the client
        if let Err(e) = socket.send(msg).await {
            eprintln!("Error sending message: {:?}", e);
            break;
        }
    }

    StatusCode::OK
}
