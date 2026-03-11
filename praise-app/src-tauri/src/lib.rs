use serde::{Deserialize, Serialize};
use tauri::{Manager, Emitter, Listener, WebviewWindowBuilder, WebviewUrl};

#[derive(Clone, Serialize, Deserialize)]
struct ProjectionPayload {
    content: String,
    background: Option<String>,
    item_type: String, // "song" | "bible" | "empty"
}

#[tauri::command]
fn get_monitors(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let monitors = app_handle.available_monitors().map_err(|e| e.to_string())?;
    let mut monitor_names = Vec::new();
    
    for (i, monitor) in monitors.iter().enumerate() {
        let name = monitor.name().map(|n| n.to_string()).unwrap_or_else(|| format!("Monitor {}", i + 1));
        monitor_names.push(name);
    }
    
    Ok(monitor_names)
}

#[tauri::command]
fn project_slide(
    app_handle: tauri::AppHandle, 
    monitor: String, 
    content: String, 
    background: Option<String>,
    item_type: String
) -> Result<(), String> {
    // Busca a janela de projeção se ela já existir
    let projection_window = app_handle.get_webview_window("projection");

    if let Some(window) = projection_window {
        // Se a janela já existe, apenas emite o evento para atualizar o conteúdo
        window.emit("update_projection", ProjectionPayload { 
            content: content.clone(),
            background: background.clone(),
            item_type: item_type.clone(),
        })
        .map_err(|e| {
            println!("Erro ao emitir evento: {}", e);
            e.to_string()
        })?;
            
    } else if !content.is_empty() {
        // Se a janela não existe e tem conteúdo pra projetar, nós a criamos.
        let mut builder = WebviewWindowBuilder::new(
            &app_handle,
            "projection",
            WebviewUrl::App("index.html#/projection".into())
        )
        .title("Praise Projection")
        .fullscreen(true)
        .always_on_top(true)
        .decorations(false);

        // Tenta achar o monitor escolhido pelo nome
        if let Ok(monitors) = app_handle.available_monitors() {
            for m in monitors {
                let name = m.name().map(|n| n.to_string()).unwrap_or_default();
                if name == monitor {
                    // Move a janela para o monitor específico
                    let position = m.position();
                    builder = builder.position(position.x.into(), position.y.into());
                    break;
                }
            }
        }

        let window = builder.build().map_err(|e| e.to_string())?;
        
        let content_clone = content.clone();
        let background_clone = background.clone();
        let item_type_clone = item_type.clone();
        
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(500));
            let _ = window.emit("update_projection", ProjectionPayload { 
                content: content_clone,
                background: background_clone,
                item_type: item_type_clone,
            });
        });
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_monitors, project_slide])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
