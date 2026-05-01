pub mod commands;
pub mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                match db::init_db(&handle).await {
                    Ok(pool) => {
                        handle.manage(pool);
                    }
                    Err(e) => {
                        eprintln!("Database initialization or integrity check failed: {}", e);
                        // In the future: show error dialog instead of panicking
                        panic!("DB Init Error: {}", e);
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::generate_sop_id,
            commands::create_sop,
            commands::get_sops,
            commands::get_sop,
            commands::get_revisions,
            commands::save_sop,
            commands::save_revision,
            commands::save_definition,
            commands::save_tool,
            commands::save_item,
            commands::save_step,
            commands::save_step_image,
            commands::save_step_tool,
            commands::save_step_item,
            commands::save_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
