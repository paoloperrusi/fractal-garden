import * as THREE from 'three';
import { TreeParameters, TreeStats, LeafShape } from '../types';
import { PRNG } from '../math/prng';

interface SegmentData {
  start: THREE.Vector3;
  end: THREE.Vector3;
  rStart: number;
  rEnd: number;
  depth: number;
  progressFrac: number; // 0 at base of tree, 1 at outermost tip
  direction: THREE.Vector3;
}

interface LeafData {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  scale: number;
  depth: number;
  color: THREE.Color;
}

export class TreeGenerator {
  private prng: PRNG = new PRNG();

  /**
   * Generates the entire 3D tree (branch mesh + leaf instanced mesh)
   */
  public generate(params: TreeParameters): {
    branchMesh: THREE.Mesh;
    leafMesh: THREE.InstancedMesh | null;
    stats: TreeStats;
  } {
    this.prng.setSeed(params.seed);

    const segments: SegmentData[] = [];
    const leaves: LeafData[] = [];

    // Calculate maximum structural depth adjusted by growthProgress
    const effectiveDepth = Math.max(1, Math.min(params.maxDepth, Math.ceil(params.maxDepth * params.growthProgress * 1.2)));

    // Generate branch hierarchy recursively
    const rootPos = new THREE.Vector3(0, 0, 0);
    const rootDir = new THREE.Vector3(0, 1, 0);

    this.growBranch(
      rootPos,
      rootDir,
      params.trunkLength,
      params.trunkRadius,
      0,
      0.0,
      effectiveDepth,
      params,
      segments,
      leaves
    );

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

  private growBranch(
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    radius: number,
    depth: number,
    progress: number,
    maxAllowedDepth: number,
    params: TreeParameters,
    segments: SegmentData[],
    leaves: LeafData[]
  ): void {
    if (depth > maxAllowedDepth) return;

    // Apply growth progress to scale length and radius dynamically
    const depthGrowthThreshold = depth / params.maxDepth;
    if (params.growthProgress < depthGrowthThreshold) return;

    const localGrowth = THREE.MathUtils.clamp(
      (params.growthProgress - depthGrowthThreshold) / (1.0 / params.maxDepth),
      0.0,
      1.0
    );

    const actualLength = length * (1.0 - params.lengthVariance * (1.0 - params.symmetry) * (this.prng.next() * 2 - 1)) * localGrowth;
    const actualRadius = Math.max(params.minRadius, radius * localGrowth);
    if (actualLength <= 0.05 || actualRadius <= 0.002) return;

    const segmentCount = Math.max(1, Math.min(6, params.segmentsPerBranch));
    const stepLength = actualLength / segmentCount;

    let currentPos = startPos.clone();
    let currentDir = direction.clone().normalize();
    let currentRadius = actualRadius;

    const taperFactor = 1.0 - (params.taper / segmentCount);

    for (let s = 0; s < segmentCount; s++) {
      const nextRadius = Math.max(params.minRadius, currentRadius * taperFactor);

      // Gravitropism: bend upward (+Y) or downward (-Y)
      if (params.gravitropism !== 0) {
        const gravityDir = new THREE.Vector3(0, params.gravitropism > 0 ? 1 : -1, 0);
        const gravityStrength = Math.abs(params.gravitropism) * 0.12 * (depth + 1);
        currentDir.addScaledVector(gravityDir, gravityStrength).normalize();
      }

      // Gnarliness / organic wander
      if (params.gnarliness > 0 && params.symmetry < 1.0) {
        const organicFactor = (1.0 - params.symmetry) * params.gnarliness * 0.25;
        const wander = new THREE.Vector3(
          this.prng.spread(0, organicFactor),
          this.prng.spread(0, organicFactor * 0.5),
          this.prng.spread(0, organicFactor)
        );
        currentDir.add(wander).normalize();
      }

      // Twist rotation around vertical axis
      if (params.twist !== 0) {
        const twistRad = THREE.MathUtils.degToRad((params.twist / segmentCount) * (1.0 - depth / params.maxDepth));
        currentDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), twistRad).normalize();
      }

      const nextPos = currentPos.clone().addScaledVector(currentDir, stepLength);
      const segmentProgress = progress + (s / segmentCount) * (1.0 / (params.maxDepth + 1));

      segments.push({
        start: currentPos.clone(),
        end: nextPos.clone(),
        rStart: currentRadius,
        rEnd: nextRadius,
        depth,
        progressFrac: segmentProgress,
        direction: currentDir.clone(),
      });

      currentPos = nextPos;
      currentRadius = nextRadius;
    }

