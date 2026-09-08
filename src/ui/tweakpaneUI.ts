import { Pane } from 'tweakpane';
import { TreeParameters, TreeStats } from '../types';
import { DEFAULT_PARAMETERS } from '../generator/presets';

export class TweakpaneUI {
  public pane: Pane;
  private isInternalUpdating: boolean = false;
  private statsDisplay: {
    branches: string;
    vertices: string;
    leaves: string;
    dimensions: string;
  };

  constructor(
    params: TreeParameters,
    callbacks: {
      onChange: (key?: string) => void;
      onRandomizeSeed: () => void;
      onMutate: () => void;
      onReset: () => void;
      onFrameCamera: () => void;
      onExportGLTF: () => void;
      onExportOBJ: () => void;
      onExportScreenshot: () => void;
      onExportJSON: () => void;
      onImportJSON: () => void;
    }
  ) {
    this.pane = new Pane({
      title: '🌲 FRACTAL TREE WORKBENCH',
      expanded: true,
    });

    // Stats monitor state
    this.statsDisplay = {
      branches: '0',
      vertices: '0',
      leaves: '0',
      dimensions: '0m x 0m',
    };

    // Quick Action Bar
    const actionFolder = this.pane.addFolder({ title: 'Quick Actions', expanded: true });

    const btnSeed = actionFolder.addButton({ title: '🎲 New Seed' });
    btnSeed.on('click', () => callbacks.onRandomizeSeed());

    const btnMutate = actionFolder.addButton({ title: '🧬 Mutate (5%)' });
    btnMutate.on('click', () => callbacks.onMutate());

    const btnFocus = actionFolder.addButton({ title: '🎯 Focus Cam (MMB)' });
    btnFocus.on('click', () => callbacks.onFrameCamera());

    const btnReset = actionFolder.addButton({ title: '↺ Reset to Default' });
    btnReset.on('click', () => callbacks.onReset());


    // Main Tabbed Navigation
    const tabs = this.pane.addTab({
      pages: [
        { title: 'Tree Form' },
        { title: 'Angles & Curve' },
        { title: 'Foliage' },
        { title: 'Bark & Light' },
        { title: 'Simulation' },
        { title: 'Export' },
      ],
    });

    // ==========================================
    // PAGE 1: TREE FORM (DIMENSIONS & STRUCTURE)
    // ==========================================
    const pageStructure = tabs.pages[0];

    const fHierarchy = pageStructure.addFolder({ title: 'Topology & Recursion', expanded: true });
    fHierarchy.addBinding(params, 'seed', { label: 'Seed', min: 0, max: 999999, step: 1 });
    fHierarchy.addBinding(params, 'maxDepth', { label: 'Max Depth', min: 1, max: 9, step: 1 });
    fHierarchy.addBinding(params, 'branchCount', { label: 'Splits/Node', min: 1, max: 5, step: 1 });
    fHierarchy.addBinding(params, 'branchProbability', { label: 'Split Chance', min: 0.1, max: 1.0, step: 0.02 });
    fHierarchy.addBinding(params, 'startBranchDepth', { label: 'Trunk Clear Tier', min: 1, max: 5, step: 1 });
    fHierarchy.addBinding(params, 'symmetry', { label: 'Symmetry', min: 0.0, max: 1.0, step: 0.01 });

    const fDims = pageStructure.addFolder({ title: 'Branch Dimensions', expanded: true });
    fDims.addBinding(params, 'trunkLength', { label: 'Base Length', min: 1.0, max: 25.0, step: 0.2 });
    fDims.addBinding(params, 'lengthDecay', { label: 'Length Decay', min: 0.35, max: 0.95, step: 0.01 });
    fDims.addBinding(params, 'lengthVariance', { label: 'Length Noise', min: 0.0, max: 0.8, step: 0.01 });
    fDims.addBinding(params, 'trunkRadius', { label: 'Base Radius', min: 0.05, max: 2.5, step: 0.02 });
    fDims.addBinding(params, 'radiusDecay', { label: 'Radius Decay', min: 0.35, max: 0.95, step: 0.01 });
    fDims.addBinding(params, 'taper', { label: 'Segment Taper', min: 0.0, max: 1.0, step: 0.01 });
    fDims.addBinding(params, 'minRadius', { label: 'Min Radius', min: 0.002, max: 0.1, step: 0.001 });
    fDims.addBinding(params, 'radialSegments', { label: 'Radial Polys', min: 3, max: 16, step: 1 });

    // ==========================================
    // PAGE 2: ANGLES & CURVES
    // ==========================================
    const pageAngles = tabs.pages[1];

    const fAngles = pageAngles.addFolder({ title: 'Branching Angles', expanded: true });
    fAngles.addBinding(params, 'branchAngle', { label: 'Branch Angle (°)', min: 0, max: 90, step: 0.5 });
    fAngles.addBinding(params, 'branchAngleVariance', { label: 'Angle Noise (°)', min: 0, max: 45, step: 0.5 });
    fAngles.addBinding(params, 'azimuthSpread', { label: 'Azimuth Spread (°)', min: 0, max: 360, step: 0.5 });
    fAngles.addBinding(params, 'azimuthVariance', { label: 'Azimuth Noise (°)', min: 0, max: 180, step: 1 });
    fAngles.addBinding(params, 'pitchVariance', { label: 'Pitch Noise (°)', min: 0, max: 45, step: 0.5 });

    const fCurve = pageAngles.addFolder({ title: 'Curvature & Gravitropism', expanded: true });
    fCurve.addBinding(params, 'gravitropism', { label: 'Gravitropism (±)', min: -1.0, max: 1.0, step: 0.01 });
    fCurve.addBinding(params, 'segmentsPerBranch', { label: 'Curve Smoothness', min: 1, max: 6, step: 1 });
    fCurve.addBinding(params, 'gnarliness', { label: 'Gnarliness / Wander', min: 0.0, max: 1.0, step: 0.01 });
    fCurve.addBinding(params, 'twist', { label: 'Trunk Twist (°)', min: -180, max: 180, step: 1 });

    // ==========================================
    // PAGE 3: FOLIAGE & CANOPY
    // ==========================================
    const pageFoliage = tabs.pages[2];

    const fLeaves = pageFoliage.addFolder({ title: 'Leaf Generation', expanded: true });
    fLeaves.addBinding(params, 'leavesEnabled', { label: 'Enable Canopy' });
    fLeaves.addBinding(params, 'leafStartDepth', { label: 'Start Depth', min: 1, max: 8, step: 1 });
    fLeaves.addBinding(params, 'leavesPerTip', { label: 'Leaves Per Tip', min: 1, max: 25, step: 1 });
    fLeaves.addBinding(params, 'leafClusterRadius', { label: 'Cluster Radius', min: 0.1, max: 3.0, step: 0.05 });
    fLeaves.addBinding(params, 'leafSize', { label: 'Leaf Scale', min: 0.05, max: 2.0, step: 0.01 });
    fLeaves.addBinding(params, 'leafSizeVariance', { label: 'Scale Noise', min: 0.0, max: 1.0, step: 0.01 });
    fLeaves.addBinding(params, 'leafDensity', { label: 'Lushness / Density', min: 0.1, max: 1.0, step: 0.02 });
    fLeaves.addBinding(params, 'leafGravity', { label: 'Leaf Droop', min: -1.0, max: 1.0, step: 0.02 });

    const fLeafStyle = pageFoliage.addFolder({ title: 'Leaf Styling & Color', expanded: true });
    fLeafStyle.addBinding(params, 'leafShape', {
      label: 'Shape',
      options: {
        'Botanical Oval': 'oval',
        'Pine Needle': 'needle',
        'Sakura Blossom': 'blossom',
        'Foliage Cloud Disc': 'disc',
        'Low-Poly Quad': 'quad',
      },
    });
    fLeafStyle.addBinding(params, 'leafColor', { label: 'Base Color' });
    fLeafStyle.addBinding(params, 'leafColorTip', { label: 'Young Tip Color' });
    fLeafStyle.addBinding(params, 'leafColorVariation', { label: 'Color Jitter', min: 0.0, max: 1.0, step: 0.01 });

    // ==========================================
    // PAGE 4: BARK & LIGHTING
    // ==========================================
    const pageBark = tabs.pages[3];

    const fBark = pageBark.addFolder({ title: 'Bark & Wood', expanded: true });
    fBark.addBinding(params, 'barkColor', { label: 'Trunk Color' });
    fBark.addBinding(params, 'barkColorTip', { label: 'Tip Branch Color' });
    fBark.addBinding(params, 'barkRoughness', { label: 'Roughness', min: 0.0, max: 1.0, step: 0.01 });
    fBark.addBinding(params, 'barkMetalness', { label: 'Metalness', min: 0.0, max: 1.0, step: 0.01 });
    fBark.addBinding(params, 'wireframe', { label: 'Wireframe' });
    fBark.addBinding(params, 'flatShading', { label: 'Faceted Shading' });

    const fEnv = pageBark.addFolder({ title: 'Environment & Light', expanded: true });
    fEnv.addBinding(params, 'backgroundColor', { label: 'Sky Backdrop' });
    fEnv.addBinding(params, 'groundEnabled', { label: 'Ground Pedestal' });
    fEnv.addBinding(params, 'groundColor', { label: 'Pedestal Color' });
    fEnv.addBinding(params, 'groundRadius', { label: 'Pedestal Radius', min: 2.0, max: 30.0, step: 0.5 });
    fEnv.addBinding(params, 'gridEnabled', { label: 'Reference Grid' });
    fEnv.addBinding(params, 'sunIntensity', { label: 'Sun Intensity', min: 0.0, max: 5.0, step: 0.1 });
    fEnv.addBinding(params, 'sunElevation', { label: 'Sun Elevation (°)', min: 5, max: 85, step: 1 });
    fEnv.addBinding(params, 'sunAzimuth', { label: 'Sun Azimuth (°)', min: 0, max: 360, step: 1 });
    fEnv.addBinding(params, 'ambientIntensity', { label: 'Sky Ambient', min: 0.0, max: 2.0, step: 0.05 });
    fEnv.addBinding(params, 'shadows', { label: 'Cast Shadows' });
    fEnv.addBinding(params, 'fogEnabled', { label: 'Depth Fog' });
    fEnv.addBinding(params, 'fogDensity', { label: 'Fog Density', min: 0.001, max: 0.04, step: 0.001 });

    // ==========================================
    // PAGE 5: SIMULATION (WIND & GROWTH)
    // ==========================================
    const pageSim = tabs.pages[4];

    const fGrowth = pageSim.addFolder({ title: 'Growth Timeline', expanded: true });
    fGrowth.addBinding(params, 'growthProgress', { label: 'Growth Stage', min: 0.0, max: 1.0, step: 0.01 });
    fGrowth.addBinding(params, 'growthAnimation', { label: 'Loop Growth Cycle' });
    fGrowth.addBinding(params, 'growthSpeed', { label: 'Cycle Speed', min: 0.05, max: 1.0, step: 0.01 });

    const fWind = pageSim.addFolder({ title: 'Wind Sway Simulation', expanded: true });
    fWind.addBinding(params, 'windEnabled', { label: 'Enable Wind' });
    fWind.addBinding(params, 'windStrength', { label: 'Force / Magnitude', min: 0.0, max: 1.5, step: 0.01 });
    fWind.addBinding(params, 'windSpeed', { label: 'Oscillation Speed', min: 0.1, max: 5.0, step: 0.1 });
    fWind.addBinding(params, 'windTurbulence', { label: 'Gust Turbulence', min: 0.0, max: 2.0, step: 0.05 });
    fWind.addBinding(params, 'windDirection', { label: 'Direction (°)', min: 0, max: 360, step: 1 });

    const fCamera = pageSim.addFolder({ title: 'Cinematics', expanded: true });
    fCamera.addBinding(params, 'autoRotate', { label: 'Turntable Spin' });
    fCamera.addBinding(params, 'autoRotateSpeed', { label: 'Spin Velocity', min: -10.0, max: 10.0, step: 0.2 });

    // ==========================================
    // PAGE 6: EXPORT
    // ==========================================
    const pageExport = tabs.pages[5];

    const f3D = pageExport.addFolder({ title: '3D Geometry Export', expanded: true });
    const gltfBtn = f3D.addButton({ title: '📦 Export .GLB (Godot / Blender)' });
    gltfBtn.on('click', () => callbacks.onExportGLTF());

    const objBtn = f3D.addButton({ title: '📐 Export .OBJ (Wavefront Mesh)' });
    objBtn.on('click', () => callbacks.onExportOBJ());

    const fMedia = pageExport.addFolder({ title: '2D & Presets', expanded: true });
    const pngBtn = fMedia.addButton({ title: '📸 Save High-Res PNG' });
    pngBtn.on('click', () => callbacks.onExportScreenshot());

    const expJsonBtn = fMedia.addButton({ title: '💾 Export Preset (JSON)' });
    expJsonBtn.on('click', () => callbacks.onExportJSON());

    const impJsonBtn = fMedia.addButton({ title: '📂 Import Preset (JSON)' });
    impJsonBtn.on('click', () => callbacks.onImportJSON());

    // ==========================================
    // LIVE STATS MONITOR
    // ==========================================
    const fStats = this.pane.addFolder({ title: 'Geometry Telemetry', expanded: true });
    fStats.addBinding(this.statsDisplay, 'branches', { label: 'Segments', readonly: true });
    fStats.addBinding(this.statsDisplay, 'vertices', { label: 'Vertices', readonly: true });
    fStats.addBinding(this.statsDisplay, 'leaves', { label: 'Leaves', readonly: true });
    fStats.addBinding(this.statsDisplay, 'dimensions', { label: 'Height x Radius', readonly: true });

    // Live Change listener for ANY slider or parameter in the entire UI
    this.pane.on('change', (ev: any) => {
      if (this.isInternalUpdating) return;
      const targetKey = ev.target?.key;
      // CRITICAL: Only trigger changes for actual tree/environment parameters!
      // This prevents telemetry (branches, vertices, leaves, dimensions) or UI internal state from looping.
      if (!targetKey || targetKey === 'preset' || !(targetKey in params)) return;
      callbacks.onChange(targetKey);
    });
  }

  public updateStats(stats: TreeStats): void {
    this.statsDisplay.branches = stats.branchCount.toLocaleString();
    this.statsDisplay.vertices = `${stats.vertexCount.toLocaleString()} (${stats.triangleCount.toLocaleString()} tris)`;
    this.statsDisplay.leaves = stats.leafCount.toLocaleString();
    this.statsDisplay.dimensions = `${stats.height}m high × ${stats.maxRadius * 2}m wide`;
    this.isInternalUpdating = true;
    this.pane.refresh();
    this.isInternalUpdating = false;
  }

  public refresh(): void {
    this.isInternalUpdating = true;
    this.pane.refresh();
    this.isInternalUpdating = false;
  }
}

