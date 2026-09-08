import * as THREE from 'three';
import { TreeParameters, TreeStats, LeafShape } from '../types';
import { PRNG } from '../math/prng';

interface SegmentData {
  start: THREE.Vector3;
  end: THREE.Vector3;
  rStart: number;
  rEnd: number;
  depth: number;
  progressFrac: number;
  direction: THREE.Vector3;
}

interface LeafData {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  scale: number;
  depth: number;
  color: THREE.Color;
}

interface LeafTemplate {
  offset: THREE.Vector3;
  direction: THREE.Vector3;
  fullScale: number;
  color: THREE.Color;
}

interface TreeNode {
  depth: number;
  direction: THREE.Vector3;
  fullLength: number;
  fullRadius: number;
  taper: number;
  twist: number;
  segmentCount: number;
  wanderOffsets: THREE.Vector3[];
  growthStart: number;
  growthEnd: number;
  leaves: LeafTemplate[];
  children: TreeNode[];
}

export class TreeGenerator {
  private prng: PRNG = new PRNG();
  private cachedSkeleton: TreeNode | null = null;
  private cachedSkeletonKey: string = '';

  private getSkeletonKey(params: TreeParameters): string {
    return [
      params.seed,
      params.maxDepth,
      params.branchCount,
      params.branchProbability,
      params.startBranchDepth,
      params.symmetry,
      params.trunkLength,
      params.lengthDecay,
      params.lengthVariance,
      params.trunkRadius,
      params.radiusDecay,
      params.taper,
      params.minRadius,
      params.radialSegments,
      params.branchAngle,
      params.branchAngleVariance,
      params.azimuthSpread,
      params.azimuthVariance,
      params.pitchVariance,
      params.gravitropism,
      params.segmentsPerBranch,
      params.gnarliness,
      params.twist,
      params.leavesEnabled,
      params.leafStartDepth,
      params.leavesPerTip,
      params.leafClusterRadius,
      params.leafSize,
      params.leafSizeVariance,
      params.leafShape,
      params.leafColor,
      params.leafColorTip,
      params.leafColorVariation,
      params.leafGravity,
      params.leafDensity,
    ].join('|');
  }

  /**
   * Generates the entire 3D tree (branch mesh + leaf instanced mesh)
   */
  public generate(params: TreeParameters): {
    branchMesh: THREE.Mesh;
    leafMesh: THREE.InstancedMesh | null;
    stats: TreeStats;
  } {
    // 1. Maintain deterministic skeleton decoupled from growthProgress
    const skeletonKey = this.getSkeletonKey(params);
    if (!this.cachedSkeleton || this.cachedSkeletonKey !== skeletonKey) {
      this.cachedSkeletonKey = skeletonKey;
      this.cachedSkeleton = this.buildSkeleton(params);
    }

    // 2. Evaluate segments & leaves continuously for current growthProgress
    const segments: SegmentData[] = [];
    const leaves: LeafData[] = [];

    const clampedGrowth = THREE.MathUtils.clamp(params.growthProgress, 0.0, 1.0);
    this.evaluateGrowth(this.cachedSkeleton, new THREE.Vector3(0, 0, 0), clampedGrowth, params, segments, leaves);

    // Build branch mesh
    const { branchGeometry, branchMaterial } = this.buildBranchGeometry(segments, params);
    const branchMesh = new THREE.Mesh(branchGeometry, branchMaterial);
    branchMesh.castShadow = params.shadows;
    branchMesh.receiveShadow = params.shadows;
    branchMesh.name = 'TreeBranches';

    // Build leaf mesh if enabled
    let leafMesh: THREE.InstancedMesh | null = null;
    if (params.leavesEnabled && leaves.length > 0) {
      leafMesh = this.buildLeafMesh(leaves, params);
      if (leafMesh) {
        leafMesh.castShadow = params.shadows;
        leafMesh.receiveShadow = params.shadows;
        leafMesh.name = 'TreeLeaves';
      }
    }

    // Compute bounding statistics
    branchGeometry.computeBoundingBox();
    const bbox = branchGeometry.boundingBox || new THREE.Box3();
    const height = Math.max(0.1, bbox.max.y - bbox.min.y);
    const maxRadius = Math.max(
      Math.abs(bbox.max.x), Math.abs(bbox.min.x),
      Math.abs(bbox.max.z), Math.abs(bbox.min.z)
    );

    const stats: TreeStats = {
      branchCount: segments.length,
      vertexCount: branchGeometry.attributes.position.count + (leafMesh ? leaves.length * 4 : 0),
      triangleCount: (branchGeometry.index ? branchGeometry.index.count / 3 : 0) + (leafMesh ? leaves.length * 2 : 0),
      leafCount: leaves.length,
      height: Number(height.toFixed(2)),
      maxRadius: Number(maxRadius.toFixed(2)),
    };

    return { branchMesh, leafMesh, stats };
  }

