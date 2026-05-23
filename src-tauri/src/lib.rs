use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use image::GenericImageView;
use tauri::{Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

#[derive(Clone, Serialize, Deserialize)]
struct MonitorInfo {
    name: String,
    label: String,
}

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
fn get_monitors(app_handle: tauri::AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app_handle.available_monitors().map_err(|e| e.to_string())?;
    let mut monitor_list = Vec::new();

    for (i, monitor) in monitors.iter().enumerate() {
        let raw_name = monitor.name().map(|n| n.to_string());
        let size = monitor.size();
        let friendly = match &raw_name {
            Some(n) if !n.starts_with("0x") && !n.starts_with("\\\\.\\") => n.clone(),
            _ => format!("Monitor {}", i + 1),
        };
        let name = raw_name.unwrap_or_else(|| format!("monitor-{}", i));
        let label = format!("{} ({}x{})", friendly, size.width, size.height);
        monitor_list.push(MonitorInfo { name, label });
    }

    Ok(monitor_list)
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

        let window = builder.build().map_err(|e: tauri::Error| e.to_string())?;
        
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

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    song_background: String,
    song_body_background: String,
    bible_background: String,
    song_title_color: String,
    song_lyrics_color: String,
    bible_title_color: String,
    bible_lyrics_color: String,
    song_title_font: String,
    song_title_size: f64,
    song_title_weight: String,
    song_lyrics_font: String,
    song_lyrics_size: f64,
    song_lyrics_weight: String,
    bible_title_font: String,
    bible_title_size: f64,
    bible_title_weight: String,
    bible_lyrics_font: String,
    bible_lyrics_size: f64,
    bible_lyrics_weight: String,
    projection_mode: String,
}

fn default_settings() -> AppSettings {
    AppSettings {
        song_background: "/backgrounds/bg-song.jpg".into(),
        song_body_background: "/backgrounds/bg-song-body.jpg".into(),
        bible_background: "/backgrounds/bg-bible.jpg".into(),
        song_title_color: "#ffffff".into(),
        song_lyrics_color: "#ffffff".into(),
        bible_title_color: "#ffffff".into(),
        bible_lyrics_color: "#ffffff".into(),
        song_title_font: "Inter".into(),
        song_title_size: 32.0,
        song_title_weight: "bold".into(),
        song_lyrics_font: "Inter".into(),
        song_lyrics_size: 72.0,
        song_lyrics_weight: "bold".into(),
        bible_title_font: "Inter".into(),
        bible_title_size: 40.0,
        bible_title_weight: "bold".into(),
        bible_lyrics_font: "Inter".into(),
        bible_lyrics_size: 64.0,
        bible_lyrics_weight: "medium".into(),
        projection_mode: "default".into(),
    }
}

fn settings_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("settings.json"))
        .map_err(|e| e.to_string())
}

fn backgrounds_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("backgrounds"))
        .map_err(|e| e.to_string())
}

fn background_file_prefix(kind: &str) -> Result<&'static str, String> {
    match kind {
        "song" => Ok("song."),
        "songBody" => Ok("song-body."),
        "bible" => Ok("bible."),
        _ => Err(format!("Tipo de fundo inválido: {}", kind)),
    }
}

fn resolve_background_path(path: &str, default: &str) -> String {
    if path.starts_with("/backgrounds/") {
        return path.to_string();
    }
    if Path::new(path).exists() {
        return path.to_string();
    }
    default.to_string()
}

fn normalize_source_path(source_path: &str) -> String {
    let path = source_path.trim();
    if let Some(stripped) = path.strip_prefix("file://") {
        return stripped.to_string();
    }
    path.to_string()
}

fn sanitize_background_extension(source: &Path) -> &'static str {
    match source
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase())
        .as_deref()
    {
        Some("jpg") | Some("jpeg") => "jpg",
        Some("png") => "png",
        Some("webp") => "webp",
        _ => "jpg",
    }
}

#[tauri::command]
fn load_settings(app_handle: tauri::AppHandle) -> Result<AppSettings, String> {
    let path = settings_file_path(&app_handle)?;
    if !path.exists() {
        return Ok(default_settings());
    }

    let contents = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut settings: AppSettings =
        serde_json::from_str(&contents).map_err(|e| e.to_string())?;

    settings.song_background =
        resolve_background_path(&settings.song_background, "/backgrounds/bg-song.jpg");
    settings.song_body_background = resolve_background_path(
        &settings.song_body_background,
        "/backgrounds/bg-song-body.jpg",
    );
    settings.bible_background =
        resolve_background_path(&settings.bible_background, "/backgrounds/bg-bible.jpg");

    Ok(settings)
}

#[tauri::command]
fn save_settings(app_handle: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = settings_file_path(&app_handle)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn save_background_image(
    app_handle: tauri::AppHandle,
    kind: String,
    source_path: String,
) -> Result<String, String> {
    let prefix = background_file_prefix(&kind)?;
    let source = normalize_source_path(&source_path);
    let source_path = Path::new(&source);
    if !source_path.exists() {
        return Err(format!("Arquivo de origem não encontrado: {}", source));
    }

    let bg_dir = backgrounds_dir(&app_handle)?;
    std::fs::create_dir_all(&bg_dir).map_err(|e| e.to_string())?;

    let stem = prefix.trim_end_matches('.');
    let ext = sanitize_background_extension(source_path);
    let dest = bg_dir.join(format!("{}.{}", stem, ext));

    // Remove versões anteriores (outra extensão)
    if bg_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&bg_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(stem) {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    }

    std::fs::copy(source_path, &dest)
        .map_err(|e| format!("Falha ao copiar imagem de fundo: {}", e))?;

    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
fn remove_background_image(app_handle: tauri::AppHandle, kind: String) -> Result<(), String> {
    let prefix = background_file_prefix(&kind)?;
    let bg_dir = backgrounds_dir(&app_handle)?;
    if !bg_dir.exists() {
        return Ok(());
    }

    let stem = prefix.trim_end_matches('.');
    for entry in std::fs::read_dir(&bg_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with(stem) {
            std::fs::remove_file(entry.path()).map_err(|e| e.to_string())?;
        }
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
                    // Reduz para 128x128 para evitar que o Window Manager (GNOME/Wayland) recuse a imagem e mostre a engrenagem
                    let resized_icon = icon.resize_exact(128, 128, image::imageops::FilterType::Lanczos3);
                    let (width, height) = resized_icon.dimensions();
                    println!("Icon resized for taskbar: {}x{}", width, height);
                    let rgba = resized_icon.to_rgba8().into_raw();
                    let tauri_icon = tauri::image::Image::new_owned(rgba, width, height);
                    // Define o ícone default do app
                    if let Err(e) = app.default_window_icon().map(|_| ()).ok_or("no default icon") {
                        println!("Default icon info: {}", e);
                    }
                    // Define o ícone para a janela principal
                    if let Some(window) = app.get_webview_window("main") {
                        match window.set_icon(tauri_icon.clone()) {
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
        .invoke_handler(tauri::generate_handler![
            get_monitors,
            project_slide,
            save_songs,
            close_projection,
            get_current_slide,
            load_settings,
            save_settings,
            save_background_image,
            remove_background_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
