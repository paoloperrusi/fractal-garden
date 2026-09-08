# Fractal Tree Generator 🌲✨

An interactive, real-time 3D procedural tree generator, botanical synthesizer, and 3D asset exporter built with **TypeScript**, **Three.js**, **Vite**, and **Tweakpane**.

Designed around a core philosophy: **Every variable with a range can be adjusted live from the menu with instantaneous 60fps visual updates.**

---

## 🚀 Key Features

- 🔬 **Real-Time Parametric Workbench:**
  - **Topology & Recursion:** Seed, recursion depth (1–9), branching splits per node, split probability, trunk clear tiers (long bare trunks), and organic/geometric symmetry interpolation.
  - **Branch Dimensions:** Trunk base length, length decay ratio, length noise/variance, base radius, radius decay ratio (Murray's Law / Da Vinci branching), segment taper, min radius clamp, and radial polygon density.
  - **Branching Angles & Spatial Spread:** Divergence pitch angle (0–90°), angle jitter, golden-ratio azimuth spread (0–360°), azimuth noise, and pitch variance.
  - **Curvature, Gravitropism & Twist:** Gravitropism bending (positive for upright skyward trees, negative for cascading weeping willows), branch curve smoothness, gnarliness / organic wander, and trunk helical twist.
  - **Foliage & Canopy:** Instanced leaves (thousands rendered in a single draw call), configurable leaf start depth, leaves per tip cluster, cluster radius volume, leaf scaling with noise, droop angle, lushness density, and multiple leaf geometries (**Botanical Oval**, **Pine Needle**, **Sakura Blossom**, **Cloud Disc**, and **Low-Poly Quad**).
  - **Bark & Wood Shading:** Base trunk color to young tip gradient, PBR roughness and metalness, wireframe mode, and faceted/flat shading.
  - **Wind & Dynamic Motion:** Harmonic procedural wind sway with gust turbulence, oscillation frequency, and compass wind direction.
  - **Growth Simulation:** Interactive growth scrubber (from sprout to mature giant) and auto-playing growth cycle loop.
  - **Environment & Lighting:** Dynamic directional sun with real-time shadow maps, sun elevation and azimuth controls, ambient sky fill, atmospheric depth fog, pedestal radius, and reference grid.
- 🎨 **10 Curated Botanical Presets:**
  - *Ancient Oak* (stout, wide-spreading canopy, heavy gnarliness)
  - *Weeping Willow* (cascading negative gravitropism, slender drooping branches)
  - *Japanese Bonsai* (sculptural gnarled trunk, compact cloud foliage)
  - *Sakura (Cherry Blossom)* (graceful angles, vibrant petal pink foliage)
  - *Nordic Pine (Conifer)* (tall leader trunk, horizontal tiers, needle geometry)
  - *Baobab (Bottle Tree)* (enormous swollen trunk, compact upper crown)
  - *Golden Acacia (Savannah)* (flat umbrella canopy, tall bare trunk)
  - *Dead Winter Birch* (high gnarliness, pale silver bark, bare branches)
  - *Pythagorean Fractal* (strict mathematical symmetric bifurcation)
  - *Cyber Neon Tree* (geometric wireframe, glowing cyan/magenta canopy)
- 🧬 **Creative Tools:**
  - **🎲 New Seed:** Deterministic pseudo-random generation with instant seed randomization.
  - **🧬 Genetic Mutation:** Subtly perturbs current parameters by ±5–10% to discover novel organic variations.
  - **🎯 Focus Cam:** Intelligently reframes the camera around the tree's current height and bounding volume.
- 📦 **3D & 2D Asset Export:**
  - **Export .GLB:** Binary glTF format ready for direct import into **Godot**, Blender, Unity, or Three.js games.
  - **Export .OBJ:** Universal Wavefront 3D mesh format.
  - **Save High-Res PNG:** Crisp screenshot capture for generative art showcases.
  - **Save / Load Preset JSON:** Export and share complete tree configurations.

---

## 🛠️ Tech Stack

- **Runtime & Bundler:** [Vite](https://vitejs.dev/)
- **Core Language:** [TypeScript](https://www.typescriptlang.org/)
- **3D Graphics:** [Three.js](https://threejs.org/) (Single-draw-call buffer geometries, InstancedMesh foliage, PCF soft shadows)
- **UI Framework:** [Tweakpane](https://cocopon.github.io/tweakpane/)

---

## 💻 Getting Started

### Local Development

```bash
# Install dependencies
npm install

# Start Vite live-reload development server
npm run dev

# Build production bundle for deployment (outputs to /dist)
npm run build

# Preview production build locally
npm run preview
```

---

## 🎮 Navigation Controls

| Action | Control |
| --- | --- |
| **Orbit / Rotate Camera** | Left Click + Drag |
| **Pan Camera** | Right Click + Drag (or Shift + Left Click) |
| **Zoom In / Out** | Mouse Wheel / Pinch Gesture |
| **Adjust Parameters** | Drag any slider in the right-hand Workbench panel |

---

## 📜 License

MIT License.
