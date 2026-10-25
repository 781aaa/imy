# WebView 容器 / APK

最小 Android WebView 壳：加载电脑上运行的在线考试系统。

> 页面本身仍然是 `web/dist` 的 Vue3 产物，由 Express 在 `http://电脑IP:3000` 提供。
> APK 只负责打开这个地址，不包含前端代码。

## 构建

本机已安装 Android SDK（build-tools 35 / android-35）。

```bash
# Git Bash
cd webview
bash build-apk.sh
```

输出：`webview/exam-system-debug.apk`

项目不依赖 Gradle，直接使用 `javac + d8 + aapt2 + zipalign + apksigner`，避免下载 Gradle 和额外依赖。

## 安装

```bash
# 手机开启 USB 调试后
"$ANDROID_HOME/platform-tools/adb.exe" install -r webview/exam-system-debug.apk
```

或把 APK 发到手机手动安装。

## 使用

1. 电脑启动服务：`npm start`
2. 查电脑局域网 IP：`ipconfig`（例如 192.168.1.10）
3. 手机和电脑连同一个 Wi-Fi
4. 打开 APK，点右上角「设置」，填写 `http://192.168.1.10:3000`
5. 登录学生账号即可

## 说明

- Manifest 已开启 `usesCleartextTraffic`，允许局域网 HTTP
- 已开启 JavaScript、DOM Storage，Vue3 页面可正常运行
- 返回键优先在 WebView 内后退
- 这是 debug 签名，仅用于演示和自用
- 如果老师要求正式签名，需要自己生成 keystore 并替换签名参数

## 为什么不用 Gradle

- 本机没有全局 Gradle，Gradle 首次运行需要联网下载，受代理影响
- 最小 WebView 壳不需要 AndroidX / 资源库，直接用 SDK 命令行工具即可
- 需要扩展功能（相机、文件选择、推送等）时再迁移到 Android Studio / Gradle 工程
