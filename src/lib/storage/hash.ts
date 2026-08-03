/**
 * FNV-1a 32 位哈希（与 Rust 侧 hash_content 对应）。
 * 仅用于进程内冲突检测（读取时的哈希 → 写入时带回比对），
 * 不要求跨平台一致，因此 JS 用 UTF-16 码元、Rust 用 UTF-8 字节均可。
 */
export function hashContent(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
