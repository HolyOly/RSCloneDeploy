import { LevelLoad as Load, LevelId } from './types';
import {
  LevelConfig, LoadingConfig as LoadZone, EntityConfig, SurfaceConfig,
} from './levelConfig';

import { Point, Line, Rectangle } from '../shapes';

import { Entity, EntityClass, Direction } from '../entity';
import entitiesList from '../entity/list';

import SurfaceType from '../types';

import Character from '../character';

type Surface = { type:SurfaceType, platform:boolean, position:Line, angle:number } ;
enum SurfaceGroup { All, Walls, Floors, Ceils, Platforms } // Floors = Ceils + Platforms
type Surfaces = Record<SurfaceGroup, Surface[]>;

type SurfaceCollision = { surface:Surface, point:Point } | null;
type Position = { position:Line };
type RenderContext = CanvasRenderingContext2D;

class Level {
  private readonly surfaces:Surfaces;
  private readonly loadEnter:LoadZone[];
  private readonly loadExit:LoadZone[];
  private readonly entitiesConfig:EntityConfig[];
  private entities:Entity[] = [];
  private char?:Character;

  private area:Rectangle;
  private cameraTarget:Point = Point.Zero;
  private cameraCurrent:Point = Point.Zero;
  private static readonly cameraSpeed = 180;
  private static readonly cameraShift = new Point(1 / 15, 6 / 11);
  private lastZoom = -1;
  private lastViewSize = Point.Zero;

  private static newEntity<A extends Entity>(EntityConstructor:EntityClass<A>, position:Point):A {
    return new EntityConstructor(position);
  }

  private static initEntities(entitiesConfig:EntityConfig[]):Entity[] {
    return entitiesConfig.map((v) => Level.newEntity(entitiesList[v.type], v.position));
  }

  private static getAngle(line: Line):number {
    const vector = line.A.minus(line.B);
    return Math.atan2(vector.Y, vector.X);
  }

  private static readonly wallAngle = (30 * Math.PI) / 180;
  private static initSurfaces(surfaces:SurfaceConfig[]):Record<SurfaceGroup, Surface[]> {
    const allBeforeNormalizaion = surfaces.map((s) => ({
      platform: false, type: SurfaceType.Normal, ...s, angle: Level.getAngle(s.position),
    }));
    const halfPI = Math.PI / 2;
    const all = allBeforeNormalizaion.map((s) => (s.angle > 0
      ? { ...s, position: new Line(s.position.B, s.position.A), angle: Math.abs(s.angle - halfPI) }
      : { ...s, angle: Math.abs(s.angle + halfPI) }));

    const walls = all.filter((s) => s.angle < Level.wallAngle);
    const floors = all.filter((s) => s.angle >= Level.wallAngle);
    const ceils = floors.filter((s) => !s.platform);
    const platforms = floors.filter((s) => s.platform);

    return {
      [SurfaceGroup.All]: all,
      [SurfaceGroup.Walls]: walls,
      [SurfaceGroup.Floors]: floors,
      [SurfaceGroup.Ceils]: ceils,
      [SurfaceGroup.Platforms]: platforms,
    };
  }

  private static initArea(surface:Surface[], minSize:Point):Rectangle {
    const left = surface.reduce((p, c) => Math.min(p, c.position.MinX), Number.MAX_SAFE_INTEGER);
    const right = surface.reduce((p, c) => Math.max(p, c.position.MaxX), 0);
    const width = Math.max(right - left + 1, minSize.X);
    const top = surface.reduce((p, c) => Math.min(p, c.position.MinY), Number.MAX_SAFE_INTEGER);
    const bottom = surface.reduce((p, c) => Math.max(p, c.position.MaxY), 0);
    const height = Math.max(bottom - top + 1, minSize.Y);
    return new Rectangle(left, top, width, height);
  }

  constructor(config:LevelConfig) {
    this.surfaces = Level.initSurfaces(config.surfaces);
    this.area = Level.initArea(this.surfaces[SurfaceGroup.All], config.minSize);

    this.entitiesConfig = config.entities;
    this.loadEnter = config.loading;
    this.loadExit = config.loading.filter((v) => v.zone !== undefined);
  }

  public load(char:Character, zone = 0, positionPercentage = 0, portal = false):void {
    if (!portal) this.entities = Level.initEntities(this.entitiesConfig);
    this.char = char;
    const loadPos:Line = this.loadEnter[
      zone < this.loadEnter.length ? zone : Math.floor(Math.random() * this.loadEnter.length)
    ].position;
    this.lastZoom = -1;
    this.char.Position = loadPos.B.minus(loadPos.A).multiply(positionPercentage).plus(loadPos.A);
    this.char.frame(0.0001);
    // hack to not stuck at loading screen and not to process "just loaded" every frame
  }

