import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TreeParameters } from '../types';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  // Tree container
  public treeGroup: THREE.Group;

  // Scene elements
  private groundMesh: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;

  // Time tracking
  private clock: THREE.Clock;
  private windTime: number = 0;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 10, 26);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Needed for crisp PNG export
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't flip below ground
    this.controls.minDistance = 2;
    this.controls.maxDistance = 150;
    this.controls.target.set(0, 6, 0);

    // Tree Group
    this.treeGroup = new THREE.Group();
    this.treeGroup.name = 'ProceduralTreeRoot';
    this.scene.add(this.treeGroup);

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x222233, 0.4);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 120;
    const shadowSize = 18;
    this.sunLight.shadow.camera.left = -shadowSize;
    this.sunLight.shadow.camera.right = shadowSize;
    this.sunLight.shadow.camera.top = shadowSize;
    this.sunLight.shadow.camera.bottom = -shadowSize;
    this.sunLight.shadow.bias = -0.0003;
    this.scene.add(this.sunLight);

    // Ground pedestal
    const groundGeo = new THREE.CylinderGeometry(14, 15, 0.6, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1d24,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.position.y = -0.3;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Grid helper
    this.gridHelper = new THREE.GridHelper(30, 30, 0x445566, 0x252a33);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    // Fog
    this.scene.fog = new THREE.FogExp2(0x0f1115, 0.007);

    // Responsive resize
    window.addEventListener('resize', () => this.onResize());
  }

  public updateEnvironment(params: TreeParameters): void {
    // Background color
    const bgColor = new THREE.Color(params.backgroundColor);
    this.scene.background = bgColor;

    // Fog
    if (params.fogEnabled) {
      this.scene.fog = new THREE.FogExp2(bgColor, params.fogDensity);
    } else {
      this.scene.fog = null;
    }

    // Ground
    this.groundMesh.visible = params.groundEnabled;
    (this.groundMesh.material as THREE.MeshStandardMaterial).color.set(params.groundColor);
    this.groundMesh.scale.set(params.groundRadius / 14, 1, params.groundRadius / 14);

    // Grid
    this.gridHelper.visible = params.gridEnabled;

    // Lights
    this.ambientLight.intensity = params.ambientIntensity;
    this.sunLight.intensity = params.sunIntensity;
    this.renderer.shadowMap.enabled = params.shadows;

    // Sun position from elevation & azimuth
    const eleRad = THREE.MathUtils.degToRad(params.sunElevation);
    const aziRad = THREE.MathUtils.degToRad(params.sunAzimuth);
    const sunDist = 30;
    this.sunLight.position.set(
      sunDist * Math.cos(eleRad) * Math.sin(aziRad),
      sunDist * Math.sin(eleRad),
      sunDist * Math.cos(eleRad) * Math.cos(aziRad)
    );

    // Orbit controls auto rotate
    this.controls.autoRotate = params.autoRotate;
    this.controls.autoRotateSpeed = params.autoRotateSpeed;
  }

  public setTreeMeshes(branchMesh: THREE.Mesh, leafMesh: THREE.InstancedMesh | null): void {
    // Clear old tree
    while (this.treeGroup.children.length > 0) {
      const child = this.treeGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      this.treeGroup.remove(child);
    }

    // Reset base transform
    this.treeGroup.position.set(0, 0, 0);
    this.treeGroup.rotation.set(0, 0, 0);

    this.treeGroup.add(branchMesh);
    if (leafMesh) {
      this.treeGroup.add(leafMesh);
    }
  }

  /**
   * Smoothly frame the camera to fit tree height
   */
  public frameTree(treeHeight: number): void {
    const targetY = Math.max(2, treeHeight * 0.45);
    this.controls.target.set(0, targetY, 0);
    const dist = Math.max(12, treeHeight * 1.8);
    this.camera.position.set(dist * 0.7, targetY + dist * 0.35, dist * 0.9);
    this.controls.update();
  }

  public update(params: TreeParameters): void {
    const dt = this.clock.getDelta();

    // Procedural wind animation
    if (params.windEnabled && params.windStrength > 0) {
      this.windTime += dt * params.windSpeed;
      const windDirRad = THREE.MathUtils.degToRad(params.windDirection);

      // Primary harmonic + high-frequency gust turbulence
      const primarySway = Math.sin(this.windTime * 1.5) * 0.03 * params.windStrength;
      const gustSway = Math.sin(this.windTime * 3.7 + 0.4) * 0.015 * params.windStrength * params.windTurbulence;
      const totalSway = primarySway + gustSway;

      const swayX = Math.sin(windDirRad) * totalSway;
      const swayZ = Math.cos(windDirRad) * totalSway;

      this.treeGroup.rotation.x = swayX;
      this.treeGroup.rotation.z = swayZ;
      this.treeGroup.rotation.y = Math.sin(this.windTime * 0.8) * 0.01 * params.windStrength;
    } else {
      this.treeGroup.rotation.set(0, 0, 0);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
