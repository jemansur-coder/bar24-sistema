#!/usr/bin/env bash
# Gera o APK do app do garçom SEM Android Studio (Linux/Ubuntu), usando as ferramentas do Ubuntu:
#   sudo apt-get install android-sdk-build-tools android-sdk-platform-23 apksigner zipalign dalvik-exchange
# O jeito "oficial" é abrir a pasta android/ no Android Studio (ou ./gradlew assembleRelease).
#
# Uso:  android/build-apk-sem-android-studio.sh [chave.keystore] [senha]
# Sem chave, cria uma chave de teste em android/build/teste.keystore.
# ATENÇÃO: guarde a chave. Para atualizar o app já instalado, o novo APK tem que ser assinado com a MESMA chave.
set -euo pipefail
cd "$(dirname "$0")"
RAIZ=$(cd .. && pwd)
B=build
SDKJAR=${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}
KS=${1:-$B/teste.keystore}
PASS=${2:-bar24teste}
DX=$(command -v dalvik-exchange || command -v dx)

rm -rf "$B/tmp"; mkdir -p "$B/tmp"/{res,gen,classes,assets}

echo "1/6 Gerando o sistema web (npm run build)"
(cd "$RAIZ" && npm run build >/dev/null)
cp -r "$RAIZ/dist" "$B/tmp/assets/www"

echo "2/6 Recursos (aapt2)"
# pacote/versão vêm do app/build.gradle (mesmos valores que o Android Studio usa)
G=app/build.gradle
PKG=$(grep -o "applicationId '[^']*'" $G | head -1 | cut -d"'" -f2)
VCODE=$(grep -o 'versionCode [0-9][0-9]*' $G | head -1 | awk '{print $2}')
VER=$(grep -o "versionName '[^']*'" $G | head -1 | cut -d"'" -f2)
MIN=$(grep -o 'minSdk [0-9][0-9]*' $G | head -1 | awk '{print $2}')
TGT=$(grep -o 'targetSdk [0-9][0-9]*' $G | head -1 | awk '{print $2}')
sed "s#<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\">#<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\" package=\"$PKG\" android:versionCode=\"$VCODE\" android:versionName=\"$VER\"><uses-sdk android:minSdkVersion=\"$MIN\" android:targetSdkVersion=\"$TGT\" />#" \
  app/src/main/AndroidManifest.xml > "$B/tmp/AndroidManifest.xml"
aapt2 compile --dir app/src/main/res -o "$B/tmp/res/res.zip"
aapt2 link -I "$SDKJAR" --manifest "$B/tmp/AndroidManifest.xml" -A "$B/tmp/assets" \
  --java "$B/tmp/gen" -o "$B/tmp/base.apk" "$B/tmp/res/res.zip" --auto-add-overlay

echo "3/6 Compilando Java"
javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath "$SDKJAR" -d "$B/tmp/classes" \
  $(find "$B/tmp/gen" app/src/main/java -name '*.java')

echo "4/6 Convertendo para DEX"
"$DX" --dex --min-sdk-version=24 --output="$B/tmp/classes.dex" "$B/tmp/classes"
(cd "$B/tmp" && cp base.apk semassinatura.apk && zip -q -j semassinatura.apk classes.dex)

echo "5/6 Alinhando"
zipalign -f -p 4 "$B/tmp/semassinatura.apk" "$B/tmp/alinhado.apk"

echo "6/6 Assinando"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -storepass "$PASS" -keypass "$PASS" -alias bar24 \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Bar 24 Horas, O=MindNext, C=BR" >/dev/null 2>&1
fi
OUT="$B/bar24-garcom-$VER.apk"
apksigner sign --ks "$KS" --ks-pass "pass:$PASS" --ks-key-alias bar24 --out "$OUT" "$B/tmp/alinhado.apk"
apksigner verify "$OUT"
echo "Pronto: android/$OUT"
