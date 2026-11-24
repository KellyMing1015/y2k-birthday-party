# 千禧生日派对

从密码入场、撕票和开灯开始，接着点亮蛋糕、戳气球看拍立得、刮祝福、听语音，最后写下愿望并封信。

## 在 VPS 启动

需要 Node.js 22 或以上版本和 `unzip`。把素材密钥单独传到 VPS 的家目录，保存为 `birthday-party-materials.key`，然后拉取项目并解锁照片、录音、音乐和私人图说。

```sh
git clone https://github.com/KellyMing1015/y2k-birthday-party.git
cd y2k-birthday-party
node unlock-materials.mjs ~/birthday-party-materials.key
```

复制配置文件为 `.env`，在 `BIRTHDAY_PASSWORD=` 后填入四位入场密码。

```sh
cp .env.example .env
chmod 600 .env
nano .env
node --env-file=.env server.mjs
```

将域名的 HTTPS 请求交给监听在 `127.0.0.1:4178` 的 Node 服务，转发时保留原始 `Host`。网站和素材都由 Node 服务提供，密码在服务器上校验。

## 愿望与更新

首次封信会将愿望保存到 `data/wish.json`。可用 `BIRTHDAY_DATA_DIR` 配置长期保存愿望的目录。更新网站时保留该目录和 `.env`。

日常更新在 VPS 执行 `git pull`。如果更新了 `materials.zip.enc`，用同一把密钥重新解锁后重启服务。
