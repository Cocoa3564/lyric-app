//外部ライブラリ
import {Ticker} from 'pixi.js';
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";

//自作の必須ファイル
import VRE from "@/core/visualRenderEngine";
import * as config from "@/config";
import Scene from "@/core/scene";
import TAManager from "@/core/textAliveManager";

/**シーンクラス */
import MainScene from "@/scenes/mainScene";
import ResultScene from "@/scenes/resultScene";
import SeabedScene from "@/scenes/seabedScene";
import SettingScene from "@/scenes/settingScene";
import SongSelectScene from "@/scenes/songSelectScene";

//GSAPとPIXIを連携させる
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

type SceneList = "songSelect" | "main" | "result" | "seabed" | "setting";

export default class SceneManager {
    private static _activeSceneName: string | null = null;
    private static _activeScene: Scene | null = null;
    private static scenes: Record<string, Scene> = {};

    static addScene(scene: Scene) {
        this.scenes[scene.name] = scene;
        return scene;
    }

    static async changeScene(sceneName: SceneList) {
        const nextScene = this.scenes[sceneName];
        if (!nextScene) {
            console.error(`Sceneが見つかりません！: ${sceneName}`);
            return;
        }

        if (this._activeScene) {
            this._activeScene.onDisable();
            this._activeScene.leave();
            await this._activeScene.destroy();
            this._activeScene.isInitialized = false;
        }

        this._activeScene = nextScene;
        this._activeSceneName = sceneName;
        
        await nextScene.Awake();
        await nextScene.load();
        await nextScene.initialize();
        nextScene.isInitialized = true;
        nextScene.enter();
        nextScene.onEnable();
    }

    static async initialize() {
        this.addScene(new SongSelectScene("songSelect"));
        this.addScene(new MainScene("main"));
        this.addScene(new ResultScene("result"));
        this.addScene(new SeabedScene("seabed"));
        this.addScene(new SettingScene("setting"));
        
        await this.changeScene("songSelect");
    }

    static update(ticker: Ticker) {
        this._activeScene?.update(ticker);
    }

    public static get activeSceneName(): string | null {
        return this._activeSceneName;
    }

    public static get activeScene(): Scene | null {
        if (!this._activeSceneName) return null;
        return this.scenes[this._activeSceneName] || null;
    }

    public static async FadeIn(config: FadeConfig) {
        const endBrightness = config.brightness ?? 1;
        if(!this.activeScene) return;
        const container = this.activeScene.rootContainer;
        const camera = this.activeScene.camera;
        let brightness = 0;

        switch (config.color) {
            case "black":
                brightness = 0;
                VRE.app.renderer.background.color = 0x000000;
                break;

            case "white":
                brightness = 10;
                VRE.app.renderer.background.color = 0xffffff;
                break;
        }

        container.eventMode = "none";
        switch (config.type) {
            case "normal":
                camera.scale.set(1);
                gsap.set(container, {
                    pixi: {
                        colorMatrixFilter: {
                            contrast: 10,
                            brightness: brightness,
                            saturation: 0
                        }
                    }
                });
                break;

            case "zoom":
                camera.scale.set(2);
                gsap.set(container, {
                    pixi: {
                        colorMatrixFilter: {
                            contrast: 10,
                            brightness: brightness,
                            saturation: 0
                        }
                    }
                });
                break;
        }

        camera.animate({
            scale: 1,
            time: config.duration * 1000,
            ease: "easeInOutQuad",
        });

        await gsap.to(container, {
            duration: config.duration,
            ease: "power2.Out",
            pixi: {
                colorMatrixFilter: {
                    contrast: 1,
                    brightness: endBrightness,
                    saturation: 1
                }
            }
        }).then();
        
        container.eventMode = "auto";
        this.activeScene.showUI();
        config.onComplete?.();
    }

    public static async FadeOut(config: FadeConfig) {
        if(!this.activeScene) return;
        const container = this.activeScene.rootContainer;
        const camera = this.activeScene.camera;
        let brightness = 0;

        switch (config.color) {
            case "black":
                brightness = 0;
                VRE.app.renderer.background.color = 0x000000;
                break;

            case "white":
                brightness = 10;
                VRE.app.renderer.background.color = 0xffffff;
                break;
        }

        container.eventMode = "none";
        this.activeScene.hiddenUI();
                
        switch (config.type) {
            case "normal":
                camera.animate({
                    scale: 1,
                    time: config.duration * 1000,
                    ease: "easeInOutQuad",
                });
                await gsap.to(container, {
                    duration: config.duration,
                    ease: "power2.in",
                    pixi: {
                        colorMatrixFilter: {
                            contrast: 10,
                            brightness: brightness,
                            saturation: 0
                        }
                    }
                }).then();
                break;

            case "zoom":
                camera.animate({
                    scale: 2,
                    time: config.duration * 1000,
                    ease: "easeInOutQuad",
                });
                await gsap.to(container, {
                    duration: config.duration,
                    ease: "power2.in",
                    pixi: {
                        colorMatrixFilter: {
                            contrast: 10,
                            brightness: brightness,
                            saturation: 0
                        }
                    }
                }).then();
                break;
        }

        container.eventMode = "auto";
        config.onComplete?.();
    }
}

type FadeConfig = {
    type: "normal" | "zoom";
    color: "white" | "black";
    duration: number;
    brightness?: number;
    onComplete?: () => void;
}
