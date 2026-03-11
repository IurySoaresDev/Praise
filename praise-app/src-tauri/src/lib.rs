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
        // Verifica se a rota da webview está correta.
        let url = tauri::WebviewUrl::App("/#/projection".into());
        println!("Tentando criar janela de projeção em URL: {:?}", url);
        
        let mut builder = tauri::WebviewWindowBuilder::new(
            &app_handle,
            "projection",
            url
        )
        .title("Praise Projection")
        .fullscreen(true)
        .always_on_top(false) // Desliguei temporariamente pra nao travar o dev caso de erro
        .decorations(false);

        // Tenta achar o monitor escolhido
        if let Ok(monitors) = app_handle.available_monitors() {
            for m in monitors {
                let name = m.name().map(|n| n.to_string()).unwrap_or_default();
                if name == monitor {
                    println!("Monitor selecionado encontrado: {:?}", monitor);
                    let position = m.position();
                    builder = builder.position(position.x.into(), position.y.into());
                    break;
                }
            }
        }

        let window_result = builder.build();
        
        let window = match window_result {
            Ok(w) => w,
            Err(e) => {
                println!("Erro ao criar janela: {:?}", e);
                return Err(e.to_string());
            }
        };
        
        println!("Janela criada com sucesso.");
        let content_clone = content.clone();
        let background_clone = background.clone();
        let item_type_clone = item_type.clone();
        
        std::thread::spawn(move || {
            // Give React time to load the projection route before emitting
            std::thread::sleep(std::time::Duration::from_millis(1500));
            println!("Emitindo update_projection inicial para a nova janela.");
            let _ = window.emit("update_projection", ProjectionPayload { 
                content: content_clone,
                background: background_clone,
                item_type: item_type_clone,
            });
        });
    }

    Ok(())
}

#[tauri::command]
fn save_songs(_app_handle: tauri::AppHandle, data: serde_json::Value) -> Result<(), String> {
    // Resolve the path to the data.json file inside the src/assets directory
    // This allows the app to overwrite the default data file
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    
    // Naive resolution to the src/assets/data.json in development
    // During `tauri dev`, current_dir is usually src-tauri.
    let file_path = if current_dir.ends_with("src-tauri") {
        current_dir.join("..").join("src").join("assets").join("data.json")
    } else {
        current_dir.join("src").join("assets").join("data.json")
    };
    
    // Write the JSON data directly to the file
    let json_string = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    
    std::fs::write(&file_path, json_string).map_err(|e| {
        format!("Failed to write to file {:?}: {}", file_path, e)
    })?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_monitors, project_slide, save_songs])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
