# 本地部署与离线演示

> 本项目**不部署到 VPS**，也不修改任何外部服务器。以下全部在本机完成。

## 环境要求

- Node.js ≥ 22.13（开发环境为 24.16）
- 无需安装数据库服务，SQLite 由 Node 内置模块提供
- 无需联网运行（首次安装依赖除外）

## 一次性准备

```bash
npm install
npm run db:migrate
npm run db:seed
npm run db:seed:english
cd web && npm install && npm run build
cd ..
```

## 启动

```bash
npm start
```

或一条命令完成构建与启动：

```bash
npm run demo
```

访问 http://localhost:3000

## 数据位置

- 数据库：`data/exam.db`（WAL 模式，会生成 `exam.db-wal`、`exam.db-shm`）
- 上传目录：`data/uploads`（当前版本未启用文件上传）
- 前端产物：`web/dist`

## 重置演示数据

```bash
# 停止服务后执行
rm -f data/exam.db data/exam.db-wal data/exam.db-shm
npm run db:migrate
npm run db:seed
npm run db:seed:english
```

Windows 下可在 Git Bash 中执行，或直接删除 `data` 目录后重新初始化。

## 离线验证

1. 完成构建并启动服务
2. 断开网络（关闭 Wi-Fi / 拔网线）
3. 浏览器访问 http://localhost:3000
4. 完整走一遍：学生练习 → 模拟考试 → 交卷 → 教师阅卷 → 统计
5. 全流程不依赖任何外部 API、CDN 或在线字体

静态资源检查：

```bash
grep -Eo '(https?:)?//[^" ]+' web/dist/index.html
```

`index.html` 中只应出现相对路径，不应出现外部域名。

## 端口与进程

- 默认端口：3000，可通过环境变量 `PORT` 修改
- 服务由前台进程运行，`Ctrl + C` 停止
- 不安装为系统服务、不开机自启、不占用其他项目端口

## WebView 兼容

- 使用 hash 路由（`#/login`），不依赖服务端路由回退
- Vite `base: './'`，所有资源为相对路径
- 可直接把 `web/dist` 交给任意 WebView 容器加载

## Android WebView / APK

- 容器源码：`webview/android/`
- 构建脚本：`webview/build-apk.sh`（使用本机 Android SDK，不依赖 Gradle）
- 产物：`webview/exam-system-debug.apk`（debug 签名，versionName 1.0）
- 安装：手机开启 USB 调试后执行
  `$ANDROID_HOME/platform-tools/adb.exe install -r webview/exam-system-debug.apk`
- 使用：手机与电脑同一 Wi-Fi，APK 内点右上角「设置」，填写 `http://电脑局域网IP:3000`
- 注意：APK 只是 WebView 壳，不包含前端；电脑需要保持 `npm start` 运行

## 常见问题

**端口被占用**：设置 `PORT=3001 npm start`，或关闭占用 3000 的进程。

**页面白屏**：确认已执行 `cd web && npm run build`，并且 `web/dist/index.html` 存在；浏览器强制刷新。

**登录失败**：确认已执行 `npm run db:seed`；种子账号见 README。

**数据混乱**：按上面的「重置演示数据」重新初始化。
