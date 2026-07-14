/**
 * SpatialIndex — BVH-accelerated broadphase for player collision detection.
 *
 * Wraps the `detect-collisions` library to provide efficient spatial queries
 * for the 22-player simulation. The GameEngine calls `update()` once per tick
 * to sync entity positions, then uses `queryRadius()` for proximity checks
 * instead of O(n²) pairwise iteration.
 *
 * This module is a broadphase only — narrowphase impulse resolution remains
 * custom in GameEngine.ts.
 */

import { System, Circle as DCCircle } from 'detect-collisions';

/** Opaque handle returned by insert(); used to update/remove entities. */
export interface SpatialHandle {
  /** Internal detect-collisions body reference. */
  readonly _body: DCCircle;
  /** User-assigned entity id (e.g. footballer index). */
  readonly entityId: number;
}

export interface SpatialQueryResult {
  entityId: number;
  x: number;
  y: number;
}

/**
 * Thin wrapper around detect-collisions System for the football pitch.
 *
 * Usage:
 * ```ts
 * const index = new SpatialIndex();
 * const handles = players.map((p, i) => index.insert(i, p.pos.x, p.pos.y, 0.4));
 * // each tick:
 * handles.forEach((h, i) => index.update(h, players[i].pos.x, players[i].pos.y));
 * index.rebuild();
 * const nearby = index.queryRadius(ball.x, ball.y, 3.0);
 * ```
 */
export class SpatialIndex {
  private system: System;
  private handles: Map<number, SpatialHandle> = new Map();

  constructor() {
    this.system = new System();
  }

  /**
   * Insert a circular entity into the spatial index.
   * @param entityId Unique integer identifier for the entity (e.g. footballer index).
   * @param x World-space x position.
   * @param y World-space y position.
   * @param radius Collision radius (metres).
   * @returns A handle for future update/remove operations.
   */
  insert(entityId: number, x: number, y: number, radius: number): SpatialHandle {
    const body = this.system.createCircle({ x, y }, radius);
    const handle: SpatialHandle = { _body: body, entityId };
    this.handles.set(entityId, handle);
    return handle;
  }

  /**
   * Update an entity's position. Call this for every entity each tick before rebuild().
   */
  update(handle: SpatialHandle, x: number, y: number): void {
    handle._body.setPosition(x, y);
  }

  /**
   * Rebuild the BVH. Call once per tick after all positions have been updated.
   */
  rebuild(): void {
    this.system.update();
  }

  /**
   * Query all entities whose bounding circles overlap with a probe circle.
   * @param x Center x of the query.
   * @param y Center y of the query.
   * @param radius Radius of the query circle.
   * @returns Array of entity IDs + positions within range.
   */
  queryRadius(x: number, y: number, radius: number): SpatialQueryResult[] {
    const results: SpatialQueryResult[] = [];
    const probe = this.system.createCircle({ x, y }, radius);
    this.system.update(); // ensure probe is in the tree

    const potentials = this.system.getPotentials(probe);
    for (const candidate of potentials) {
      if (this.system.checkCollision(probe, candidate)) {
        // Find the entityId for this body
        for (const [id, handle] of this.handles) {
          if (handle._body === candidate) {
            results.push({
              entityId: id,
              x: candidate.x,
              y: candidate.y,
            });
            break;
          }
        }
      }
    }

    // Remove the temporary probe
    this.system.remove(probe);

    return results;
  }

  /**
   * Check all colliding pairs in the system.
   * More efficient than queryRadius for "find all overlapping pairs" use cases.
   * @returns Array of [entityIdA, entityIdB] pairs that are currently overlapping.
   */
  findAllOverlaps(): Array<[number, number]> {
    const pairs: Array<[number, number]> = [];
    this.system.checkAll((response) => {
      let idA = -1;
      let idB = -1;
      for (const [id, handle] of this.handles) {
        if (handle._body === response.a) idA = id;
        if (handle._body === response.b) idB = id;
        if (idA >= 0 && idB >= 0) break;
      }
      if (idA >= 0 && idB >= 0) {
        pairs.push([Math.min(idA, idB), Math.max(idA, idB)]);
      }
    });
    return pairs;
  }

  /**
   * Remove an entity from the spatial index.
   */
  remove(handle: SpatialHandle): void {
    this.system.remove(handle._body);
    this.handles.delete(handle.entityId);
  }

  /**
   * Remove all entities and reset the system.
   */
  clear(): void {
    for (const handle of this.handles.values()) {
      this.system.remove(handle._body);
    }
    this.handles.clear();
  }

  /** Current entity count. */
  get size(): number {
    return this.handles.size;
  }
}
