// 纯函数逻辑验证（GNU 工具链下 cargo test 的 lib test harness 无法运行，
// 改用普通 bin 做断言；断言失败 panic + 非零退出码，可在 CI 中替代单元测试）。
// 运行：cargo +stable-x86_64-pc-windows-gnu run --bin logic-check

use lynnnote_lib::filesystem::{
    create_note, delete_template, export_settings, hash_content, list_templates, read_all_notes,
    replace_first_heading, sanitize_filename, save_template, slug_to_display_name, slugify,
    NoteTemplate,
};

fn assert_eq(actual: String, expected: &str, label: &str) {
    if actual != expected {
        panic!("断言失败 [{label}]: 实际 {actual:?} != 期望 {expected:?}");
    }
    println!("  ok  {label}");
}

fn main() {
    println!("== filesystem 纯函数验证 ==");

    // sanitize_filename：非法字符替换
    assert_eq(
        sanitize_filename(r#"a/b\c:d*e?f"g<h>i|j"#),
        "a-b-c-d-e-f-g-h-i-j",
        "非法字符全部替换为 -",
    );
    // 首尾空白与点号清理
    assert_eq(sanitize_filename("  笔记  "), "笔记", "首尾空白清理");
    assert_eq(sanitize_filename("..."), "untitled", "纯点号回退");
    // 空值回退
    assert_eq(sanitize_filename(""), "untitled", "空串回退");
    // 换行清理
    assert_eq(sanitize_filename("a\nb"), "a-b", "换行替换");

    // slug_to_display_name
    assert_eq(
        slug_to_display_name("operating-system"),
        "Operating System",
        "连字符分词 + 首字母大写",
    );
    assert_eq(slug_to_display_name("数据结构"), "数据结构", "中文 slug 原样");
    assert_eq(slug_to_display_name(""), "", "空 slug");

    // slugify：课程名 → 稳定 slug（与前端 fs.ts 规则一致）
    assert_eq(
        slugify("Operating System"),
        "operating-system",
        "英文课程名小写 + 空格转 -",
    );
    assert_eq(slugify("数据结构"), "数据结构", "中文课程名保留");
    assert_eq(slugify("  计算机网络 (上)  "), "计算机网络-上", "标点转 - 并压缩去首尾");
    assert_eq(slugify("C++ 程序设计"), "c-程序设计", "混合大小写与符号");
    assert_eq(slugify("!!!"), "untitled", "纯符号回退");

    // create_note：模板内容写入（临时工作区）
    {
        let tmp = std::env::temp_dir().join(format!("lynnnote-logic-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(tmp.join("notes/os")).unwrap();
        let ws = tmp.to_string_lossy().to_string();

        let entry = create_note(&ws, "os", "模板测试", Some("# 模板内容\n\n正文\n"))
            .expect("create_note 失败");
        let written = std::fs::read_to_string(tmp.join(&entry.relative_path)).unwrap();
        assert_eq(
            written,
            "# 模板内容\n\n正文\n",
            "create_note 写入传入的模板内容",
        );

        let entry2 = create_note(&ws, "os", "默认测试", None).expect("create_note 失败");
        let written2 = std::fs::read_to_string(tmp.join(&entry2.relative_path)).unwrap();
        assert_eq(written2, "# 默认测试\n", "create_note 默认标题模板");

        // 模板 CRUD 往返
        let tpl = save_template(
            &ws,
            NoteTemplate {
                id: String::new(),
                name: "我的模板".into(),
                content: "# {{title}}\n正文".into(),
                updated_at: String::new(),
            },
        )
        .expect("save_template 失败");
        assert_eq(tpl.name, "我的模板", "save_template 返回条目");
        let listed = list_templates(&ws).expect("list_templates 失败");
        if listed.len() != 1 || listed[0].id != tpl.id {
            panic!("断言失败：模板列表应含 1 个新模板");
        }
        println!("  ok  list_templates 返回新模板");
        delete_template(&ws, &tpl.id).expect("delete_template 失败");
        if !list_templates(&ws).unwrap().is_empty() {
            panic!("断言失败：删除后列表应为空");
        }
        println!("  ok  delete_template 移除模板");

        // 批量索引读取（阶段七：索引构建数据源）
        // 注意：title 由内容首个 `# ` 标题推导（note_entry 语义），非文件名
        let all = read_all_notes(&ws).expect("read_all_notes 失败");
        if all.len() != 2 {
            panic!("断言失败：read_all_notes 应返回 2 篇笔记");
        }
        let has_template = all
            .iter()
            .any(|n| n.title == "模板内容" && n.content == "# 模板内容\n\n正文\n");
        if !has_template {
            panic!("断言失败：read_all_notes 内容应包含模板测试全文");
        }
        let has_default = all.iter().any(|n| n.title == "默认测试" && n.content == "# 默认测试\n");
        if !has_default {
            panic!("断言失败：read_all_notes 应包含默认标题模板笔记");
        }
        println!("  ok  read_all_notes 批量返回全部笔记内容");

        // 导出设置（阶段八：写入工作区根 lynnnote-settings.json）
        export_settings(&ws, "{\"theme\":\"dark\"}").expect("export_settings 失败");
        let exported = std::fs::read_to_string(tmp.join("lynnnote-settings.json")).unwrap();
        assert_eq(exported, "{\"theme\":\"dark\"}", "export_settings 写入 JSON");

        let _ = std::fs::remove_dir_all(&tmp);
    }

    // hash_content：确定性
    assert_eq(
        hash_content("hello").to_string(),
        &hash_content("hello").to_string(),
        "相同内容哈希一致",
    );
    let h1 = hash_content("hello");
    let h2 = hash_content("hellp");
    if h1 == h2 {
        panic!("断言失败：不同内容哈希不应相同");
    }
    println!("  ok  不同内容哈希不同");

    // replace_first_heading
    assert_eq(
        replace_first_heading("# 旧标题\n\n正文", "新标题"),
        "# 新标题\n\n正文",
        "替换已有的一级标题",
    );
    assert_eq(
        replace_first_heading("正文开头\n## 二级标题", "新标题"),
        "# 新标题\n\n正文开头\n## 二级标题",
        "无标题时在开头插入",
    );

    println!("== 全部通过 ==");
}
