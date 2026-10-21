# THE FACILITY — Night Courtyard

[Play The Facility](https://facility-g5iq.vercel.app/)

Search three floors, collect one fuse per floor, power the basement breaker and reach the freight lift. Play solo or create a hosted room for up to four people.

## This build

- The world is **124 × 102 metres**. Six new annex rooms are 15.5 × 11.5 metres, with longer corridors and return routes on all three floors.
- A service exit connects the original building to a night courtyard with roads, marked lanes, pavements, street lights, trees and benches. The uploaded garage, store and office sit in the outdoor area. A road connects to the uploaded full Backrooms maze.
- The uploaded hospital door supplies both the fixed frame and the moving leaf. The leaf uses the same hinge, width and angle as its collision body. Frames stay fixed and follow door visibility culling. The hunter waits for sufficient physical clearance and follows door-centre waypoints.
- The main hunter remains in the building after a pursuit instead of randomly vanishing. It walks at 2 m/s, investigates at 3.1 m/s and chases at 4.9–5.16 m/s; your sprint is 5.9 m/s. It searches the last seen position, listens for movement, loses visual tracking behind cover and can take a physical side step to free itself from a corner. A 22-second opening grace and recognition/reveal warnings give you time to react.
- **Run Forward Horror Tale Ethan** is the outdoor hunter, using the uploaded skin and native running clip. It patrols the courtyard, spots players through real lines of sight and accelerates to 5.05 m/s after a one-second reaction window. It can pursue a guest and follow a player into the outdoor buildings/Backrooms sector. Its running animation cannot drift away from its collision body.
- The uploaded wolf spider and Unvermeidlich ghost remain inside. The spider pursues at 4.65 m/s and deals 22 damage on a close lunge. Apparitions remain brief encounters; the main hunter stays active.

The six new models total about **12.8 MB**, down from about **97.5 MB** of source files. Textures are capped at 512 pixels. Original meshes, material assignments, the outdoor character's skeleton and its running clip are retained. Static walls and furniture generate collision boxes from the imported triangles. The Backrooms model has a cut entrance matching its physical doorway. Shared imported geometry survives retries, while per-run graphics and connections are disposed.

## Online rooms

Choose **PLAY CO-OP → CREATE A ROOM**, wait for the code in the HUD, then use **INVITE** or share the six-character code. Friends choose **JOIN ROOM**. The host must keep the game tab active.

Co-op uses same-origin HTTPS requests to `/api/facility-room`, which relays packets through the owner's existing hosted four-seat room service. It does not need WebRTC negotiation, open peer-to-peer ports, a camera or a microphone. Room seat tokens stay in memory and are verified by the room service. The API checks request origin and packet size, limits message batches and disables caching. The upstream URL can be replaced with the `FACILITY_ROOM_SERVICE` environment variable; no account credentials are embedded in browser code.

The host owns monster AI, health, doors, shared pickups, breaker progress and the lift. Guests send responsive local movement and numbered interaction requests. World snapshots coalesce during slow connections, fragments are reassembled before use and unacknowledged actions repeat safely. Transient HTTP failures retry the same room seat. Late joins receive the current world; full or closed rooms show clear errors. Pause opens local settings while the room continues to run. There is no host migration.

Teammates wear bright, emissive suits and helmets with floating name labels. The roster shows health and distance; bodies remain visible on the same floor at normal game distances, with ordinary world occlusion.

## Health and controls

You start with 100 health. Hunter hits deal 28 damage and outdoor hits deal 32, followed by 1.4 seconds of protection against repeated contact. All damaging attacks require sustained close contact and a clear line of sight on the same floor. Health recovers at four points per second after twelve seconds without damage and outside a chase.

At zero health in co-op, you are downed. A teammate can press **E / USE** within 2.2 metres and with a clear line of sight to revive you to 40 health, with three seconds of protection. The run ends if everyone is down. A living teammate reaching the open lift car wins for the team.

- **WASD / joystick:** walk. Pushing the joystick fully forward always walks.
- **Shift / SPRINT:** run. Sprint reserve is 30 seconds; recovery starts after 0.35 seconds.
- **E / USE:** doors, items, breaker, nearby teammate revive.
- **F / LIGHT:** flashlight. **C / CROUCH:** move quietly.

The freight lift arrives 24 seconds after all three fuses are installed. Close doors, use cover and follow the signs to escape a chase.

## Development and verification

Deploy the repository to Vercel to serve the game and the Node.js function in `api/facility-room.js`. Solo play also works with a local static server, for example `python -m http.server 8000` and `http://localhost:8000/`. A static server alone cannot execute the multiplayer API.

Run `node --test tests/facility-regression.test.cjs`. Coverage includes source parsing, geometry, routes, physical door sweeps, native hospital frames/hinges, joystick and stamina behavior, uploaded creature rigs, pursuit/cover rules, health and revives, four-client hosted room packets, transient request recovery, late joins, API boundaries, extension/Backrooms reachability and native outdoor running animation.

A real hosted-service test also connected four distinct clients, delivered shared world messages to all three guests and rejected a fifth. Browser rendering, actual touch controls and a simultaneous physical-device play session still need playtesting.

The active build is `courtyard-r2-20261021`. Both entry HTML files and `game-core.html` load this build. The service worker bypasses `/api/` entirely and uses network-first caching for gameplay scripts. Attribution is in [CREDITS.md](CREDITS.md).
