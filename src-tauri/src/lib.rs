mod commands;
mod filesystem;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // 阶段三起逐步加入文件系统命令
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
