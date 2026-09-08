import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { TreeParameters } from '../types';

export class ExportManager {
  private gltfExporter: GLTFExporter = new GLTFExporter();
  private objExporter: OBJExporter = new OBJExporter();

  /**
   * Export the 3D tree as a binary .glb file
   */
  public exportGLTF(treeGroup: THREE.Group, filename: string = 'fractal_tree.glb'): void {
    // Clone tree without wind rotation
    const exportGroup = treeGroup.clone(true);
    exportGroup.position.set(0, 0, 0);
    exportGroup.rotation.set(0, 0, 0);

    this.gltfExporter.parse(
      exportGroup,
      (gltf) => {
        if (gltf instanceof ArrayBuffer) {
          this.downloadBlob(new Blob([gltf], { type: 'application/octet-stream' }), filename);
        } else {
          const output = JSON.stringify(gltf, null, 2);
          this.downloadBlob(new Blob([output], { type: 'application/json' }), filename.replace('.glb', '.gltf'));
        }
      },
      (error) => {
        console.error('Error exporting GLTF:', error);
      },
      { binary: true }
    );
  }

  /**
   * Export the 3D tree as an .obj file
   */
  public exportOBJ(treeGroup: THREE.Group, filename: string = 'fractal_tree.obj'): void {
    const exportGroup = treeGroup.clone(true);
    exportGroup.position.set(0, 0, 0);
    exportGroup.rotation.set(0, 0, 0);

    const result = this.objExporter.parse(exportGroup);
    this.downloadBlob(new Blob([result], { type: 'text/plain' }), filename);
  }

  /**
   * Capture high-res screenshot
   */
  public exportScreenshot(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, filename: string = 'fractal_tree.png'): void {
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  /**
   * Export current parameters as JSON file
   */
  public exportPresetJSON(params: TreeParameters, filename: string = 'tree_preset.json'): void {
    const jsonStr = JSON.stringify(params, null, 2);
    this.downloadBlob(new Blob([jsonStr], { type: 'application/json' }), filename);
  }

  /**
   * Trigger file picker to load JSON preset
   */
  public importPresetJSON(onLoaded: (params: Partial<TreeParameters>) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          onLoaded(parsed);
        } catch (err) {
          alert('Invalid JSON preset file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
