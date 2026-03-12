use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use image::GenericImageView;
use tauri::{Manager, Emitter, WebviewWindowBuilder, WebviewUrl, State};

#[derive(Clone, Serialize, Deserialize)]
struct ProjectionPayload {
    title: String,
    content: String,
    background: Option<String>,
    item_type: String, // "song" | "bible" | "empty"
    title_color: Option<String>,
    lyrics_color: Option<String>,
}

struct CurrentSlideState(Mutex<Option<ProjectionPayload>>);

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
    title: String,
    content: String, 
    background: Option<String>,
    item_type: String,
    title_color: Option<String>,
    lyrics_color: Option<String>,
) -> Result<(), String> {
    let payload = ProjectionPayload { 
        title: title.clone(),
        content: content.clone(),
        background: background.clone(),
        item_type: item_type.clone(),
        title_color: title_color,
        lyrics_color: lyrics_color,
    };

    // Save payload to state
    let state: State<'_, CurrentSlideState> = app_handle.state();
    if let Ok(mut current_slide) = state.0.lock() {
        *current_slide = Some(payload.clone());
    }

    // Busca a janela de projeção se ela já existir
    let projection_window = app_handle.get_webview_window("projection");

    if let Some(window) = projection_window {
        // Se a janela já existe, apenas emite o evento para atualizar o conteúdo
        window.emit("update_projection", payload)
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
        
        // We still keep the slight delay just in case, but now the window can also actively check the state via get_current_slide when it mounts.
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(500));
            let _ = window.emit("update_projection", payload);
        });
    }

    Ok(())
}

#[tauri::command]
fn get_current_slide(state: State<'_, CurrentSlideState>) -> Result<Option<ProjectionPayload>, String> {
    if let Ok(current_slide) = state.0.lock() {
        Ok(current_slide.clone())
    } else {
        Err("Failed to lock state".into())
    }
}

#[tauri::command]
fn close_projection(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("projection") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn save_songs(_app_handle: tauri::AppHandle, data: serde_json::Value) -> Result<(), String> {
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    
    let file_path = if current_dir.ends_with("src-tauri") {
        current_dir.join("..").join("src").join("assets").join("data.json")
    } else {
        current_dir.join("src").join("assets").join("data.json")
    };
    
    let json_string = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    
    std::fs::write(&file_path, json_string).map_err(|e| {
        format!("Failed to write to file {:?}: {}", file_path, e)
    })?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // No Linux, definir o ícone programaticamente resolve o problema do ícone de 'engrenagem'
            let icon_bytes = include_bytes!("../../src/assets/logo.png");
            if let Ok(icon) = image::load_from_memory(icon_bytes) {
                let (width, height) = icon.dimensions();
                let rgba = icon.to_rgba8().into_raw();
                let tauri_icon = tauri::image::Image::new_owned(rgba, width, height);
                // Define o ícone para a janela principal
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(tauri_icon);
                }
            }
            Ok(())
        })
        .manage(CurrentSlideState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![get_monitors, project_slide, save_songs, close_projection, get_current_slide])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
