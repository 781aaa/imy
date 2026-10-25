#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SDK="${ANDROID_HOME:-C:/Users/jinyi/AppData/Local/Android/Sdk}"

if [ ! -d "$SDK" ]; then
  echo "找不到 Android SDK：$SDK"
  echo "请设置 ANDROID_HOME 后重试"
  exit 1
fi

BT_NAME="$(ls "$SDK/build-tools" | sort -V | tail -1)"
PLATFORM_NAME="$(ls "$SDK/platforms" | grep '^android-' | sort -V | tail -1)"
BT="$SDK/build-tools/$BT_NAME"
ANDROID_JAR="$SDK/platforms/$PLATFORM_NAME/android.jar"
BUILD="$ROOT/build"
APK_OUT="$ROOT/exam-system-debug.apk"

echo "SDK: $SDK"
echo "build-tools: $BT_NAME"
echo "platform: $PLATFORM_NAME"

rm -rf "$BUILD"
mkdir -p "$BUILD/classes" "$BUILD/dex"

echo "[1/6] 编译 Java"
javac -encoding UTF-8 --release 8 \
  -cp "$ANDROID_JAR" \
  -d "$BUILD/classes" \
  $(find "$ROOT/android/src" -name '*.java')

echo "[2/6] 转换为 dex"
javac_files="$(find "$BUILD/classes" -name '*.class')"
java -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 \
  --lib "$ANDROID_JAR" \
  --min-api 24 \
  --output "$BUILD/dex" \
  $javac_files

echo "[3/6] 打包资源与清单"
"$BT/aapt2.exe" link \
  -o "$BUILD/app-unsigned.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$ROOT/android/AndroidManifest.xml" \
  --min-sdk-version 24 \
  --target-sdk-version 35

echo "[4/6] 加入 classes.dex"
cp "$BUILD/dex/classes.dex" "$BUILD/classes.dex"
(cd "$BUILD" && jar uf app-unsigned.apk classes.dex)

echo "[5/6] 对齐"
"$BT/zipalign.exe" -f 4 "$BUILD/app-unsigned.apk" "$BUILD/app-aligned.apk"

echo "[6/6] 签名"
KS="$HOME/.android/debug.keystore"
if [ ! -f "$KS" ]; then
  mkdir -p "$HOME/.android"
  keytool -genkeypair \
    -keystore "$KS" \
    -storepass android \
    -alias androiddebugkey \
    -keypass android \
    -dname "CN=Android Debug,O=Android,C=US" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000
fi

java -jar "$BT/lib/apksigner.jar" sign \
  --ks "$KS" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "$APK_OUT" \
  "$BUILD/app-aligned.apk"

java -jar "$BT/lib/apksigner.jar" verify "$APK_OUT"

echo
echo "APK 已生成：$APK_OUT"
ls -lh "$APK_OUT"
