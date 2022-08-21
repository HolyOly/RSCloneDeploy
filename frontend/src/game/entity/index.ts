import {
  Direction, EntityClass, EntityId, StateConfig,
} from './types';

import SpriteAnimation from '../sprites';
import { Point, Rectangle } from '../../shapes';
import Box from '../box';
import SurfaceType from '../types';

type State = {
  animation?:SpriteAnimation;
  hitboxes:Box[];
  hurtboxes:Box[];
  collisionboxes:Box[];
};

type States = Record<number, State>;

abstract class Entity {
  protected direction:Direction = Direction.right;
  public get Direction():Direction { return this.direction; }
  protected position:Point = Point.Zero;
  public set Position(value:Point) { this.position = value; }
  public get Position():Point { return this.position; }
  protected velocityPerSecond:Point = Point.Zero;
  private static readonly maxVelY = 500;

  private gravity = 100;
  private states:States = {};
  protected stateElapsedSeconds = 0;

  protected currentState = -1;
  private animation:SpriteAnimation | null = null;
  private collision:Rectangle = Rectangle.Zero;
  public get Collision():Rectangle { return this.collision; }

  protected surfaceType:SurfaceType | null = null;
  public set SurfaceType(value:SurfaceType | null) {
    if (value) this.velocityPerSecond.Y = 0;
    else if (this.OnSurface) this.velocityPerSecond.Y = this.gravity / 1.8;
    this.surfaceType = value;
  }

  public get OnSurface():boolean { return this.surfaceType !== null; }

  // because I'm too dumb to code it correctly with very limited time
  private static getCollisionSimplified(boxes:Box[]):Rectangle {
    return boxes.map((b) => b.RectCombined).reduce((p, c) => Box.initCombined(p, c));
  }

  public set State(value:number) {
    if (!this.states[value]) {
      this.currentState = -1;
      this.animation = null;
      this.collision = Rectangle.Zero;
      return;
    }

    this.currentState = value;
    this.collision = Entity.getCollisionSimplified(this.states[this.currentState].collisionboxes);
    this.animation = this.states[this.currentState].animation || null;
  }

  private static concatBoxes<T>(box?:T, boxes?:T[]):T[] {
    return (boxes || []).concat(box || []);
  }

  private static initStates(states:Partial<Record<number, StateConfig>>) {
    return Object.keys(states).reduce((result:States, key:string) => {
      const stateCf:StateConfig = states[+key] as StateConfig;
      const hitboxes = Entity.concatBoxes(stateCf.hitbox, stateCf.hitboxes);
      const hurtboxesTmp = Entity.concatBoxes(stateCf.hurtbox, stateCf.hurtboxes);
      const hurtboxes = hurtboxesTmp.length ? hurtboxesTmp : hitboxes;
      const collisionboxesTmp = Entity.concatBoxes(stateCf.collisionbox, stateCf.collisionboxes);
      const collisionboxes = collisionboxesTmp.length ? collisionboxesTmp : hurtboxesTmp;
      const state:State = { hitboxes, hurtboxes, collisionboxes };

      if (stateCf.sprite) Object.assign(state, { animation: new SpriteAnimation(stateCf.sprite) });
      Object.assign(result, { [+key]: state });
      return result;
    }, {});
  }

  constructor(position:Point, states?:Partial<Record<number, StateConfig>>, defaultState?:number) {
    this.position = position;
    if (!states) return;
    this.states = Entity.initStates(states);
    this.State = defaultState || Number(Object.keys(states)[0]);
  }

  public frame(elapsedSeconds:number):void {
    this.stateElapsedSeconds += elapsedSeconds;

    if (!this.OnSurface) {
      if (this.velocityPerSecond.Y < Entity.maxVelY) {
        this.velocityPerSecond.Y += elapsedSeconds * this.gravity;
        this.velocityPerSecond.Y = Math.min(this.velocityPerSecond.Y, Entity.maxVelY);
      }
      this.position.Y += elapsedSeconds * this.velocityPerSecond.Y;
    }

    this.position.X += elapsedSeconds * this.velocityPerSecond.X;
  }

  private static readonly colors = {
    hit: 'red', hurt: 'blue', collision: 'pink', position: 'green',
  };

  private static drawPosition(c:CanvasRenderingContext2D, drawPos:Point):void {
    const cLocal = c;
    cLocal.strokeStyle = Entity.colors.position;
    cLocal.fillRect(Math.round(drawPos.X), Math.round(drawPos.Y), 1, 1);
  }

  private drawBoxes(c:CanvasRenderingContext2D, drawPos:Point):void {
    if (this.currentState < 0) return;
    const state = this.states[this.currentState];
    const reverse = !!this.direction;
    const cLocal = c;
    cLocal.strokeStyle = Entity.colors.collision;
    state.hurtboxes.forEach((v) => v.draw(c, drawPos, reverse));
    cLocal.strokeStyle = Entity.colors.hurt;
    state.hurtboxes.forEach((v) => v.draw(c, drawPos, reverse));
    cLocal.strokeStyle = Entity.colors.hit;
    state.hitboxes.forEach((v) => v.draw(c, drawPos, reverse));
    Entity.drawPosition(c, drawPos);
  }

  public draw(c:CanvasRenderingContext2D, camPos:Point, drawBoxes = false) {
    const drawPos = this.position.minus(camPos);
    if (this.animation) {
      const elapsed = this.stateElapsedSeconds;
      this.animation.drawFrame(c, drawPos, elapsed, !!this.direction);
    }
    if (drawBoxes) this.drawBoxes(c, drawPos);
  }
}

export {
  Entity, EntityClass, Direction, EntityId, StateConfig,
};
