# THE FACILITY — East Wing / Wolf Spider

Open `index.html` through a local static web server, or deploy this folder unchanged to a static host.

**ENTER FACILITY** starts the game directly. Explore two connected wings on three floors, find one fuse per floor, install the fuses in the basement breaker, and survive until the freight lift arrives.

A local static server is recommended because the game loads the demon GLB and audio from `assets/horror/`. For example: `python -m http.server 8000` then visit `http://localhost:8000/The-Facility/` from the parent folder.

The new wing adds twelve rooms, including a botanical lab, observation and research rooms, a medical ward, morgue, surgery, quarantine, containment, cryogenics, turbines, records and decontamination. Looped corridors and another three-floor stairwell connect them. Warm and cool baked lighting, planting beds, medical furniture, machinery and illuminated signs distinguish the areas. Fuse and battery locations include the extension.

The original hunter is joined by Patient, Crawler and Wraith scare encounters: opening doors can reveal a lunging figure; a crawler can pursue you briefly; an apparition watches from a corridor; figures cross your path; doors slam or knock; and brief blackouts interrupt the lighting. Extra encounters pause during the main hunter's chase and use simulation timers, so pausing freezes them.

The Crawler now uses the uploaded rigged wolf spider, with its original skeleton and native walking/running animations. The runtime GLB is about 2.3 MB, reduced from 23 MB by optimizing textures and removing unused animation data. Animated pose bounds set its scale and ground offset; it faces the direction it travels and pauses its gait when blocked. Door waypoints use the centre of the opening, opening requests are throttled, and proximity scares require a clear line of sight on the same floor. The cached rig is safely detached and reattached on retries. Artist attribution and modification details are in [CREDITS.md](CREDITS.md).

Map dimensions: the expansion increased the world grid from 48 × 40 m to 70 × 50 m and added twelve rooms across three floors. Original room dimensions were retained. The botanical lab is 15.5 × 10 m, records and quarantine are 10 × 8.5 m, and the new corridor loops are 2.5 m wide.

Controls:

- WASD / joystick: walk. Full forward joystick never activates sprint.
- Hold Shift or the touch SPRINT button: sprint. A mapped controller sprint button also works.
- Sprint reserve: 30 seconds; recovery begins after 0.35 seconds, with a full refill taking about 3 seconds standing or 4.5 seconds walking.
- E / USE: doors, fuses, batteries, breaker. F / LIGHT: flashlight. C / CROUCH: crouch.

Door visuals now match their physical angles from initialization through settling. Collision checks sweep the full capsule movement, including fallback slides, against the physical leaf at every angle. Navigation assigns doors to the correct floor. Gameplay changes are integrated into `game-core.html`; the entry pages no longer depend on runtime string replacements or injected patches.

Run `node --test tests/facility-regression.test.cjs` for parsing, route accessibility with railings, door collision and angle consistency, floor-specific door navigation, joystick/stamina behavior and encounter lifecycle checks. Rendering and physical touch responsiveness still require browser/device playtesting.
