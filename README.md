# THE FACILITY — Co-op Survival

Open `index.html` through a local static web server, or deploy this folder unchanged to a static host.

**PLAY SOLO** starts a single-player run. **PLAY CO-OP** creates or joins an online room for up to four players. Explore two connected wings on three floors, find one fuse per floor, install the fuses in the basement breaker, and survive until the freight lift arrives.

A local static server is recommended because the game loads the demon GLB and audio from `assets/horror/`. For example: `python -m http.server 8000` then visit `http://localhost:8000/The-Facility/` from the parent folder.

The new wing adds twelve rooms, including a botanical lab, observation and research rooms, a medical ward, morgue, surgery, quarantine, containment, cryogenics, turbines, records and decontamination. Looped corridors and another three-floor stairwell connect them. Warm and cool baked lighting, planting beds, medical furniture, machinery and illuminated signs distinguish the areas. Fuse and battery locations include the extension.

The original hunter is joined by the animated wolf spider and the uploaded Unvermeidlich ghost: opening doors can reveal a creature; the ghost watches or crosses corridors, while the spider can spot and pursue you. Doors slam or knock, and brief blackouts interrupt the lighting. The procedural humanoid placeholder stays removed. The Wraith uses the user's supplied Unvermeidlich model, with its four native animations and original 70-joint skin. It appears behind the east-wing observation, morgue and cryogenics doors and in corridor encounters. Extra encounters pause during the main hunter's chase and use simulation timers, so pausing freezes them.

The Crawler now uses the uploaded rigged wolf spider, with its original skeleton and native walking/running animations. The runtime GLB is about 2.3 MB, reduced from 23 MB by optimizing textures and removing unused animation data. The spider is now about twice its previous size: its animated length is approximately 1.8 m instead of 0.92 m. Its collision body and eye height are enlarged, gait timing matches the longer stride, and the leg spread narrows near real doorways before returning to full width in open rooms. Animated pose bounds set its scale and ground offset; it faces the direction it travels and pauses its gait when blocked. Door waypoints use the centre of the opening, opening requests are throttled, and proximity scares require a clear line of sight on the same floor. The cached rig is safely detached and reattached on retries. Artist attribution and modification details are in [CREDITS.md](CREDITS.md).

Spider pursuit: the uploaded rigged spider now accelerates to 4.65 m/s, above your 3.15 m/s walk and below your 5.9 m/s sprint. It gives a 0.85-second reaction window (1.1 seconds after a door reveal), follows the last visible position, and gives up after 3.5 seconds without sight. After sixteen seconds it tires to 4.05 m/s; an encounter lasts at most 28 seconds. A visible close lunge deals 22 health damage and ends that encounter. Walls and other floors still block attacks.

The shared encounter path follower now checks the actual collision capsule before taking a direct route, opens physical doors once, skips reached waypoints without pausing, and allows clearance around furniture corners. Its larger search budget supports the expanded map. Gait still follows actual movement, so a blocked spider does not run in place.

Emergency wall lamps now resolve a real air/solid wall boundary, including positions authored inside a wall. The entire backplate must have solid support and clear space in front. Each fixture has a flush metal housing, recessed luminous lens and protective cage; standalone emissive cubes are removed. Unsupported lamps produce no geometry, halo or baked light. Corrected mount coordinates also drive the lighting bake and halos.

Wayfinding uses fitted, high resolution lettering on backed wall placards. Room labels sit above door headers; direction signs mount on solid corridor walls. Every panel is checked for solid wall support and empty space in front, including its corners. Unsupported signs are not drawn.

Hunter behavior: a 22-second opening grace, a recognition warning and a 1.2-second reveal window give you time to react. Chase speed is 4.6–4.86 m/s. The former eight-second slowdown below walking speed is removed; after eighteen seconds it eases to 88% speed, still faster than walking. It now takes a direct route only after checking its actual collision capsule, animates according to distance moved, and restores an invalid or detached body. Losing sight for 3.2 seconds (four during the finale) ends the chase and gives fourteen seconds of recovery. Sounds lead to investigation. A hit requires 0.4 seconds of visible close contact on the same floor, deals 28 damage, and grants 1.4 seconds of protection against repeat contact. Closed doors, floors and reveal animations prevent attacks. The final alarm attracts it to the breaker; the lift arrives in 24 seconds.

