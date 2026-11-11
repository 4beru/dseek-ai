{ pkgs, config, inputs, ... }:

let
  # Same SDK source as the sibling Android reference, without its emulator,
  # native toolchains, platform previews or application credentials.
  androidSdk = inputs.android-nixpkgs.sdk.${pkgs.system} (sdkPkgs: with sdkPkgs; [
    cmdline-tools-latest
    platform-tools
    platforms-android-36
    build-tools-36-0-0
  ]);
  androidHome = "${androidSdk}/share/android-sdk";
in
{
  packages = [ androidSdk pkgs.nodejs_24 ];

  languages.java = {
    enable = true;
    jdk.package = pkgs.jdk21;
  };

  env.ANDROID_HOME = androidHome;
  env.ANDROID_SDK_ROOT = androidHome;
  env.GRADLE_USER_HOME = "${config.devenv.state}/gradle";
  # Google's Maven aapt2 is not patched for NixOS. Use the SDK's patched binary.
  env.GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${androidHome}/build-tools/36.0.0/aapt2";

  enterShell = ''
    export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/build-tools/36.0.0:$PATH"
  '';

  # Entering the shell never installs dependencies, starts a server or writes
  # local.properties. Build and device operations always require a command.
  scripts.dseek-build = {
    description = "Build the local demo host and installable debug APK";
    exec = ''
      set -euo pipefail
      cd "${config.devenv.root}"
      npm --prefix host ci
      npm --prefix host run build
      cd android
      bash ./gradlew --no-daemon :app:assembleDebug
    '';
  };

  scripts.dseek-demo = {
    description = "Start the synthetic demo or prepare an explicitly selected USB phone";
    exec = ''
      exec node "${config.devenv.root}/tools/android-demo.mjs" "$@"
    '';
  };
}