  /**
   * Deterministically builds the full tree skeleton independent of growthProgress
   */
  private buildSkeleton(params: TreeParameters): TreeNode {
    this.prng.setSeed(params.seed);
    const totalStages = Math.max(1, params.maxDepth + 1);

    const buildNode = (
      length: number,
      radius: number,
      dir: THREE.Vector3,
      depth: number
    ): TreeNode => {
      const actualLength = length * (1.0 - params.lengthVariance * (1.0 - params.symmetry) * (this.prng.next() * 2 - 1));
      const actualRadius = Math.max(params.minRadius, radius);
      const segmentCount = Math.max(1, Math.min(6, params.segmentsPerBranch));

      const wanderOffsets: THREE.Vector3[] = [];
      for (let s = 0; s < segmentCount; s++) {
        if (params.gnarliness > 0 && params.symmetry < 1.0) {
          const organicFactor = (1.0 - params.symmetry) * params.gnarliness * 0.25;
          wanderOffsets.push(new THREE.Vector3(
            this.prng.spread(0, organicFactor),
            this.prng.spread(0, organicFactor * 0.5),
            this.prng.spread(0, organicFactor)
          ));
        } else {
          wanderOffsets.push(new THREE.Vector3(0, 0, 0));
        }
      }

      // Precompute leaves
      const leaves: LeafTemplate[] = [];
      const isTerminal = depth >= params.maxDepth - 1;
      if (params.leavesEnabled && depth >= params.leafStartDepth) {
        if (this.prng.next() <= params.leafDensity) {
          const count = isTerminal ? params.leavesPerTip : Math.max(1, Math.floor(params.leavesPerTip * 0.4));
          const baseColor = new THREE.Color(params.leafColor);
          const tipColor = new THREE.Color(params.leafColorTip);

          for (let i = 0; i < count; i++) {
            const r = params.leafClusterRadius * Math.cbrt(this.prng.next());
            const theta = this.prng.next() * Math.PI * 2;
            const phi = Math.acos(this.prng.range(-1, 1));
            const offset = new THREE.Vector3(
              r * Math.sin(phi) * Math.cos(theta),
              r * Math.sin(phi) * Math.sin(theta),
              r * Math.cos(phi)
            );
            const leafDir = offset.clone().normalize();
            if (leafDir.lengthSq() < 0.001) leafDir.copy(dir);
            leafDir.addScaledVector(new THREE.Vector3(0, params.leafGravity, 0), 0.6).normalize();

            const sizeVar = (1.0 - params.leafSizeVariance * 0.5) + this.prng.next() * params.leafSizeVariance;
            const scale = Math.max(0.02, params.leafSize * sizeVar);

            const mixFrac = THREE.MathUtils.clamp((depth / params.maxDepth) + this.prng.spread(0, params.leafColorVariation * 0.5), 0, 1);
            const leafColor = baseColor.clone().lerp(tipColor, mixFrac);
            if (params.leafColorVariation > 0) {
              const hsl = { h: 0, s: 0, l: 0 };
              leafColor.getHSL(hsl);
              hsl.h += this.prng.spread(0, params.leafColorVariation * 0.08);
              hsl.l += this.prng.spread(0, params.leafColorVariation * 0.12);
              leafColor.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s, 0, 1), THREE.MathUtils.clamp(hsl.l, 0, 1));
            }
            leaves.push({ offset, direction: leafDir, fullScale: scale, color: leafColor });
          }
        }
      }

      // Growth timeline window for this depth stage
      const growthStart = depth / (totalStages + 0.15);
      const growthEnd = (depth + 1.0) / (totalStages + 0.15);

