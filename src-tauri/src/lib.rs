mod commands;
// pub：供 src/bin/logic-check.rs 在无 test harness 的情况下验证纯函数逻辑
// （GNU 工具链下 lib test 二进制链接 tauri 会 0xc0000139，见开发日志）
pub mod filesystem;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::pick_workspace,
            commands::scan_workspace,
            commands::read_note,
            commands::write_note,
            commands::create_note,
            commands::rename_note,
            commands::delete_note,
            commands::create_course,
            commands::update_course,
            commands::delete_course,
            commands::load_recent,
            commands::save_recent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
