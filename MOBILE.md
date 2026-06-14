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

## Plus tard : version signée (Play Store)

Le build debug suffit pour tester. Pour publier sur le Play Store, il faudra un
APK/AAB **signé** (`./gradlew assembleRelease` + keystore) — à faire le moment venu.
