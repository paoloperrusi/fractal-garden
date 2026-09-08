import { TreeParameters } from '../types';

export const DEFAULT_PARAMETERS: TreeParameters = {
  // Seed & Hierarchy
  seed: 42,
  maxDepth: 6,
  branchCount: 3,
  branchProbability: 0.95,
  startBranchDepth: 1,
  symmetry: 0.25,

  // Trunk & Dimensions
  trunkLength: 8.0,
  lengthDecay: 0.72,
  lengthVariance: 0.18,
  trunkRadius: 0.55,
  radiusDecay: 0.65,
  taper: 0.25,
  minRadius: 0.015,
  radialSegments: 6,

  // Angles & Spatial Distribution
  branchAngle: 32,
  branchAngleVariance: 8,
  azimuthSpread: 137.5, // Golden angle
  azimuthVariance: 20,
  pitchVariance: 6,

  // Curvature & Gravitropism
  gravitropism: 0.18,
  segmentsPerBranch: 4,
  gnarliness: 0.22,
  twist: 12,

  // Foliage
  leavesEnabled: true,
  leafStartDepth: 4,
  leavesPerTip: 6,
  leafClusterRadius: 0.7,
  leafSize: 0.38,
  leafSizeVariance: 0.35,
  leafShape: 'oval',
  leafColor: '#2e6b36',
  leafColorTip: '#6ba847',
  leafColorVariation: 0.25,
  leafGravity: -0.2,
  leafDensity: 0.95,

  // Bark & Shading
  barkColor: '#432f21',
  barkColorTip: '#73573f',
  barkRoughness: 0.88,
  barkMetalness: 0.02,
  wireframe: false,
  flatShading: false,

  // Wind
  windEnabled: true,
  windStrength: 0.25,
  windSpeed: 1.2,
  windTurbulence: 0.45,
  windDirection: 45,

  // Growth
  growthProgress: 1.0,
  growthAnimation: false,
  growthSpeed: 0.25,

  // Environment
  backgroundColor: '#0f1115',
  groundEnabled: true,
  groundColor: '#1a1d24',
  groundRadius: 14.0,
  gridEnabled: true,
  sunIntensity: 2.2,
  sunElevation: 48,
  sunAzimuth: 65,
  ambientIntensity: 0.65,
  shadows: true,
  fogEnabled: true,
  fogDensity: 0.007,
  autoRotate: false,
  autoRotateSpeed: 1.0,
};

