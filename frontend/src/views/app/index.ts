import template from './index.html';
import style from './app.scss';

import { IView, View } from '..';

import Canvas2D from '../canvas2D';
import {
  Game, IGame, IGameCallbacks, WinTheGame,
} from '../../game';
import BoardersView from '../boarders';
import SoundView from '../sound';

import { Services } from '../../services';
import SettingIsGame from '../settingIsGame';

enum ViewId { canvas, placaholder, sounds, settingGame }

class AppPage extends View implements IGameCallbacks {
  private static contentId = style.content;
  private services: Services;
  private currentViewId?: ViewId;
  private views: Record<string, IView> = {};
  private game?: IGame;

  private createView(viewId: ViewId): IView {
    switch (viewId) {
      case ViewId.canvas: {
        const canvasView = new Canvas2D(AppPage.contentId, this.services.gameSettings);
        this.game = new Game(
          this.services.controls.settings,
          this.services.gameSettings,
          this.services.sounds.play,
        );
        this.game.start(this);
        return canvasView;
      }
      case ViewId.placaholder: return new BoardersView(AppPage.contentId, this.services.api.times);
      case ViewId.sounds: return new SoundView('sounds', this.services.sounds.subsribe);
      case ViewId.settingGame:
        return new SettingIsGame(AppPage.contentId, this.services.gameSettings);
      default: throw new Error(`${viewId} doesn't exit`);
    }
  }

  private getView(viewId: ViewId): IView {
    if (!this.views[viewId]) this.views[viewId] = this.createView(viewId);
    return this.views[viewId];
  }

  constructor(parentId: string, services: Services) {
    super(parentId, template, style);
    this.services = services;
  }

  private initListeners() {
    this.getElementById('toCanvas')?.addEventListener('click', this.changeTo.bind(this, ViewId.canvas));
    this.getElementById('toPlaceholder')?.addEventListener('click', this.changeTo.bind(this, ViewId.placaholder));
    this.getElementById('toSettingGame')?.addEventListener('click', this.changeTo.bind(this, ViewId.settingGame));
  }

  public append(): void {
    super.append();
    this.initListeners();
    this.getView(ViewId.sounds).append();
    this.changeTo(ViewId.canvas);
  }

  private changeTo(viewId: ViewId): boolean {
    if (this.currentViewId === viewId) return false;
    this.currentViewId = viewId;
    const view = this.getView(viewId);
    view.replace();
    return true;
  }

  public win(win:WinTheGame):void {
    alert(JSON.stringify(win));
    console.log(this);
  }

  public pause():void {
    alert('pause!');
    console.log(this);
  }

  public hp(hp:number) {
    alert(hp);
    console.log(this);
  }
}

export default AppPage;