      // Precompute children
      const children: TreeNode[] = [];
      if (depth < params.maxDepth) {
        if (depth < params.startBranchDepth) {
          const childLength = length * params.lengthDecay;
          const childRadius = actualRadius * (1.0 - params.taper) * params.radiusDecay;
          children.push(buildNode(childLength, childRadius, dir.clone(), depth + 1));
        } else {
          const branchCount = Math.max(1, params.branchCount);
          const angleRad = THREE.MathUtils.degToRad(params.branchAngle);
          const angleVarRad = THREE.MathUtils.degToRad(params.branchAngleVariance * (1.0 - params.symmetry));
          const azimuthStep = THREE.MathUtils.degToRad(params.azimuthSpread);
          const azimuthVarRad = THREE.MathUtils.degToRad(params.azimuthVariance * (1.0 - params.symmetry));

          const refUp = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
          const perpAxis = new THREE.Vector3().crossVectors(dir, refUp).normalize();

          for (let b = 0; b < branchCount; b++) {
            if (depth > 0 && this.prng.next() > params.branchProbability) continue;

            const childDir = dir.clone();
            const branchPitch = angleRad + this.prng.spread(0, angleVarRad);
            const pitchAxis = perpAxis.clone().applyAxisAngle(dir, b * (Math.PI * 2 / branchCount));
            childDir.applyAxisAngle(pitchAxis, branchPitch);

            const baseAzimuth = b * azimuthStep;
            const azimuthJitter = this.prng.spread(0, azimuthVarRad);
            childDir.applyAxisAngle(dir, baseAzimuth + azimuthJitter);
            childDir.normalize();

            const childLength = length * params.lengthDecay;
            const childRadius = actualRadius * (1.0 - params.taper) * params.radiusDecay;
            children.push(buildNode(childLength, childRadius, childDir, depth + 1));
          }
        }
      }

