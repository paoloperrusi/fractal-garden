import { DEFAULT_PARAMETERS } from './generator/presets';
import { TreeParameters } from './types';
import { SceneManager } from './scene/sceneManager';
import { TreeGenerator } from './generator/treeGenerator';
import { ExportManager } from './exporters/exportManager';
import { TweakpaneUI } from './ui/tweakpaneUI';

class App {
  private params: TreeParameters;
  private sceneManager: SceneManager;
  private generator: TreeGenerator;
  private exportManager: ExportManager;
  private ui: TweakpaneUI;
  private lastStats: any = null;
  private rebuildQueued: boolean = false;
  private pendingFrameCam: boolean = false;

  constructor() {
    this.params = { ...DEFAULT_PARAMETERS };

    const container = document.getElementById('app') || document.body;
    this.sceneManager = new SceneManager(container);
    this.generator = new TreeGenerator();
    this.exportManager = new ExportManager();

    this.ui = new TweakpaneUI(this.params, {
      onChange: (key) => this.handleParamChange(key),
      onRandomizeSeed: () => this.randomizeSeed(),
      onMutate: () => this.mutateTree(),
      onReset: () => this.resetParams(),
      onFrameCamera: () => this.frameCamera(),
      onExportGLTF: () => this.exportGLTF(),
      onExportOBJ: () => this.exportOBJ(),
      onExportScreenshot: () => this.exportScreenshot(),
      onExportJSON: () => this.exportJSON(),
      onImportJSON: () => this.importJSON(),
    });

    // Initial environment and generation
    this.sceneManager.updateEnvironment(this.params);
    this.rebuildTree(true);

    // Animation loop
    this.animate();
  }

  private handleParamChange(key?: string): void {
    // Environmental parameters that don't need 3D geometry rebuild
    const envKeys = new Set([
      'backgroundColor', 'groundEnabled', 'groundColor', 'groundRadius',
      'gridEnabled', 'sunIntensity', 'sunElevation', 'sunAzimuth',
      'ambientIntensity', 'fogEnabled', 'fogDensity', 'autoRotate', 'autoRotateSpeed',
      'windEnabled', 'windStrength', 'windSpeed', 'windTurbulence', 'windDirection',
    ]);

    if (key && envKeys.has(key)) {
      this.sceneManager.updateEnvironment(this.params);
      return;
    }

    this.sceneManager.updateEnvironment(this.params);
    this.queueRebuild(false);
  }

  private queueRebuild(frameCam: boolean = false): void {
    if (frameCam) this.pendingFrameCam = true;
    if (this.rebuildQueued) return;
    this.rebuildQueued = true;
    requestAnimationFrame(() => {
      this.rebuildQueued = false;
      const shouldFrame = this.pendingFrameCam;
      this.pendingFrameCam = false;
      this.rebuildTree(shouldFrame);
    });
  }

  private rebuildTree(frameCam: boolean = false): void {
    const { branchMesh, leafMesh, stats } = this.generator.generate(this.params);
    this.sceneManager.setTreeMeshes(branchMesh, leafMesh);
    this.ui.updateStats(stats);
    this.lastStats = stats;

    if (frameCam) {
      this.sceneManager.frameTree(stats.height);
    }
  }

  private frameCamera(): void {
    if (this.lastStats) {
      this.sceneManager.frameTree(this.lastStats.height);
    }
  }

  private randomizeSeed(): void {
    this.params.seed = Math.floor(Math.random() * 999999);
    this.ui.refresh();
    this.queueRebuild(false);
  }

  /**
   * Subtle genetic mutation for creative variation
   */
  private mutateTree(): void {
    const jitter = (val: number, spread: number) => {
      const delta = (Math.random() * 2 - 1) * spread;
      return Number((val + delta).toFixed(3));
    };

    this.params.branchAngle = Math.max(5, Math.min(85, jitter(this.params.branchAngle, 4)));
    this.params.lengthDecay = Math.max(0.4, Math.min(0.92, jitter(this.params.lengthDecay, 0.04)));
    this.params.radiusDecay = Math.max(0.4, Math.min(0.9, jitter(this.params.radiusDecay, 0.03)));
    this.params.trunkLength = Math.max(2, Math.min(20, jitter(this.params.trunkLength, 0.8)));
    this.params.trunkRadius = Math.max(0.1, Math.min(2.0, jitter(this.params.trunkRadius, 0.06)));
    this.params.gnarliness = Math.max(0.0, Math.min(0.9, jitter(this.params.gnarliness, 0.06)));
    this.params.gravitropism = Math.max(-0.9, Math.min(0.9, jitter(this.params.gravitropism, 0.08)));

    if (Math.random() < 0.3) {
      this.params.seed = Math.floor(Math.random() * 999999);
    }

    this.ui.refresh();
    this.queueRebuild(false);
  }

  private resetParams(): void {
    Object.assign(this.params, DEFAULT_PARAMETERS);
    this.ui.refresh();
    this.sceneManager.updateEnvironment(this.params);
    this.queueRebuild(true);
  }

  private exportGLTF(): void {
    this.exportManager.exportGLTF(this.sceneManager.treeGroup, `tree_seed_${this.params.seed}.glb`);
  }

  private exportOBJ(): void {
    this.exportManager.exportOBJ(this.sceneManager.treeGroup, `tree_seed_${this.params.seed}.obj`);
  }

  private exportScreenshot(): void {
    this.exportManager.exportScreenshot(
      this.sceneManager.renderer,
      this.sceneManager.scene,
      this.sceneManager.camera,
      `fractal_tree_${this.params.seed}.png`
    );
  }

  private exportJSON(): void {
    this.exportManager.exportPresetJSON(this.params, `fractal_tree_preset_${this.params.seed}.json`);
  }

  private importJSON(): void {
    this.exportManager.importPresetJSON((loadedParams) => {
      Object.assign(this.params, loadedParams);
      this.ui.refresh();
      this.sceneManager.updateEnvironment(this.params);
      this.queueRebuild(true);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    // Dynamic Growth Loop
    if (this.params.growthAnimation) {
      this.params.growthProgress += 0.003 * this.params.growthSpeed;
      if (this.params.growthProgress > 1.0) {
        this.params.growthProgress = 0.05;
      }
      this.ui.refresh();
      this.queueRebuild(false);
    }

    this.sceneManager.update(this.params);
  };
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