  private static filterNear<T>(array:Position[], checkZone:Rectangle):T[] {
    return array
      .filter((s) => s.position.MinX <= checkZone.Right
                  && s.position.MaxX >= checkZone.Left
                  && s.position.MinY <= checkZone.Bottom
                  && s.position.MaxY >= checkZone.Top) as unknown as T[]; // is there a better way?
  }

  private static linesIntersect(line1:Line, line2:Line):number | null {
    const line1Vect:Point = line1.B.minus(line1.A);
    const line2Vect:Point = line2.B.minus(line2.A);

    const line2Pos = (line2Vect.X * (line1.A.Y - line2.A.Y) - line2Vect.Y * (line1.A.X - line2.A.X))
                   / (line1Vect.X * line2Vect.Y - line1Vect.Y * line2Vect.X);
    if (line2Pos < 0 || line2Pos > 1 || Number.isNaN(line2Pos)) return null;

    const line1Pos = (line1Vect.X * (line1.A.Y - line2.A.Y) - line1Vect.Y * (line1.A.X - line2.A.X))
                   / (line1Vect.X * line2Vect.Y - line2Vect.X * line1Vect.Y);
    if (line1Pos < 0 || line1Pos > 1 || Number.isNaN(line1Pos)) return null;

    return line2Pos;
  }

  private static pointPercentOnLine(p:number, s:number, l:number) {
    return Math.abs(p - s) / l;
  }

  private static processExitZones(exits:LoadZone[], move:Line):Load | null {
    if (!exits.length) return null;
    // should add sort check for 2 zones nearly and direction but I don't care
    for (let i = exits.length - 1; i > -1; i -= 1) {
      const exit = exits[i];
      const exitPos = exit.position;
      const position = Level.linesIntersect(exitPos, move);
      if (!position) continue;
      const levelId = exit.levelId as LevelId;
      const zone = exit.zone as number;
      return { levelId, zone, position };
    }
    return null;
  }

  private static processFloors(floors:Surface[], move:Line, onFloor:boolean):SurfaceCollision {
    if (!floors.length) return null;
    if (floors.length > 1) floors.sort((a, b) => b.position.MaxY - a.position.MaxY);
    // prevent teleport down with very low fps aka 10 seconds per frame

    for (let i = floors.length - 1; i > -1; i -= 1) {
      const floorPos = floors[i].position;
      if (!onFloor) {
        const percentBefore = Level.pointPercentOnLine(move.A.X, floorPos.A.X, floorPos.DifXabs);
        const yBefore = floorPos.DifYabs * percentBefore + floorPos.MinY;
        if (yBefore < move.A.Y) continue; // platform was above the characrter
      }
      const percentegeAfter = Level.pointPercentOnLine(move.B.X, floorPos.A.X, floorPos.DifXabs);
      const yAfter = floorPos.DifYabs * percentegeAfter + floorPos.MinY;
      if (!onFloor && yAfter > move.B.Y) continue;
      return { surface: floors[i], point: new Point(move.B.X, yAfter) };
    }

    return null;
  }

  private static getCheckZone(move:Line):Rectangle {
    const top = Math.floor(Math.min(move.B.Y, move.A.Y));
    const height = Math.ceil(Math.max(move.B.Y, move.A.Y) - top);
    const left = Math.floor(Math.min(move.B.X, move.A.X));
    const width = Math.ceil(Math.max(move.B.X, move.A.X) - left);
    return new Rectangle(left, top, width, height);
  }

  private processCollision(e:Entity, elapsedSeconds:number, char = false):Load | null {
    const posBefore = new Point(e.Position.X, e.Position.Y); // to copy values and not reference
    e.frame(elapsedSeconds);
    const move = new Line(posBefore, e.Position);
    const checkZone = Level.getCheckZone(move);
    if (char) {
      const nearExits = Level.filterNear<LoadZone>(this.loadExit, checkZone);
      const exit = Level.processExitZones(nearExits, move);
      if (exit) return exit;
    }
    const floorsCheckZone = new Rectangle(move.B.X, checkZone.Top, 0, checkZone.Height);
    const nearFloors = Level
      .filterNear<Surface>(this.surfaces[SurfaceGroup.Floors], floorsCheckZone);
    const floorCollision = Level.processFloors(nearFloors, move, e.OnSurface);

    if (floorCollision) {
      e.Position = floorCollision.point;
      e.SurfaceType = floorCollision.surface.type;
    } else e.SurfaceType = null;

    return null;
  }

