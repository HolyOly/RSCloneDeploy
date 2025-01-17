import { Point as P } from '../../../shapes';
import bg from './index.png';
import { MusicId, musicList } from '../../music';

import {
  EntityConfig, LevelConfig, LoadingConfig, SurfaceConfig, positionsFromPoints, SpriteConfig,
} from '../../config';
import LevelId from '../ids';
import SurfaceType from '../../../types';

const walls:(SurfaceConfig | LoadingConfig)[] = [
  ...positionsFromPoints([
    new P(112, 0), new P(112, 240), new P(48, 240), new P(48, 256),
    new P(0, 256), new P(0, 320),
    new P(64, 320),
  ]).map((s, i) => {
    if (i === 4) return { ...s, levelId: LevelId.S11, zone: 3 };
    // todo: fix collision
    // if (i === 8) return { ...s, levelId: LevelId.S11, zone: 1 };
    // if (i === 12) return { ...s, levelId: LevelId.S11, zone: 3 };
    // if (i === 18) return { ...s, levelId: LevelId.S9, zone: 2 };
    // if (i === 26) return { ...s, levelId: LevelId.S9, zone: 1 };
    // if (i === 30) return { ...s, levelId: LevelId.S9, zone: 0 };
    return s;
  }),
  ...positionsFromPoints([
    new P(80, 336), new P(80, 448),
    new P(0, 448), new P(0, 512),
    new P(80, 512), new P(112, 512), new P(112, 640),
    new P(0, 640), new P(0, 704),
    new P(32, 704),
    new P(64, 736), new P(432, 736), new P(464, 704),
    new P(512, 704), new P(512, 640),
    new P(416, 640), new P(432, 592), new P(432, 432),
    new P(416, 432), new P(416, 336),
  ]).map((s, i) => {
    if (i === 2) return { ...s, levelId: LevelId.S11, zone: 2 };
    if (i === 7) return { ...s, levelId: LevelId.S11, zone: 0 };
    if (i === 13) return { ...s, levelId: LevelId.S9, zone: 4 };
    if (i === 10) return { ...s, type: SurfaceType.Ice };
    // todo: fix collision
    // if (i === 24) return { ...s, levelId: LevelId.S9, zone: 1 };
    // if (i === 28) return { ...s, levelId: LevelId.S9, zone: 0 };
    return s;
  }),
  ...positionsFromPoints([
    new P(432, 320), new P(512, 320), new P(512, 256), new P(432, 256), new P(432, 144),
  ]).map((s, i) => ((i === 1) ? { ...s, levelId: LevelId.S9, zone: 2 } : s)),
  // todo: fix collision
  ...positionsFromPoints([
    new P(432, 128), new P(512, 128), new P(512, 64), new P(432, 64), new P(432, 0),
  ]).map((s, i) => ((i === 1) ? { ...s, levelId: LevelId.S9, zone: 0 } : s)),
  // todo: fix collision
  ...positionsFromPoints(
    [new P(210, 700), new P(220, 698), new P(228, 686), new P(296, 686), new P(300, 688)],
    true,
  ),
  ...positionsFromPoints([new P(272, 640), new P(304, 640)], true),
  ...positionsFromPoints([new P(304, 608), new P(368, 592), new P(432, 592)], true),
  ...positionsFromPoints([new P(400, 528), new P(352, 528)], true),
  ...positionsFromPoints([new P(304, 480), new P(208, 480), new P(80, 512)], true),
  ...positionsFromPoints([new P(272, 432), new P(240, 432)], true),
  ...positionsFromPoints([new P(64, 320), new P(128, 336), new P(176, 336)], true),
  ...positionsFromPoints([new P(192, 368), new P(304, 368)], true),
  ...positionsFromPoints([new P(320, 336), new P(368, 336), new P(432, 320)], true),
  ...positionsFromPoints([new P(272, 288), new P(224, 288)], true),
  ...positionsFromPoints([new P(256, 224), new P(208, 224)], true),
  ...positionsFromPoints([new P(192, 160), new P(144, 160)], true),
  ...positionsFromPoints([new P(288, 192), new P(336, 192)], true),
  ...positionsFromPoints([new P(368, 144), new P(432, 128)], true),
];

const entities:EntityConfig[] = [

];

const bgconfig:SpriteConfig = { link: bg, frameSize: 512 };
const backgrounds = [bgconfig];
const music = musicList[MusicId.PitchBlackIntrussion];

const cfg:LevelConfig = {
  walls, entities, backgrounds, music, minSize: new P(bgconfig.frameSize, 768),
};

export default cfg;
