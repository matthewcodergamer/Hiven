# Hiven

Detect accessible media. Download it when the site and format allow. Watch for VPN exposure.

[![Build Chrome extension](https://github.com/matthewcodergamer/Hiven/actions/workflows/build-extension.yml/badge.svg?branch=main)](https://github.com/matthewcodergamer/Hiven/actions/workflows/build-extension.yml)

## Links

- **Website:** https://matthewcodergamer.github.io/Hiven/
- **Source:** https://github.com/matthewcodergamer/Hiven
- **Builds and downloadable artifacts:** https://github.com/matthewcodergamer/Hiven/actions/workflows/build-extension.yml
- **Latest website ZIP:** https://matthewcodergamer.github.io/Hiven/hiven-extension.zip

## Download a fresh build

1. Open the [Build Chrome extension workflow](https://github.com/matthewcodergamer/Hiven/actions/workflows/build-extension.yml).
2. Select the latest successful run on the branch you want to test.
3. Under **Artifacts**, download `hiven-chrome-extension`.
4. Extract the ZIP. Its top level contains `manifest.json` and `icons/`.
5. In Chrome, open **Extensions** → enable **Developer mode** → **Load unpacked**.
6. Select the extracted folder containing `manifest.json`.

You can also trigger a fresh build using **Run workflow** on the Actions page. Artifacts are retained for 30 days. Published GitHub releases receive the generated ZIP as a release asset.

## Install from a website ZIP

1. Download the ZIP from the website.
2. Extract it.
3. Open Chrome → Extensions → Developer mode → **Load unpacked**.
4. Select the extracted extension folder containing `manifest.json` and `icons/`.

If Chrome reports that `icons/icon16.png` is missing, make sure you selected the extracted extension folder rather than its parent.

Scan runs only when you click **Scan this tab**. Hiven will not extract YouTube, defeat DRM, or bypass access controls.