    // Leaf generation at terminal tips or high depth
    const isTerminal = depth >= params.maxDepth - 1;
    if (params.leavesEnabled && depth >= params.leafStartDepth) {
      if (this.prng.next() <= params.leafDensity) {
        const leavesToSpawn = isTerminal ? params.leavesPerTip : Math.max(1, Math.floor(params.leavesPerTip * 0.4));
        this.spawnLeaves(currentPos, currentDir, leavesToSpawn, depth, params, leaves);
      }
    }

    // Branching into child branches
    if (depth < params.maxDepth) {
      // Check start branch depth (allows long unbranched trunks like pines or palms)
      if (depth < params.startBranchDepth) {
        // Continue single main leader trunk
        const childLength = length * params.lengthDecay;
        const childRadius = currentRadius * params.radiusDecay;
        this.growBranch(
          currentPos,
          currentDir,
          childLength,
          childRadius,
          depth + 1,
          progress + 1.0 / (params.maxDepth + 1),
          maxAllowedDepth,
          params,
          segments,
          leaves
        );
        return;
      }

      // Split into child branches
      const branchCount = Math.max(1, params.branchCount);
      const angleRad = THREE.MathUtils.degToRad(params.branchAngle);
      const angleVarRad = THREE.MathUtils.degToRad(params.branchAngleVariance * (1.0 - params.symmetry));
      const azimuthStep = THREE.MathUtils.degToRad(params.azimuthSpread);
      const azimuthVarRad = THREE.MathUtils.degToRad(params.azimuthVariance * (1.0 - params.symmetry));

      // Find an arbitrary orthogonal vector to currentDir
      const refUp = Math.abs(currentDir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const perpAxis = new THREE.Vector3().crossVectors(currentDir, refUp).normalize();

      for (let b = 0; b < branchCount; b++) {
        // Probability check
        if (depth > 0 && this.prng.next() > params.branchProbability) {
          continue;
        }

        const childDir = currentDir.clone();

        // Branch divergence angle (pitch)
        const branchPitch = angleRad + this.prng.spread(0, angleVarRad);
        const pitchAxis = perpAxis.clone().applyAxisAngle(currentDir, b * (Math.PI * 2 / branchCount));
        childDir.applyAxisAngle(pitchAxis, branchPitch);

        // Azimuthal rotation around parent branch axis
        const baseAzimuth = b * azimuthStep;
        const azimuthJitter = this.prng.spread(0, azimuthVarRad);
        childDir.applyAxisAngle(currentDir, baseAzimuth + azimuthJitter);

        childDir.normalize();

        const childLength = length * params.lengthDecay;
        const childRadius = currentRadius * params.radiusDecay;

        this.growBranch(
          currentPos,
          childDir,
          childLength,
          childRadius,
          depth + 1,
          progress + 1.0 / (params.maxDepth + 1),
          maxAllowedDepth,
          params,
          segments,
          leaves
        );
      }
    }
  }

  private spawnLeaves(
    tipPos: THREE.Vector3,
    tipDir: THREE.Vector3,
    count: number,
    depth: number,
    params: TreeParameters,
    leaves: LeafData[]
  ): void {
    const baseColor = new THREE.Color(params.leafColor);
    const tipColor = new THREE.Color(params.leafColorTip);

    for (let i = 0; i < count; i++) {
      // Scatter in spherical cluster around tip
      const radius = params.leafClusterRadius * Math.cbrt(this.prng.next());
      const theta = this.prng.next() * Math.PI * 2;
      const phi = Math.acos(this.prng.range(-1, 1));

      const offset = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      const leafPos = tipPos.clone().add(offset);

      // Orientation vector: outward from tip + gravitropism droop
      const leafDir = offset.clone().normalize();
      if (leafDir.lengthSq() < 0.001) leafDir.copy(tipDir);
      leafDir.addScaledVector(new THREE.Vector3(0, params.leafGravity, 0), 0.6).normalize();

      // Size with variance
      const sizeVar = (1.0 - params.leafSizeVariance * 0.5) + this.prng.next() * params.leafSizeVariance;
      const scale = Math.max(0.02, params.leafSize * sizeVar * params.growthProgress);

      // Color variation
      const mixFrac = THREE.MathUtils.clamp((depth / params.maxDepth) + this.prng.spread(0, params.leafColorVariation * 0.5), 0, 1);
      const leafColor = baseColor.clone().lerp(tipColor, mixFrac);
      if (params.leafColorVariation > 0) {
        const hsl = { h: 0, s: 0, l: 0 };
        leafColor.getHSL(hsl);
        hsl.h += this.prng.spread(0, params.leafColorVariation * 0.08);
        hsl.l += this.prng.spread(0, params.leafColorVariation * 0.12);
        leafColor.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s, 0, 1), THREE.MathUtils.clamp(hsl.l, 0, 1));
      }

      leaves.push({
        position: leafPos,
        direction: leafDir,
        scale,
        depth,
        color: leafColor,
      });
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
