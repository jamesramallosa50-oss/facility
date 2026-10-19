# THE FACILITY — Survival Horror

Open `index.html` through a local static web server, or deploy this folder unchanged to a static host.

The main menu **ENTER FACILITY** starts the three-level research facility directly. There is no game-mode selection step. Find three fuses and restore power to the freight lift while avoiding the creature.

A local static server is recommended because the game loads the demon GLB and audio from `assets/horror/`. For example: `python -m http.server 8000` then visit `http://localhost:8000/The-Facility/` from the parent folder.