      return {
        depth,
        direction: dir.clone().normalize(),
        fullLength: actualLength,
        fullRadius: actualRadius,
        taper: params.taper,
        twist: params.twist,
        segmentCount,
        wanderOffsets,
        growthStart,
        growthEnd,
        leaves,
        children,
      };
    };

    return buildNode(params.trunkLength, params.trunkRadius, new THREE.Vector3(0, 1, 0), 0);
  }

  /**
   * Evaluates branch segments and foliage smoothly along the growth timeline
   */
  private evaluateGrowth(
    node: TreeNode,
    startPos: THREE.Vector3,
    growthProgress: number,
    params: TreeParameters,
    segments: SegmentData[],
    leaves: LeafData[]
  ): void {
    if (growthProgress <= node.growthStart) return;

    const easeT = growthProgress >= node.growthEnd
      ? 1.0
      : THREE.MathUtils.smoothstep((growthProgress - node.growthStart) / (node.growthEnd - node.growthStart), 0, 1);

    const branchLen = node.fullLength * easeT;
    if (branchLen <= 0.001) return;

    const branchRadius = node.fullRadius * Math.max(0.15, Math.sqrt(easeT));
    const stepLen = branchLen / node.segmentCount;
    const taperFactor = 1.0 - (node.taper / node.segmentCount);

    let curPos = startPos.clone();
    let curDir = node.direction.clone();
    let curRadius = branchRadius;

    for (let s = 0; s < node.segmentCount; s++) {
      const nextRadius = Math.max(params.minRadius, curRadius * taperFactor);

      if (params.gravitropism !== 0) {
        const gravityDir = new THREE.Vector3(0, params.gravitropism > 0 ? 1 : -1, 0);
        const gravityStrength = Math.abs(params.gravitropism) * 0.12 * (node.depth + 1);
        curDir.addScaledVector(gravityDir, gravityStrength).normalize();
      }

      if (node.wanderOffsets[s] && node.wanderOffsets[s].lengthSq() > 0) {
        curDir.add(node.wanderOffsets[s]).normalize();
      }

      if (node.twist !== 0) {
        const twistRad = THREE.MathUtils.degToRad((node.twist / node.segmentCount) * (1.0 - node.depth / params.maxDepth));
        curDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), twistRad).normalize();
      }

      const nextPos = curPos.clone().addScaledVector(curDir, stepLen);
      const segmentProgress = (node.depth + (s / node.segmentCount)) / (params.maxDepth + 1);

      segments.push({
        start: curPos.clone(),
        end: nextPos.clone(),
        rStart: curRadius,
        rEnd: nextRadius,
        depth: node.depth,
        progressFrac: segmentProgress,
        direction: curDir.clone(),
      });

      curPos = nextPos;
      curRadius = nextRadius;
    }

    // Children begin smoothly once this node is mature
    if (growthProgress >= node.growthEnd) {
      for (const child of node.children) {
        this.evaluateGrowth(child, curPos, growthProgress, params, segments, leaves);
      }
    }

    // Foliage buds and smoothly scales up at branch maturity
    if (node.leaves.length > 0) {
      const leafStart = node.growthEnd * 0.85;
      const leafEnd = Math.min(1.0, node.growthEnd * 1.15);
      if (growthProgress >= leafStart) {
        const leafT = THREE.MathUtils.clamp((growthProgress - leafStart) / (leafEnd - leafStart), 0, 1);
        const leafEase = THREE.MathUtils.smoothstep(leafT, 0, 1);
        if (leafEase > 0.01) {
          for (const leaf of node.leaves) {
            leaves.push({
              position: curPos.clone().addScaledVector(leaf.offset, leafEase),
              direction: leaf.direction,
              scale: leaf.fullScale * leafEase,
              depth: node.depth,
              color: leaf.color,
            });
          }
        }
      }
    }
  }

  /**
   * Assembles unified branch geometry in a single draw call
   */
  private buildBranchGeometry(
    segments: SegmentData[],
    params: TreeParameters
  ): { branchGeometry: THREE.BufferGeometry; branchMaterial: THREE.Material } {
    const radialSegs = Math.max(3, Math.min(16, params.radialSegments));
    const vertexCount = segments.length * (radialSegs + 1) * 2;
    const indexCount = segments.length * radialSegs * 6;

    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const indices = new Uint32Array(indexCount);

    const baseBarkColor = new THREE.Color(params.barkColor);
    const tipBarkColor = new THREE.Color(params.barkColorTip);

    let vOffset = 0;
    let iOffset = 0;

    const ringAngles: number[] = [];
    for (let j = 0; j <= radialSegs; j++) {
      ringAngles.push((j / radialSegs) * Math.PI * 2);
    }

    const tempDir = new THREE.Vector3();
    const tempUp = new THREE.Vector3();
    const tempU = new THREE.Vector3();
    const tempV = new THREE.Vector3();

    for (let s = 0; s < segments.length; s++) {
      const seg = segments[s];
      tempDir.copy(seg.direction).normalize();

      // Form orthonormal basis around segment direction
      if (Math.abs(tempDir.y) < 0.95) {
        tempUp.set(0, 1, 0);
      } else {
        tempUp.set(1, 0, 0);
      }
      tempU.crossVectors(tempDir, tempUp).normalize();
      tempV.crossVectors(tempDir, tempU).normalize();

      // Interpolate bark color based on depth and progress
      const colorFrac = THREE.MathUtils.clamp(seg.progressFrac * 1.3, 0, 1);
      const segColor = baseBarkColor.clone().lerp(tipBarkColor, colorFrac);

      const baseVIndex = vOffset;

      // Bottom ring and Top ring of the cylinder segment
      for (let j = 0; j <= radialSegs; j++) {
        const angle = ringAngles[j];
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Ring radial vector
        const radialX = tempU.x * cosA + tempV.x * sinA;
        const radialY = tempU.y * cosA + tempV.y * sinA;
        const radialZ = tempU.z * cosA + tempV.z * sinA;

        // Bottom vertex
        const bx = seg.start.x + radialX * seg.rStart;
        const by = seg.start.y + radialY * seg.rStart;
        const bz = seg.start.z + radialZ * seg.rStart;

        positions[vOffset * 3] = bx;
        positions[vOffset * 3 + 1] = by;
        positions[vOffset * 3 + 2] = bz;

        normals[vOffset * 3] = radialX;
        normals[vOffset * 3 + 1] = radialY;
        normals[vOffset * 3 + 2] = radialZ;

        colors[vOffset * 3] = segColor.r;
        colors[vOffset * 3 + 1] = segColor.g;
        colors[vOffset * 3 + 2] = segColor.b;

        uvs[vOffset * 2] = j / radialSegs;
        uvs[vOffset * 2 + 1] = 0;
        vOffset++;

        // Top vertex
        const tx = seg.end.x + radialX * seg.rEnd;
        const ty = seg.end.y + radialY * seg.rEnd;
        const tz = seg.end.z + radialZ * seg.rEnd;

        positions[vOffset * 3] = tx;
        positions[vOffset * 3 + 1] = ty;
        positions[vOffset * 3 + 2] = tz;

        normals[vOffset * 3] = radialX;
        normals[vOffset * 3 + 1] = radialY;
        normals[vOffset * 3 + 2] = radialZ;

        colors[vOffset * 3] = segColor.r;
        colors[vOffset * 3 + 1] = segColor.g;
        colors[vOffset * 3 + 2] = segColor.b;

        uvs[vOffset * 2] = j / radialSegs;
        uvs[vOffset * 2 + 1] = 1;
        vOffset++;
      }

      // Triangulate cylinder quads
      for (let j = 0; j < radialSegs; j++) {
        const b0 = baseVIndex + j * 2;
        const t0 = b0 + 1;
        const b1 = b0 + 2;
        const t1 = b0 + 3;

        indices[iOffset++] = b0;
        indices[iOffset++] = t0;
        indices[iOffset++] = b1;

        indices[iOffset++] = b1;
        indices[iOffset++] = t0;
        indices[iOffset++] = t1;
      }
    }

    const branchGeometry = new THREE.BufferGeometry();
    branchGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    branchGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    branchGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    branchGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    branchGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
    branchGeometry.computeVertexNormals();

    const branchMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: params.barkRoughness,
      metalness: params.barkMetalness,
      wireframe: params.wireframe,
      flatShading: params.flatShading,
      side: THREE.DoubleSide,
    });

    return { branchGeometry, branchMaterial };
  }

  /**
   * Assembles instanced foliage mesh
   */
  private buildLeafMesh(leaves: LeafData[], params: TreeParameters): THREE.InstancedMesh | null {
    if (leaves.length === 0) return null;

    const leafGeo = this.createLeafShapeGeometry(params.leafShape);
    const leafMat = new THREE.MeshStandardMaterial({
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
      wireframe: params.wireframe,
      flatShading: params.flatShading,
    });

    const instancedMesh = new THREE.InstancedMesh(leafGeo, leafMat, leaves.length);
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i];
      dummy.position.copy(leaf.position);

      // Orientation quaternion
      const q = new THREE.Quaternion();
      if (leaf.direction.lengthSq() > 0.001) {
        q.setFromUnitVectors(up, leaf.direction.clone().normalize());
      }
      dummy.quaternion.copy(q);
      dummy.scale.set(leaf.scale, leaf.scale, leaf.scale);
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);
      instancedMesh.setColorAt(i, leaf.color);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    return instancedMesh;
  }

  private createLeafShapeGeometry(shape: LeafShape): THREE.BufferGeometry {
    switch (shape) {
      case 'needle': {
        // Slender pine needle geometry
        const geo = new THREE.BufferGeometry();
        const verts = new Float32Array([
          -0.03, 0, 0,
          0.03, 0, 0,
          0, 1.2, 0,
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        return geo;
      }
      case 'blossom': {
        // 5-petal sakura blossom disc
        const geo = new THREE.CircleGeometry(0.5, 5);
        return geo;
      }
      case 'disc': {
        // Compact cloud foliage disc
        const geo = new THREE.CircleGeometry(0.4, 7);
        return geo;
      }
      case 'oval': {
        // Realistic botanic oval leaf with central spine
        const geo = new THREE.BufferGeometry();
        const verts = new Float32Array([
          0, 0, 0,
          -0.3, 0.4, 0.05,
          0, 1.0, 0,

          0, 0, 0,
          0, 1.0, 0,
          0.3, 0.4, 0.05,
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        return geo;
      }
      case 'quad':
      default: {
        const geo = new THREE.PlaneGeometry(0.6, 0.6);
        return geo;
      }
    }
  }
}
