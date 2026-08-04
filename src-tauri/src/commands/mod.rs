// Tauri invoke 命令声明（阶段三：本地文件系统）
// 前端参数统一 camelCase（如 relativePath），Tauri 自动映射到 snake_case。

use crate::filesystem;
use serde::Serialize;
use tauri::AppHandle;

/// 选中并初始化工作区后的完整结果（含路径，前端后续读写依赖它）
#[derive(Serialize)]
pub struct WorkspaceOpened {
    pub path: String,
    pub scan: filesystem::ScanResult,
}

/// 弹出文件夹选择对话框并初始化所选工作区；用户取消时返回 Ok(None)
#[tauri::command]
pub async fn pick_workspace(app: AppHandle) -> Result<Option<WorkspaceOpened>, String> {
    let folder = rfd::AsyncFileDialog::new()
        .set_title("选择 LynnNote 工作区文件夹")
        .pick_folder()
        .await;
    let Some(folder) = folder else {
        return Ok(None);
    };
    let path = folder.path().to_string_lossy().to_string();
    let scan = filesystem::init_workspace(&path)?;
    // 选中即记入最近打开，重启后自动恢复
    filesystem::save_recent(&app, &path)?;
    Ok(Some(WorkspaceOpened { path, scan }))
}

/// 扫描指定工作区（启动恢复 / 切换工作区时调用）
#[tauri::command]
pub fn scan_workspace(path: String) -> Result<filesystem::ScanResult, String> {
    filesystem::scan_workspace(&path)
}

#[tauri::command]
pub fn read_note(
    workspace: String,
    relative_path: String,
) -> Result<filesystem::NoteReadResult, String> {
    filesystem::read_note(&workspace, &relative_path)
}

#[tauri::command]
pub fn write_note(
    workspace: String,
    relative_path: String,
    content: String,
    expected_hash: Option<u32>,
) -> Result<filesystem::WriteNoteResult, String> {
    filesystem::write_note(&workspace, &relative_path, &content, expected_hash)
}

#[tauri::command]
pub fn create_note(
    workspace: String,
    course_slug: String,
    title: String,
    content: Option<String>,
) -> Result<filesystem::NoteEntry, String> {
    filesystem::create_note(&workspace, &course_slug, &title, content.as_deref())
}

#[tauri::command]
pub fn rename_note(
    workspace: String,
    relative_path: String,
    new_title: String,
) -> Result<filesystem::NoteEntry, String> {
    filesystem::rename_note(&workspace, &relative_path, &new_title)
}

#[tauri::command]
pub fn delete_note(workspace: String, relative_path: String) -> Result<(), String> {
    filesystem::delete_note(&workspace, &relative_path)
}

#[tauri::command]
pub fn create_course(workspace: String, name: String) -> Result<filesystem::CourseMeta, String> {
    filesystem::create_course(&workspace, &name)
}

/// 更新课程元数据；None = 不修改（前端 patch 中省略的字段传 None）
#[tauri::command]
pub fn update_course(
    workspace: String,
    id: String,
    name: Option<String>,
    color: Option<String>,
    teacher: Option<String>,
    location: Option<String>,
    schedule: Option<String>,
    semester: Option<String>,
    exam_date: Option<String>,
) -> Result<filesystem::CourseMeta, String> {
    filesystem::update_course(
        &workspace, &id, name, color, teacher, location, schedule, semester, exam_date,
    )
}

#[tauri::command]
pub fn delete_course(workspace: String, id: String) -> Result<(), String> {
    filesystem::delete_course(&workspace, &id)
}

#[tauri::command]
pub fn list_templates(workspace: String) -> Result<Vec<filesystem::NoteTemplate>, String> {
    filesystem::list_templates(&workspace)
}

#[tauri::command]
pub fn save_template(
    workspace: String,
    template: filesystem::NoteTemplate,
) -> Result<filesystem::NoteTemplate, String> {
    filesystem::save_template(&workspace, template)
}

#[tauri::command]
pub fn delete_template(workspace: String, id: String) -> Result<(), String> {
    filesystem::delete_template(&workspace, &id)
}

#[tauri::command]
pub fn load_recent(app: AppHandle) -> Result<Vec<String>, String> {
    filesystem::load_recent(&app)
}

#[tauri::command]
pub fn save_recent(app: AppHandle, path: String) -> Result<(), String> {
    filesystem::save_recent(&app, &path)
}
