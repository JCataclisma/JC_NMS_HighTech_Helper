# NMS HighTech Helper — V1

Open `Launch NMS HighTech Helper.bat`, or open `index.html` directly. The Python launcher is optional and only serves the local folder at `127.0.0.1`; the application itself makes no network requests.

Recipe definitions live in `data/recipes.js`, item names in `data/items.js`, and name variants in `data/aliases.js`. The calculation engine consumes an intermediate component from the local inventory before recursively expanding its recipe.

The current screenshot workflow stores selected images only as browser-local object URLs and requires manual verification. V1 does not bundle a browser OCR model; use `Load test inventory` or add/edit rows manually while the OCR adapter is refined with real screenshot samples. The two root PNGs are development reference fixtures only and must not enter `builds/`.
