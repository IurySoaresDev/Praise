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
    title_font: Option<String>,
    title_size: Option<f64>,
    title_weight: Option<String>,
    lyrics_font: Option<String>,
    lyrics_size: Option<f64>,
    lyrics_weight: Option<String>,
    projection_mode: Option<String>,
}

struct CurrentSlideState(Mutex<Option<ProjectionPayload>>);
struct CurrentMonitorState(Mutex<String>);

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
    title_font: Option<String>,
    title_size: Option<f64>,
    title_weight: Option<String>,
    lyrics_font: Option<String>,
    lyrics_size: Option<f64>,
    lyrics_weight: Option<String>,
    projection_mode: Option<String>,
) -> Result<(), String> {
    let payload = ProjectionPayload { 
        title: title.clone(),
        content: content.clone(),
        background: background.clone(),
        item_type: item_type.clone(),
        title_color,
        lyrics_color,
        title_font,
        title_size,
        title_weight,
        lyrics_font,
        lyrics_size,
        lyrics_weight,
        projection_mode,
    };

    // Save payload to state
    let state: State<'_, CurrentSlideState> = app_handle.state();
    if let Ok(mut current_slide) = state.0.lock() {
        *current_slide = Some(payload.clone());
    }

    // Busca a janela de projeção se ela já existir
    let projection_window = app_handle.get_webview_window("projection");

    // Verifica se o monitor mudou - se sim, fecha a janela para recriar no monitor correto
    let monitor_state: State<'_, CurrentMonitorState> = app_handle.state();
    let monitor_changed = {
        let current = monitor_state.0.lock().unwrap();
        *current != monitor && !current.is_empty()
    };

    // Se o monitor mudou e a janela existe, fecha ela para recriar no monitor certo
    if monitor_changed {
        if let Some(window) = &projection_window {
            println!("Monitor mudou, fechando janela de projeção para recriar...");
            let _ = window.close();
            // Pequeno delay para garantir que a janela foi fechada
            std::thread::sleep(std::time::Duration::from_millis(200));
        }
    }

    // Verifica novamente se a janela existe (pode ter sido fechada acima)
    let projection_window = app_handle.get_webview_window("projection");

    if let Some(window) = projection_window {
        // Janela existe no mesmo monitor, apenas atualiza o conteúdo
        window.emit("update_projection", payload)
        .map_err(|e| {
            println!("Erro ao emitir evento: {}", e);
            e.to_string()
        })?;
            
    } else if !content.is_empty() {
        // Cria nova janela de projeção no monitor selecionado
        let mut builder = WebviewWindowBuilder::new(
            &app_handle,
            "projection",
            WebviewUrl::App("index.html#/projection".into())
        )
        .title("Praise Projection")
        .always_on_top(true)
        .transparent(true)
        .decorations(false);

        // Tenta achar o monitor escolhido pelo nome
        let mut found_monitor = false;
        if let Ok(monitors) = app_handle.available_monitors() {
            for m in monitors {
                let name = m.name().map(|n| n.to_string()).unwrap_or_default();
                println!("Monitor disponível: '{}', selecionado: '{}'", name, monitor);
                if name == monitor {
                    let position = m.position();
                    let size = m.size();
                    println!("Projetando no monitor '{}' em ({}, {}), tamanho {}x{}", name, position.x, position.y, size.width, size.height);
                    builder = builder
                        .position(position.x.into(), position.y.into())
                        .inner_size(size.width as f64, size.height as f64);
                    found_monitor = true;
                    break;
                }
            }
        }

        if !found_monitor {
            println!("AVISO: Monitor '{}' não encontrado! Usando monitor padrão.", monitor);
        }

        let window = builder.build().map_err(|e| e.to_string())?;
        
        // Ativa fullscreen após a janela ser criada na posição correta
        let _ = window.set_fullscreen(true);

        // Salva qual monitor está sendo usado
        {
            let mut current = monitor_state.0.lock().unwrap();
            *current = monitor.clone();
        }
        
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
            println!("Icon bytes length: {}", icon_bytes.len());
            match image::load_from_memory(icon_bytes) {
                Ok(icon) => {
                    let (width, height) = icon.dimensions();
                    println!("Icon loaded: {}x{}", width, height);
                    let rgba = icon.to_rgba8().into_raw();
                    let tauri_icon = tauri::image::Image::new_owned(rgba, width, height);
                    // Define o ícone default do app
                    if let Err(e) = app.default_window_icon().map(|_| ()).ok_or("no default icon") {
                        println!("Default icon info: {}", e);
                    }
                    // Define o ícone para a janela principal
                    if let Some(window) = app.get_webview_window("main") {
                        match window.set_icon(tauri_icon) {
                            Ok(_) => println!("Icon set successfully on main window"),
                            Err(e) => println!("Failed to set icon: {}", e),
                        }
                    } else {
                        println!("Main window not found!");
                    }
                },
                Err(e) => println!("Failed to load icon from memory: {}", e),
            }
            Ok(())
        })
        .manage(CurrentSlideState(Mutex::new(None)))
        .manage(CurrentMonitorState(Mutex::new(String::new())))
        .invoke_handler(tauri::generate_handler![get_monitors, project_slide, save_songs, close_projection, get_current_slide])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
