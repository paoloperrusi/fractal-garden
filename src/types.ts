export type LeafShape = 'quad' | 'oval' | 'needle' | 'blossom' | 'disc';

export interface TreeParameters {
  // === 1. Seed & Hierarchy ===
  seed: number;
  maxDepth: number;
  branchCount: number;
  branchProbability: number;
  startBranchDepth: number;
  symmetry: number;

  // === 2. Trunk & Dimensions ===
  trunkLength: number;
  lengthDecay: number;
  lengthVariance: number;
  trunkRadius: number;
  radiusDecay: number;
  taper: number;
  minRadius: number;
  radialSegments: number;

  // === 3. Angles & Spatial Distribution ===
  branchAngle: number;
  branchAngleVariance: number;
  azimuthSpread: number;
  azimuthVariance: number;
  pitchVariance: number;

  // === 4. Curvature, Gravitropism & Twist ===
  gravitropism: number;
  segmentsPerBranch: number;
  gnarliness: number;
  twist: number;

  // === 5. Foliage & Leaves ===
  leavesEnabled: boolean;
  leafStartDepth: number;
  leavesPerTip: number;
  leafClusterRadius: number;
  leafSize: number;
  leafSizeVariance: number;
  leafShape: LeafShape;
  leafColor: string;
  leafColorTip: string;
  leafColorVariation: number;
  leafGravity: number;
  leafDensity: number;

  // === 6. Bark & Shading ===
  barkColor: string;
  barkColorTip: string;
  barkRoughness: number;
  barkMetalness: number;
  wireframe: boolean;
  flatShading: boolean;

  // === 7. Wind & Motion ===
  windEnabled: boolean;
  windStrength: number;
  windSpeed: number;
  windTurbulence: number;
  windDirection: number;

  // === 8. Growth & Life Cycle ===
  growthProgress: number;
  growthAnimation: boolean;
  growthSpeed: number;

  // === 9. Environment & Lighting ===
  backgroundColor: string;
  groundEnabled: boolean;
  groundColor: string;
  groundRadius: number;
  gridEnabled: boolean;
  sunIntensity: number;
  sunElevation: number;
  sunAzimuth: number;
  ambientIntensity: number;
  shadows: boolean;
  fogEnabled: boolean;
  fogDensity: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
}

export interface TreeStats {
  branchCount: number;
  vertexCount: number;
  triangleCount: number;
  leafCount: number;
  height: number;
  maxRadius: number;
}
