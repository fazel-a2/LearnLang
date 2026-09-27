@ECHO OFF
SET JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot
SET PATH=%JAVA_HOME%\bin;%PATH%

npx expo prebuild --platform android
cd android
gradlew assembleRelease
