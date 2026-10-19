# The Facility — Standalone Edition

The Facility horror mode has been separated into a dedicated, launchable project.

## Play
Open `index.html` in a browser, or host this folder using any static-site server (recommended, since WebGL, audio and imported models may require HTTP).

For local hosting, run `python -m http.server 8000` inside this folder and visit `http://localhost:8000`.

Use **PLAY THE FACILITY** → **ENTER THE FACILITY**. Your goal: find three fuses, restore power to the freight lift, and escape.

## Technical note
The Facility originally lived inside Gloomspire's single 3 MB HTML file. Its renderer, input, audio, horror mode and common game state depend on shared in-file routines. This standalone edition keeps that engine intact for compatibility but exposes **only The Facility** in the main menu. The original Gloomspire archive is not modified.

Requires internet access for any remote resources referenced by the HTML.
