#!/usr/bin/env bash
# בונה את ה-APK בלי Gradle, רק עם כלי ה-SDK. נקרא מ-GitHub Actions (או מקומית עם ANDROID_HOME).
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -n "$SDK" ] || { echo "ANDROID_HOME לא מוגדר"; exit 1; }
BT="$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)"
PLATFORM="$(ls -d "$SDK"/platforms/android-* | sort -V | tail -1)"
JAR="$PLATFORM/android.jar"
echo "build-tools: $BT | platform: $PLATFORM"

RUN="${RUN:-1}"
VERSION_NAME="1.$RUN"
rm -rf build out && mkdir -p build/classes build/dex out

"$BT/aapt2" compile --dir res -o build/res.zip
"$BT/aapt2" link -o build/base.apk -I "$JAR" --manifest AndroidManifest.xml \
  --min-sdk-version 24 --target-sdk-version 34 --version-code "$RUN" --version-name "$VERSION_NAME" \
  -R build/res.zip --auto-add-overlay

javac --release 8 -classpath "$JAR" -d build/classes $(find src -name '*.java')
"$BT/d8" --release --min-api 24 --lib "$JAR" --output build/dex $(find build/classes -name '*.class')
(cd build/dex && zip -q -j ../base.apk classes.dex)
"$BT/zipalign" -f -p 4 build/base.apk build/aligned.apk

if [ -n "${KS_B64:-}" ]; then
  echo "$KS_B64" | base64 --decode > build/release.jks
  KS=build/release.jks; PASS="$KS_PASS"; ALIAS=release
else
  echo "אין מפתח חתימה – חותם עם מפתח זמני לבדיקה"
  keytool -genkeypair -keystore build/debug.jks -alias debug -keyalg RSA -keysize 2048 -validity 3650 \
    -storepass android -keypass android -dname "CN=debug" >/dev/null 2>&1
  KS=build/debug.jks; PASS=android; ALIAS=debug
fi
"$BT/apksigner" sign --ks "$KS" --ks-key-alias "$ALIAS" --ks-pass "pass:$PASS" --key-pass "pass:$PASS" \
  --out out/mi-hamitchaze.apk build/aligned.apk
"$BT/apksigner" verify --verbose out/mi-hamitchaze.apk | head -8
ls -l out/mi-hamitchaze.apk
