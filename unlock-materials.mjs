import { createDecipheriv } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const keyPath = process.argv[2];
if (!keyPath) {
  console.error("用法：node unlock-materials.mjs 密钥文件路径");
  process.exit(1);
}

const directory = fileURLToPath(new URL(".", import.meta.url));
const header = Buffer.from("Y2K-V1\0");
const nonceEnd = header.length + 12;
const tagEnd = nonceEnd + 16;
let zip;
try {
  const encodedKey = readFileSync(keyPath, "utf8").trim();
  const sealed = readFileSync(join(directory, "materials.zip.enc"));
  if (!/^[0-9a-f]{64}$/i.test(encodedKey) || sealed.length <= tagEnd ||
      !sealed.subarray(0, header.length).equals(header)) {
    throw new Error("Invalid key or material bundle");
  }
  const key = Buffer.from(encodedKey, "hex");
  try {
    const cipher = createDecipheriv("aes-256-gcm", key, sealed.subarray(header.length, nonceEnd));
    cipher.setAAD(header);
    cipher.setAuthTag(sealed.subarray(nonceEnd, tagEnd));
    zip = Buffer.concat([cipher.update(sealed.subarray(tagEnd)), cipher.final()]);
  } finally {
    key.fill(0);
  }
} catch {
  console.error("素材解锁失败。请检查密钥文件和仓库里的素材包。");
  process.exit(1);
}

const temp = mkdtempSync(join(tmpdir(), "birthday-materials-"));
try {
  const archive = join(temp, "materials.zip");
  writeFileSync(archive, zip, { mode: 0o600 });
  execFileSync("unzip", ["-oq", archive, "-d", directory], { stdio: "inherit" });
  console.log("素材已解锁。");
} catch {
  console.error("素材解压失败。请确认 VPS 已安装 unzip，且项目目录可写。");
  process.exitCode = 1;
} finally {
  zip.fill(0);
  rmSync(temp, { recursive: true, force: true });
}
