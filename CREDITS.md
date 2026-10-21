# The Facility — model credits

**Wolf Spider (Rigged) — (Rabidosa rabida)** by **Dreaming In Alternation 27**.

- Artist: https://sketchfab.com/DreamingInAlternation27
- Original model: https://sketchfab.com/3d-models/wolf-spider-rigged-rabidosa-rabida-6392e4cfb64d407182fdad2cea9e0abe
- License: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/

The game uses the model supplied by the user. Runtime modifications: the normal texture was resized from 4096 to 1024 pixels, the albedo was encoded as JPEG, unused animation clips/data were removed, and optional specular extension data was omitted for the existing loader. Geometry, skin weights, the complete skeleton, and native walking/running animation clips are preserved. Parent transforms set the game scale, forward direction, and floor alignment. Materials are adjusted to the facility lighting. No endorsement by the original artist is implied.

Three.js and the bundled GLTF loader are used under the MIT license. The existing meshoptimizer decoder retains its embedded MIT notice.

## The Unvermeidlich (Ghost) [Darkness Of Eclipse]

Model by **Memorie**: https://sketchfab.com/Memorie

- Original: https://sketchfab.com/3d-models/the-unvermeidlich-ghost-darkness-of-eclipse-b7ebe2b137454ca88137b636c95f689e
- License: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/

The game uses the ghost supplied by the user. Body and dress albedo textures were encoded as JPEG; PBR maps were resized to 512 pixels (hair normal: 256 pixels). The hair albedo and its alpha channel are preserved. Mesh geometry, the 70-joint skin and all four native stalking/chasing animation clips are unchanged. Parent transforms normalize animated height to 2.05 m and cancel horizontal root motion so the model follows collision-controlled movement. Materials are adjusted for the facility lighting. No endorsement by the original artist is implied.

## Multiplayer client

PeerJS 1.5.5, copyright PeerJS contributors, MIT License. The pinned browser bundle is included in `assets/vendor/peerjs-1.5.5.min.js`; its license is in `assets/vendor/peerjs-LICENSE`. Source: https://github.com/peers/peerjs.

## Night Courtyard — user-supplied models

- **Hospital Door Old Free** — AMMediaGames (https://sketchfab.com/AMMediaGames). License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). [Source](https://sketchfab.com/3d-models/hospital-door-old-free-15b147ae76ef40da9ad23831ca7225dd). Runtime file: `assets/world/hospital-door.glb`.
- **Run Forward Horror Tale Ethan** — cool guy (https://sketchfab.com/engantogs). License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). [Source](https://sketchfab.com/3d-models/run-forward-horror-tale-ethan-ae73433f8d7c42eebc5812ea5766d5a3). Runtime file: `assets/world/outdoor-runner.glb`.
- **an abandoned garage** — dasy444 (https://sketchfab.com/dasy444). License: SKETCHFAB Standard (https://sketchfab.com/licenses). [Source](https://sketchfab.com/3d-models/an-abandoned-garage-cae82b98d3654226a67ed05f2c927c99). Runtime file: `assets/world/garage.glb`.
- **Abandoned store for FREE** — dasy444 (https://sketchfab.com/dasy444). License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). [Source](https://sketchfab.com/3d-models/abandoned-store-for-free-686d2839d77a4d4a95d433919c34c289). Runtime file: `assets/world/store.glb`.
- **(PSX) - Backroom** — Kasugay𓅂 (https://sketchfab.com/Kasugay). License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). [Source](https://sketchfab.com/3d-models/psx-backroom-20643a0f60ba4a9f81a4a96996d2d488). Runtime file: `assets/world/backroom.glb`.
- **office is old abandoned FREE** — dasy444 (https://sketchfab.com/dasy444). License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/). [Source](https://sketchfab.com/3d-models/office-is-old-abandoned-free-3977a108b2304b85a698f3dda1777015). Runtime file: `assets/world/office.glb`.

Modifications: textures resized to 512px; opaque textures encoded as JPEG. Original meshes and materials retained. The hospital frame and leaf are placed separately on the game hinge; the Backrooms has an entrance cut for the connecting road. The outdoor runner keeps its original skin and animation with horizontal root motion cancelled at runtime. The store runtime excludes distant stray scene objects.
