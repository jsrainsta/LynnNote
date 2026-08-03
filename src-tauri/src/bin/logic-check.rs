// 纯函数逻辑验证（GNU 工具链下 cargo test 的 lib test harness 无法运行，
// 改用普通 bin 做断言；断言失败 panic + 非零退出码，可在 CI 中替代单元测试）。
// 运行：cargo +stable-x86_64-pc-windows-gnu run --bin logic-check

use lynnnote_lib::filesystem::{
    hash_content, replace_first_heading, sanitize_filename, slug_to_display_name,
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