  private processCamera(char:Character, viewSize:Point, zoom:number, elapsedSeconds:number) {
    // some doublicate-code, I wasn't able to find how in TS dynamically access setters field
    // Y is centered so no code for movement
    const areaZoom = this.area.multiply(zoom);
    if (viewSize.X > areaZoom.Width) {
      this.cameraTarget.X = (areaZoom.Width - viewSize.X) / 2;
      this.cameraCurrent.X = this.cameraTarget.X;
    } else {
      const newCameraX = zoom * char.Position.X - (viewSize.X * (0.5
        + (char.Direction === Direction.left ? Level.cameraShift.X : -Level.cameraShift.X)));
      const maxPosX = areaZoom.Width - viewSize.X;
      this.cameraTarget.X = Math.min(Math.max(newCameraX, areaZoom.Left), maxPosX);
    }

    if (viewSize.Y > areaZoom.Height) {
      this.cameraCurrent.Y = (areaZoom.Height - viewSize.Y) / 2;
    } else {
      const newCameraY = zoom * char.Position.Y - viewSize.Y * Level.cameraShift.Y;
      const maxPosY = areaZoom.Height - viewSize.Y;
      this.cameraCurrent.Y = Math.min(Math.max(newCameraY, areaZoom.Top), maxPosY);
    }

    if (this.lastZoom !== zoom || this.lastViewSize !== viewSize) {
      this.cameraCurrent.X = this.cameraTarget.X;
      this.lastZoom = zoom;
      this.lastViewSize = viewSize;
    } else if (this.cameraCurrent.X !== this.cameraTarget.X) {
      const cameraSpeed = Level.cameraSpeed * zoom;
      const cameraShift = elapsedSeconds * cameraSpeed;
      this.cameraCurrent.X = (this.cameraCurrent.X > this.cameraTarget.X)
        ? Math.max(this.cameraCurrent.X - cameraShift, this.cameraTarget.X)
        : Math.min(this.cameraCurrent.X + cameraShift, this.cameraTarget.X);
    }
  }

  public frame(elapsedSeconds:number, viewSize:Point, zoom:number):Load | undefined {
    const char = this.char as Character;
    const exit = this.processCollision(char, elapsedSeconds, true);
    if (exit) return exit;
    this.entities?.forEach((entity) => this.processCollision(entity, elapsedSeconds));
    this.processCamera(char, viewSize, zoom, elapsedSeconds);
    return undefined;
  }

  private static drawLine(c:RenderContext, zoom:number, camPos:Point, line:Line):void {
    const from = line.A.multiply(zoom).minus(camPos);
    const to = line.B.multiply(zoom).minus(camPos);
    c.moveTo(Math.round(from.X), Math.round(from.Y));
    c.lineTo(Math.round(to.X), Math.round(to.Y));
  }

  private static drawLines(c:RenderContext, zoom:number, p:Point, arr:Position[], clr:string):void {
    if (!arr.length) return;
    const cLocal = c;
    c.beginPath();
    cLocal.strokeStyle = clr;
    arr.forEach((pos) => Level.drawLine(c, zoom, p, pos.position));
    c.stroke();
    c.closePath();
  }

  private static readonly colors:Record<SurfaceType, string> = {
    [SurfaceType.Normal]: 'black',
    [SurfaceType.Ice]: 'aqua',
  };

  private readonly surfaceFilterCache = new Map();
  private static readonly surfaceTypesKeys = Object.keys(SurfaceType)
    .filter((v) => Number.isNaN(+v))
    .map((k) => SurfaceType[k as keyof typeof SurfaceType]);

  private surfaceFilter(group:SurfaceGroup, type:SurfaceType) {
    const key = JSON.stringify([group, type]);
    return (this.surfaceFilterCache.has(key)
      ? this.surfaceFilterCache
      : this.surfaceFilterCache.set(
        key,
        this.surfaces[group].filter((s) => s.type === type),
      )
    ).get(key);
  }

  private drawSurfaces(c:RenderContext, zoom:number, camPos:Point) {
    Level.surfaceTypesKeys.forEach((type) => {
      const color = Level.colors[type];
      c.setLineDash([10, 2]);
      Level.drawLines(c, zoom, camPos, this.surfaceFilter(SurfaceGroup.Platforms, type), color);
      c.setLineDash([]);
      Level.drawLines(c, zoom, camPos, this.surfaceFilter(SurfaceGroup.Walls, type), color);
      Level.drawLines(c, zoom, camPos, this.surfaceFilter(SurfaceGroup.Ceils, type), color);
    });
  }

  public draw(c:RenderContext, zoom:number, dBoxes = false, dSurfaces = false):void {
    const camPos = this.cameraCurrent;

    if (dSurfaces) {
      // because canvas is weird, need for sharp lines
      c.translate(0.5, 0.5);
      this.drawSurfaces(c, zoom, camPos);
      Level.drawLines(c, zoom, camPos, this.loadEnter, 'white');
      Level.drawLines(c, zoom, camPos, this.loadExit, 'yellow');
      c.translate(-0.5, -0.5);
    }

    this.char?.draw(c, camPos, zoom, dBoxes);
    this.entities?.forEach((entity) => entity.draw(c, camPos, zoom, dBoxes));
  }
}

export {
  Level, Load as LevelLoad, LevelId,
};
