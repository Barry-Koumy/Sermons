# Application mobile (Android) — build installable

L'app web est empaquetée en application Android via **Capacitor**. Le build actuel est
un APK **debug, non signé**, pour tester / installer hors Play Store.

## APK déjà construit

`Bibliotheque-de-Sermons.apk` (à la racine du projet `Lecture de Sermons/`).

## Installer sur un téléphone

1. Transférez l'APK sur le téléphone (USB, email, Drive…).
2. Ouvrez-le ; autorisez « Installer des applications inconnues » si demandé.
3. Installez.

## Reconstruire l'APK après une modification du site

Depuis `sermons-app/` :

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# Résultat : android/app/build/outputs/apk/debug/app-debug.apk
```

## Si vous régénérez le projet natif (`npx cap add android`)

Le dossier `android/` n'est pas versionné (régénérable). Après régénération,
ré-appliquez ce correctif dans `android/app/build.gradle`, juste après le bloc
`dependencies { … }` (sinon : erreur de classes Kotlin dupliquées) :

```gradle
configurations.all {
    resolutionStrategy {
        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.8.22'
        force 'org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.8.22'
    }
}
```

Et vérifiez `android/local.properties` :
`sdk.dir=C\:\\Users\\barry\\AppData\\Local\\Android\\Sdk`

Régénérez aussi l'**icône + l'écran de démarrage** (le master `assets/icon.png` est
versionné) et reportez la version de l'app :

```bash
npx capacitor-assets generate --android --iconBackgroundColor "#06382a" --iconBackgroundColorDark "#06382a"
# puis, dans android/app/build.gradle : versionCode / versionName (ex. 2 / "1.1.0")
```

> Pour modifier le logo : remplacez `icon.png` (à la racine de `sermons-app/`),
> lancez `node scripts/generate-icons.mjs` (icônes web + PWA), puis la commande
> ci-dessus (icônes Android). Rebuild : `npm run build && npx cap sync android`.

## Contenu hors-ligne vs distant

Cet APK **embarque** les sermons (lecture hors-ligne, figée au moment du build).
Pour que l'app mobile reçoive les nouveaux sermons **sans réinstallation**, on pourra
la faire lire le catalogue **distant** (le site Vercel/Pages) — à activer quand vous voudrez.

## Version signée pour le Play Store (AAB)

Le Play Store exige un **AAB signé**. La signature est déjà configurée.

### Clé de signature (keystore)

- Fichier : `sermons-app/keystore/sermons-release.jks` (alias `sermons-upload`, RSA 2048,
  valide jusqu'en 2053).
- Secrets : `sermons-app/keystore.properties` (storeFile, storePassword, keyAlias, keyPassword).
- **Ces deux fichiers sont gitignorés et NE DOIVENT JAMAIS être versionnés ni perdus.**
  Sans eux, impossible de publier une mise à jour de l'app. Sauvegardez-les hors de la
  machine (gestionnaire de mots de passe + copie chiffrée du `.jks`).
- Première publication → activez **Play App Signing** : cette clé devient la *clé d'upload*
  (réinitialisable via Google si perdue, contrairement à la clé d'app).

### Construire l'AAB signé

Depuis `sermons-app/` :

```powershell
$env:VITE_BASE=$null      # base '/' (par défaut) pour le mobile
npm run build
npx cap sync android
cd android; .\gradlew.bat bundleRelease
```

Résultat : `android/app/build/outputs/bundle/release/app-release.aab` (signé).
Vérifier : `& "$env:JAVA_HOME\bin\jarsigner.exe" -verify <aab>` → « jar verified. ».
Avant chaque release, incrémentez `versionCode` (et `versionName`) dans `android/app/build.gradle`.

### Si vous régénérez le projet natif (`npx cap add android`)

Le dossier `android/` n'est pas versionné. Après régénération, en plus du correctif Kotlin
ci-dessus, **ré-appliquez le bloc de signature** dans `android/app/build.gradle` : le
chargement de `keystore.properties` (`def keystorePropertiesFile = rootProject.file("../keystore.properties")`),
le `signingConfigs { release { … } }`, et `signingConfig signingConfigs.release` dans
`buildTypes.release`. Le `.jks` et `keystore.properties` vivent **hors** de `android/`, donc
ils survivent à la régénération.