Map dimensions: the expansion increased the world grid from 48 × 40 m to 70 × 50 m and added twelve rooms across three floors. Original room dimensions were retained. The botanical lab is 15.5 × 10 m, records and quarantine are 10 × 8.5 m, and the new corridor loops are 2.5 m wide.


## Health and co-op

- You start with **100 health**. A separate, always-visible vitals bar shows remaining health and critical status. After twelve seconds without a hit and outside a chase, health recovers at four points per second.
- Choose **PLAY CO-OP → CREATE A ROOM**. Wait for the room code in the game HUD, then use **INVITE** to copy a link or share the six-character code. Friends choose **JOIN ROOM** on their own devices. Every player runs the same current build.
- The host runs one world simulation and sends snapshots fifteen times per second. The team shares doors, fuse locations, collected items, breaker progress, lift state, monster positions and health. Only the host accepts interactions, damage and revives; repeated pickup requests cannot duplicate items. Player movement is local, with interpolated teammate bodies and monster movement on guests. Both the hunter and spider can pursue guests.
- At zero health you are **downed** in co-op. A living teammate can press **E / USE** within 2.2 metres, with a clear line of sight, to revive you to 40 health with three seconds of protection. If everyone is down, the run ends. Once the lift is open, a living teammate reaching the lift car wins the run for the team.
- Late joiners receive the current world. Full rooms, mismatched versions, failed connections and host disconnects show a clear message and a route back to the menu. The host must stay in the game; there is no host migration. Pause opens local settings while the online room continues running. Returning to the menu closes the connection and disposes teammate graphics.

Networking uses the bundled **PeerJS 1.5.5** client and the public PeerServer Cloud for signalling, then WebRTC data channels between browsers. No microphone or camera is requested. The game remains deployable as static files on Vercel. Restrictive networks can block peer-to-peer connections; for deployment on those networks, an operator can set `window.FACILITY_RTC_CONFIG = {iceServers: [...]}` before `facility-coop.js` loads, using their own STUN/TURN service. No relay credentials are bundled. See [PeerJS configuration](https://peerjs.com/client/api/peer). Solo play does not load the networking dependency.

The entry pages and service-worker cache are versioned as `coop-survival-r1-20261021`. Multiplayer parameters are preserved through `index.html`, `game.html` and `game-core.html`. Gameplay scripts use network-first caching so an old installed copy cannot silently keep the old room code.

Controls:

- WASD / joystick: walk. Full forward joystick never activates sprint.
- Hold Shift or the touch SPRINT button: sprint. A mapped controller sprint button also works.
- Sprint reserve: 30 seconds; recovery begins after 0.35 seconds, with a full refill taking about 3 seconds standing or 4.5 seconds walking.
- E / USE: doors, fuses, batteries, breaker, revive a nearby downed teammate. F / LIGHT: flashlight. C / CROUCH: crouch.

Wall texture flicker is fixed at the source: wall panels sit 18 mm clear of the structural wall instead of sharing its exact depth. Door jambs meet the lintel at 2.3 m without overlapping their front surfaces. This prevents competing wall/panel textures and bright patches around the top corners of doorways as the camera moves. No global depth bias is applied to hide geometry problems.

Door visuals now match their physical angles from initialization through settling. Collision checks sweep the full capsule movement, including fallback slides, against the physical leaf at every angle. Navigation assigns doors to the correct floor. Gameplay changes are integrated into `game-core.html`; the entry pages no longer depend on runtime string replacements or injected patches.

Run `node --test tests/facility-regression.test.cjs` for parsing, geometry, map routes, door collision, joystick/stamina behavior, uploaded creature rig and animation checks, physical pursuit, cover/escape behavior, health cooldowns and recovery, downing and revives, multiplayer targeting, loader parameters, idempotent interactions, late-join snapshots, four-client room protocol and disconnect cleanup. Multiplayer protocol tests use separate game contexts and an in-memory data transport; they do not verify browser WebRTC/ICE, cross-network connectivity, visual layout or physical touch responsiveness. Those still need browser/device playtesting.
