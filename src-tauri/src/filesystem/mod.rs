// 工作区文件操作（阶段三：本地文件系统）
// 所有路径操作必须限制在用户授权的工作区内，防止目录穿越。

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::Manager;

/// 课程元数据（对应规范 §7.1；courses.json 中的字段为 camelCase）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CourseMeta {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub color: String,
    pub teacher: Option<String>,
    pub location: Option<String>,
    pub schedule: Option<String>,
    pub semester: Option<String>,
    pub exam_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 笔记索引条目（内容保存在 .md 文件中，扫描时只提取元信息）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteEntry {
    /// 与 relative_path 相同的稳定 id
    pub id: String,
    pub course_slug: String,
    pub title: String,
    pub file_name: String,
    pub relative_path: String,
    /// 文件开头内容，前端用于生成摘要
    pub head: String,
    pub word_count: usize,
    pub created_at: String,
    pub updated_at: String,
    pub pinned: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub courses: Vec<CourseMeta>,
    pub notes: Vec<NoteEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteReadResult {
    pub content: String,
    /// 读取时内容 hash，写入时带回做冲突检测
    pub hash: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteNoteResult {
    /// "ok" = 写入成功；"conflict" = 磁盘内容已被外部修改
    pub status: String,
    pub hash: u32,
}

/// 推断课程的默认颜色（与阶段一 mock 一致，按索引轮换）
const COURSE_COLORS: [&str; 4] = ["#6d7cf6", "#7fb069", "#5aa9a6", "#d9a05b"];

/// 将工作区内相对路径解析为绝对路径，并校验不超出工作区（防目录穿越）。
/// 目标文件本身允许不存在（写入场景），但父目录必须在工作区内。
fn resolve_in_workspace(workspace: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let rel = Path::new(relative_path);
    if rel.is_absolute() {
        return Err("路径必须是工作区内的相对路径".into());
    }
    // 显式拒绝 . 之外的分隔组件（.. 与盘符前缀）
    for comp in rel.components() {
        match comp {
            Component::ParentDir => return Err("路径包含 .. 组件".into()),
            Component::Prefix(_) | Component::RootDir => {
                return Err("路径包含盘符或根目录".into())
            }
            _ => {}
        }
    }
    let ws_canonical = workspace
        .canonicalize()
        .map_err(|e| format!("无法访问工作区：{e}"))?;
    let joined = workspace.join(relative_path);
    let parent = joined.parent().ok_or("无效的路径")?;
    let parent_canonical = parent
        .canonicalize()
        .map_err(|e| format!("路径不存在：{e}"))?;
    if !parent_canonical.starts_with(&ws_canonical) {
        return Err("路径超出工作区范围".into());
    }
    Ok(workspace.join(relative_path))
}

/// 清理文件名：替换 Windows/常见非法字符，去除首尾空白与点号。
pub fn sanitize_filename(title: &str) -> String {
    let cleaned: String = title
        .chars()
        .map(|ch| {
            if matches!(
                ch,
                '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\n' | '\r' | '\t'
            ) {
                '-'
            } else {
                ch
            }
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').to_string();
    if trimmed.is_empty() {
        "untitled".to_string()
    } else {
        trimmed
    }
}

/// slug 转显示名："operating-system" → "Operating System"
pub fn slug_to_display_name(slug: &str) -> String {
    slug.split(['-', '_'])
        .filter(|part| !part.is_empty())
        .map(|part| {
            let mut chars = part.chars();
            let head: String = chars
                .next()
                .map(|c| c.to_uppercase().collect())
                .unwrap_or_default();
            let tail: String = chars.collect();
            head + &tail
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// FNV-1a 内容哈希（u32，JS Number 可精确表示；仅需进程内确定性用于冲突检测）
pub fn hash_content(s: &str) -> u32 {
    let mut hash: u32 = 0x811c_9dc5;
    for byte in s.as_bytes() {
        hash ^= *byte as u32;
        hash = hash.wrapping_mul(0x0100_0193);
    }
    hash
}

fn iso_ts(t: std::time::SystemTime) -> String {
    let dt: chrono::DateTime<chrono::Utc> = t.into();
    dt.to_rfc3339()
}

/// 文件时间戳（创建/修改）转为 ISO 字符串
fn fs_timestamps(path: &Path) -> (String, String) {
    let meta = fs::metadata(path).ok();
    let created = meta
        .as_ref()
        .and_then(|m| m.created().ok())
        .map(iso_ts)
        .unwrap_or_default();
    let modified = meta
        .and_then(|m| m.modified().ok())
        .map(iso_ts)
        .unwrap_or_default();
    (created, modified)
}

/// 从内容提取标题：首个 `# ` 一级标题行
fn title_from_content(content: &str) -> Option<String> {
    content.lines().find_map(|line| {
        let trimmed = line.trim_start();
        trimmed
            .strip_prefix("# ")
            .map(|title| title.trim().to_string())
            .filter(|t| !t.is_empty())
    })
}

/// 文件名回退标题："process-and-thread.md" → "Process And Thread"
fn stem_title(file_name: &str) -> String {
    let stem = file_name.trim_end_matches(".md");
    slug_to_display_name(stem)
}

fn note_entry(course_slug: &str, file: &Path) -> Result<NoteEntry, String> {
    let file_name = file
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    let content = fs::read_to_string(file)
        .map_err(|e| format!("读取 {} 失败：{e}", file.display()))?;
    let (created_at, updated_at) = fs_timestamps(file);
    let title = title_from_content(&content).unwrap_or_else(|| stem_title(&file_name));
    let relative_path = format!("notes/{course_slug}/{file_name}");
    Ok(NoteEntry {
        id: relative_path.clone(),
        course_slug: course_slug.to_string(),
        title,
        file_name,
        relative_path,
        // 摘要用开头 200 字符，避免大文件全量读入前端
        head: content.chars().take(200).collect(),
        word_count: content.chars().filter(|c| !c.is_whitespace()).count(),
        created_at,
        updated_at,
        pinned: false,
    })
}

/// 读取 courses.json；不存在时返回空列表（目录推断兜底）
fn load_courses(workspace: &Path) -> Result<Vec<CourseMeta>, String> {
    let path = workspace.join("courses.json");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let text = fs::read_to_string(&path).map_err(|e| format!("读取 courses.json 失败：{e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("courses.json 解析失败：{e}"))
}

/// courses.json 中不存在该 slug 时，按目录推断课程
fn infer_course(slug: &str, index: usize) -> CourseMeta {
    let now = iso_ts(std::time::SystemTime::now());
    CourseMeta {
        id: slug.to_string(),
        name: slug_to_display_name(slug),
        slug: slug.to_string(),
        color: COURSE_COLORS[index % COURSE_COLORS.len()].to_string(),
        teacher: None,
        location: None,
        schedule: None,
        semester: None,
        exam_date: None,
        created_at: now.clone(),
        updated_at: now,
    }
}

/// 初始化工作区：确保 notes/ 与 courses.json 存在，然后扫描。
/// courses.json 本阶段不写入（阶段四课程管理才写入），只补空文件。
pub fn init_workspace(workspace: &str) -> Result<ScanResult, String> {
    let ws = Path::new(workspace);
    if !ws.is_dir() {
        return Err(format!("所选文件夹不存在：{workspace}"));
    }
    let notes_dir = ws.join("notes");
    fs::create_dir_all(&notes_dir).map_err(|e| format!("无法创建工作区目录：{e}"))?;
    let courses_path = ws.join("courses.json");
    if !courses_path.exists() {
        fs::write(&courses_path, "[]").map_err(|e| format!("无法创建 courses.json：{e}"))?;
    }
    scan_workspace(workspace)
}

/// 扫描工作区：notes/ 下的一级子目录视为课程目录，目录内 .md 文件视为笔记。
pub fn scan_workspace(workspace: &str) -> Result<ScanResult, String> {
    let ws = Path::new(workspace);
    if !ws.is_dir() {
        return Err(format!("工作区路径不存在：{workspace}"));
    }
    let notes_dir = ws.join("notes");
    if !notes_dir.is_dir() {
        return Ok(ScanResult {
            courses: Vec::new(),
            notes: Vec::new(),
        });
    }

    let registered = load_courses(ws)?;
    let mut courses: Vec<CourseMeta> = Vec::new();
    let mut notes: Vec<NoteEntry> = Vec::new();

    // 课程目录按名称排序，保证推断颜色的顺序稳定
    let mut dirs: Vec<(String, PathBuf)> = fs::read_dir(&notes_dir)
        .map_err(|e| format!("无法读取工作区：{e}"))?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            if entry.file_type().ok()?.is_dir() {
                Some((entry.file_name().to_string_lossy().to_string(), entry.path()))
            } else {
                None
            }
        })
        .collect();
    dirs.sort_by(|a, b| a.0.cmp(&b.0));

    for (index, (slug, dir)) in dirs.iter().enumerate() {
        let course = registered
            .iter()
            .find(|c| c.slug == *slug)
            .cloned()
            .unwrap_or_else(|| infer_course(slug, index));
        courses.push(course);

        let mut files: Vec<PathBuf> = fs::read_dir(dir)
            .map_err(|e| format!("无法读取课程目录 {slug}：{e}"))?
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let is_md = entry
                    .path()
                    .extension()
                    .is_some_and(|ext| ext == "md");
                if entry.file_type().ok()?.is_file() && is_md {
                    Some(entry.path())
                } else {
                    None
                }
            })
            .collect();
        files.sort();
        for file in files {
            notes.push(note_entry(slug, &file)?);
        }
    }
    Ok(ScanResult { courses, notes })
}

pub fn read_note(workspace: &str, relative_path: &str) -> Result<NoteReadResult, String> {
    let ws = Path::new(workspace);
    let target = resolve_in_workspace(ws, relative_path)?;
    let content =
        fs::read_to_string(&target).map_err(|e| format!("读取笔记失败：{e}"))?;
    Ok(NoteReadResult {
        content: content.clone(),
        hash: hash_content(&content),
    })
}

/// 写入笔记。expected_hash 与当前磁盘内容不匹配时返回 conflict（文件被外部修改）。
/// 原子写：先写临时文件再替换，避免写一半损坏原文件。
pub fn write_note(
    workspace: &str,
    relative_path: &str,
    content: &str,
    expected_hash: Option<u32>,
) -> Result<WriteNoteResult, String> {
    let ws = Path::new(workspace);
    let target = resolve_in_workspace(ws, relative_path)?;

    // 冲突检测：调用方持有读取时的 hash，与当前磁盘内容比对
    if let Some(expected) = expected_hash {
        if target.exists() {
            let current = fs::read_to_string(&target).unwrap_or_default();
            if hash_content(&current) != expected {
                return Ok(WriteNoteResult {
                    status: "conflict".into(),
                    hash: hash_content(&current),
                });
            }
        }
    }

    // Windows 下 fs::rename 不能覆盖已存在的目标，需先移除再替换
    let tmp = target.with_extension("md.tmp");
    fs::write(&tmp, content).map_err(|e| format!("写入笔记失败：{e}"))?;
    if target.exists() {
        fs::remove_file(&target).map_err(|e| format!("替换笔记失败：{e}"))?;
    }
    fs::rename(&tmp, &target).map_err(|e| format!("替换笔记失败：{e}"))?;
    Ok(WriteNoteResult {
        status: "ok".into(),
        hash: hash_content(content),
    })
}

/// 新建笔记：在课程目录下创建 <清理后的标题>.md，内容为空白笔记模板。
pub fn create_note(
    workspace: &str,
    course_slug: &str,
    title: &str,
) -> Result<NoteEntry, String> {
    if course_slug.is_empty()
        || course_slug.contains(['/', '\\'])
        || course_slug == "."
        || course_slug == ".."
    {
        return Err("无效的课程目录名".into());
    }
    let ws = Path::new(workspace);
    let dir = ws.join("notes").join(course_slug);
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建课程目录：{e}"))?;

    let file_name = format!("{}.md", sanitize_filename(title));
    let target = dir.join(&file_name);
    if target.exists() {
        return Err(format!("同名笔记已存在：{}", sanitize_filename(title)));
    }
    fs::write(&target, format!("# {title}\n")).map_err(|e| format!("新建笔记失败：{e}"))?;
    note_entry(course_slug, &target)
}

/// 重命名笔记：修改文件名，并同步替换内容中的首个一级标题。
pub fn rename_note(
    workspace: &str,
    relative_path: &str,
    new_title: &str,
) -> Result<NoteEntry, String> {
    let ws = Path::new(workspace);
    let target = resolve_in_workspace(ws, relative_path)?;
    if !target.is_file() {
        return Err("笔记文件不存在".into());
    }
    let dir = target.parent().ok_or("无效的路径")?;
    let new_name = format!("{}.md", sanitize_filename(new_title));
    let new_target = dir.join(&new_name);
    if new_target.exists() && new_target != target {
        return Err(format!("同名笔记已存在：{}", sanitize_filename(new_title)));
    }

    // 同步更新内容中的一级标题，使列表标题与文件保持一致
    let content = fs::read_to_string(&target).unwrap_or_default();
    let updated = replace_first_heading(&content, new_title);

    fs::rename(&target, &new_target).map_err(|e| format!("重命名失败：{e}"))?;
    if updated != content {
        fs::write(&new_target, updated).map_err(|e| format!("重命名失败：{e}"))?;
    }
    let course_slug = dir
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("无效的课程目录")?;
    note_entry(course_slug, &new_target)
}

/// 替换内容中的首个 `# ` 标题；没有标题时在开头插入
pub fn replace_first_heading(content: &str, new_title: &str) -> String {
    let mut replaced = false;
    let lines: Vec<String> = content
        .lines()
        .map(|line| {
            if !replaced && line.trim_start().starts_with("# ") {
                replaced = true;
                format!("# {new_title}")
            } else {
                line.to_string()
            }
        })
        .collect();
    if replaced {
        lines.join("\n")
    } else {
        format!("# {new_title}\n\n{content}")
    }
}

pub fn delete_note(workspace: &str, relative_path: &str) -> Result<(), String> {
    let ws = Path::new(workspace);
    let target = resolve_in_workspace(ws, relative_path)?;
    if !target.is_file() {
        return Err("笔记文件不存在".into());
    }
    fs::remove_file(&target).map_err(|e| format!("删除笔记失败：{e}"))
}

// ---------- 最近打开记录（应用配置目录） ----------

fn recent_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法定位应用配置目录：{e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建配置目录：{e}"))?;
    Ok(dir.join("recent.json"))
}

pub fn load_recent(app: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let path = recent_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let text = fs::read_to_string(&path).map_err(|e| format!("读取最近记录失败：{e}"))?;
    let paths: Vec<String> = serde_json::from_str(&text).unwrap_or_default();
    // 过滤已不存在的目录
    Ok(paths.into_iter().filter(|p| Path::new(p).is_dir()).collect())
}

pub fn save_recent(app: &tauri::AppHandle, path: &str) -> Result<(), String> {
    let mut paths = load_recent(app)?;
    paths.retain(|p| p != path);
    paths.insert(0, path.to_string());
    paths.truncate(10);
    let path_file = recent_path(app)?;
    let json = serde_json::to_string(&paths).map_err(|e| format!("序列化最近记录失败：{e}"))?;
    fs::write(&path_file, json).map_err(|e| format!("保存最近记录失败：{e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_replaces_illegal_chars() {
        assert_eq!(
            sanitize_filename(r#"a/b\c:d*e?f"g<h>i|j"#),
            "a-b-c-d-e-f-g-h-i-j"
        );
    }

    #[test]
    fn sanitize_trims_and_falls_back() {
        assert_eq!(sanitize_filename("  笔记  "), "笔记");
        assert_eq!(sanitize_filename("..."), "untitled");
        assert_eq!(sanitize_filename(""), "untitled");
        assert_eq!(sanitize_filename("a\nb"), "a-b");
    }

    #[test]
    fn slug_display_name() {
        assert_eq!(slug_to_display_name("operating-system"), "Operating System");
        assert_eq!(slug_to_display_name("i2c"), "I2c");
        assert_eq!(slug_to_display_name("数据结构"), "数据结构");
        assert_eq!(slug_to_display_name(""), "");
    }

    #[test]
    fn hash_is_deterministic() {
        assert_eq!(hash_content("hello"), hash_content("hello"));
        assert_ne!(hash_content("hello"), hash_content("hellp"));
    }

    #[test]
    fn resolve_rejects_path_escape() {
        let tmp = std::env::temp_dir().join(format!("lynnnote-test-{}", std::process::id()));
        fs::create_dir_all(tmp.join("notes/os")).unwrap();
        let ws = tmp.canonicalize().unwrap();

        // 绝对路径、父目录跳转、盘符前缀一律拒绝
        assert!(resolve_in_workspace(&ws, "C:/Windows/win.ini").is_err());
        assert!(resolve_in_workspace(&ws, "../secret.txt").is_err());
        assert!(resolve_in_workspace(&ws, "notes/../..").is_err());
        // 工作区内路径（文件可不存在）应通过
        assert!(resolve_in_workspace(&ws, "notes/os/a.md").is_ok());

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn replace_heading_behavior() {
        assert_eq!(
            replace_first_heading("# 旧标题\n\n正文", "新标题"),
            "# 新标题\n\n正文"
        );
        assert_eq!(
            replace_first_heading("正文开头\n## 二级标题", "新标题"),
            "# 新标题\n\n正文开头\n## 二级标题"
        );
    }
}
