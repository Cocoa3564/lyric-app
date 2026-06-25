//外部ライブラリ
import * as PIXI from 'pixi.js';

//自作の必須ファイル
import * as config from "@/config.js";
import SceneManager from "@/core/sceneManager";
import { LayerType } from './scene';

const GAME_WIDTH = config.GAME_WIDTH;
const GAME_HEIGHT = config.GAME_HEIGHT;

export default class VisualRenderEngine {
    static app = new PIXI.Application();
    static scale: number;

    static async initialize() {
        const canvas = document.getElementById('pixiCanvas') as HTMLCanvasElement | null;

        await this.app.init({
            view: canvas ?? undefined,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            backgroundColor: 0x000000,
            antialias: true,
        });

        PIXI.Assets.init({
            basePath: '/src/assets'
        });

        if (!canvas) {
            document.body.appendChild(this.app.canvas);
        }
    }

    static async loadTexture({
        alias,
        type,
        name
    }: {
        alias?: string;
        type: 'background' | 'character' | 'icon' | 'texture' | 'ui' | 'font';
        name: string
    }) {
        const path = `../assets/${type}/${name}`;
        const assetUrl = new URL(path, import.meta.url).href;

        if (PIXI.Assets.cache.has(name)) {
            console.log(`${name}はすでにロードされています`);
            return;
        }

        if (PIXI.Assets.cache.has(alias ?? name) || PIXI.Assets.resolver.hasKey(alias ?? name)) {
            if (PIXI.Assets.cache.has(alias ?? name)) {
                console.log(`${alias ?? name}はすでにロードされています`);
                return;
            }
            await PIXI.Assets.load(alias ?? name);
            return;
        }

        if (type === "font") {
            const font = new FontFace(alias ?? name, `url(${assetUrl})`);
            await font.load();
            document.fonts.add(font);
        }

        PIXI.Assets.add({alias: alias ?? name, src: assetUrl})
        await PIXI.Assets.load(alias ?? name);
    }

    /**スプライトを生成する関数 */
    static newSprite({
        x = 0,
        y = 0,
        type,
        name,
        scale = 1,
    }: {
        x?: number;
        y?: number;
        /**画像の種類（background, character, icon, texture, uiのいずれか） */
        type: 'background' | 'character' | 'icon' | 'texture' | 'ui';
        /**画像のファイル名（拡張子も含む） */
        name: string;
        /**画像の倍率 */
        scale?: number;
    }) {
        const typeList = ["background", "character", "icon", "texture", "ui"];
        if (!typeList.includes(type)) {
            console.error(`画像タイプが存在しません！：${type}`);
            return null;
        }

        if (!PIXI.Assets.cache.has(name)) {
            console.error(`まだロードされていません！assetsUrlsに以下のファイルを追加しているか確認してください：${name}`);
            return null;
        }

        const texture = PIXI.Assets.get(name);

        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.x = x;
        sprite.y = y;
        return sprite;
    }

    /**スプライトを生成する関数（シーンに自動で追加する） */
    static createSprite({
        layer,
        x = 0,
        y = 0,
        type,
        name,
        scale = 1,
    }: {
        layer: LayerType;
        x?: number;
        y?: number;
        /**画像の種類（background, character, icon, texture, uiのいずれか） */
        type: 'background' | 'character' | 'icon' | 'texture' | 'ui';
        /**画像のファイル名（拡張子も含む） */
        name: string;
        /**画像の倍率 */
        scale?: number;
    }) {
        const sprite = this.newSprite({x: x, y: y, type: type, name: name, scale: scale});
        if (!sprite) return null;
        SceneManager.activeScene?.addChild(layer, sprite);
        return sprite;
    }

    /**スプライトを生成する関数 */
    static newTilingSprite({
        x = 0,
        y = 0,
        type,
        name,
    }: {
        x?: number;
        y?: number;
        /**画像の種類（background, character, icon, texture, uiのいずれか） */
        type: 'background' | 'character' | 'icon' | 'texture' | 'ui';
        /**画像のファイル名（拡張子も含む） */
        name: string;
    }) {
        const typeList = ["background", "character", "icon", "texture", "ui"];
        if (!typeList.includes(type)) {
            console.error(`画像タイプが存在しません！：${type}`);
            return;
        }

        if (!PIXI.Assets.cache.has(name)) {
            console.error(`まだロードされていません！assetsUrlsに以下のファイルを追加しているか確認してください：${name}`);
            return;
        }

        const texture = PIXI.Assets.get(name);

        const sprite = new PIXI.TilingSprite(texture);
        sprite.anchor.set(0.5);
        sprite.x = x;
        sprite.y = y;
        return sprite;
    }

    /**スプライトを生成する関数（シーンに自動で追加する） */
    static createTilingSprite({
        layer,
        x = 0,
        y = 0,
        width,
        type,
        name,
    }: {
        layer: LayerType;
        x?: number;
        y?: number;
        width?: number;
        /**画像の種類（background, character, icon, texture, uiのいずれか） */
        type: 'background' | 'character' | 'icon' | 'texture' | 'ui';
        /**画像のファイル名（拡張子も含む） */
        name: string;
    }) {
        const sprite = this.newTilingSprite({x: x, y: y, type: type, name: name});
        if (!sprite) return null;
        if (width) sprite.width = width;
        SceneManager.activeScene?.addChild(layer, sprite);
        return sprite;
    }

    /**スプライトのサイズを変更する関数 */
    static resizeSprite({
        sprite,
        width,
        height
    }: {
        sprite: PIXI.Sprite;
        /**リサイズ後の横幅 */
        width: number;
        /**リサイズ後の縦幅 */
        height: number;
    }) {
        if (!sprite.texture) {
            console.error("Spriteのテクスチャがロードされていません！");
            return;
        }
        sprite.width = width;
        sprite.height = height;
    }

    /**指定されたスプライトを画面いっぱいに表示する関数 */
    static fitSpriteToScreen({
        sprite,
        mode = "cover",
        scale = 1,
    }: {
        sprite: PIXI.Sprite | PIXI.TilingSprite;
        /**
         * modeの種類
         * cover - 画面を隙間なく埋める（はみ出す可能性あり）
         * contain - 全体が画面に収まる（余白が出る可能性あり）
         */
        mode?: 'cover' | 'contain';
        scale?: number;
    }) {


        if (!sprite.texture) {
            console.error("Spriteのテクスチャがロードされていません！");
            return null;
        }
        // スケール比率を計算
        const ratioX = GAME_WIDTH / sprite.texture.width;
        const ratioY = GAME_HEIGHT / sprite.texture.height;
        
        let _scale;
        if (mode === 'cover') {
            // 画面を隙間なく埋める（はみ出す可能性あり）
            _scale = Math.max(ratioX, ratioY) * scale;
        }
        else if (mode === "contain") {
            // 全体が画面に収まる（余白が出る可能性あり）
            _scale = Math.min(ratioX, ratioY) * scale;
        }
        else {
            console.error(`指定されたmodは存在しません！${mode}`);
            return null;
        }
        
        sprite.scale.set(_scale);

        return sprite;
    }


    /**円を生成する関数 */
    static newCircle({
        x = 0,
        y = 0,
        radius,
        color = null,
        alpha = 1,
        onEvent,
    }: {
        x?: number;
        y?: number;
        /**円の半径 */
        radius: number;
        /**色　例）0x000000 */
        color?: number | null;
        /**不透明度 */
        alpha?: number;
        /**クリック・タップ時に実行するイベント */
        onEvent?: (e: PIXI.FederatedPointerEvent) => void;
    }): PIXI.Graphics {
        const graphics = new PIXI.Graphics();
        graphics.circle(0, 0, radius);
        graphics.x = x;
        graphics.y = y;
        graphics.alpha = alpha;
        if (color !== null) {
            graphics.fill(color);
        }

        if (onEvent) {
            graphics.eventMode = 'static'; 
            graphics.cursor = 'pointer';
            graphics.on("pointerdown", onEvent);
            graphics.on("destroy", () => {
                graphics.off("pointerdown", onEvent);
            });
        }

        return graphics;
    }

    /**円を生成する関数（シーンに自動で追加する） */
    static createCircle({
        layer,
        x = 0,
        y = 0,
        radius,
        color = null,
        alpha = 1,
        onEvent,
    }: {
        layer: LayerType;
        x?: number;
        y?: number;
        /**円の半径 */
        radius: number;
        /**色　例）0x000000 */
        color?: number | null;
        /**不透明度 */
        alpha?: number;
        /**クリック・タップ時に実行するイベント */
        onEvent?: (e: PIXI.FederatedPointerEvent) => void;
    }): PIXI.Graphics {
        const graphics = this.newCircle({x: x, y: y, radius: radius, color: color, alpha: alpha, onEvent: onEvent});
        SceneManager.activeScene?.addChild(layer, graphics);
        return graphics;
    }

    
    /**長方形を生成する関数 */
    static newRect({
        x = 0,
        y = 0,
        width,
        height,
        color = null,
        alpha = 1,
        pivot,
        onEvent,
    }: {
        x?: number;
        y?: number;
        /**横幅 */
        width: number;
        /**縦幅 */
        height: number;
        /**色　例）0x000000 */
        color?: number | null;
        /**不透明度 */
        alpha?: number;
        /**基準点（0~1） */
        pivot?: {x: number, y: number};
        /**クリック・タップ時に実行するイベント */
        onEvent?: (e: PIXI.FederatedPointerEvent) => void;
    }): PIXI.Graphics {
        const graphics = new PIXI.Graphics();
        graphics.rect(0, 0, width, height);

        if (color) {
            graphics.fill({ color: color });
        } else {
            graphics.fill({ color: 0xffffff, alpha: 0 });
        }

        if (pivot) {
            graphics.pivot.set(width * pivot.x, height * pivot.y);
        }

        graphics.position.set(x, y);
        graphics.alpha = alpha;
        

        if (onEvent) {
            graphics.eventMode = 'static'; 
            graphics.cursor = 'pointer';
            graphics.on("pointerdown", onEvent);
            graphics.on("destroy", () => {
                graphics.off("pointerdown", onEvent);
            });
        }
        return graphics;
    }

    /**長方形を生成する関数（シーンに自動で追加する） */
    static createRect({
        layer,
        x = 0,
        y = 0,
        width,
        height,
        color = null,
        alpha = 1,
        pivot,
        onEvent,
    }: {
        layer: LayerType;
        x?: number;
        y?: number;
        /**横幅 */
        width: number;
        /**縦幅 */
        height: number;
        /**色　例）0x000000 */
        color?: number | null;
        /**不透明度 */
        alpha?: number;
        /**基準点（0~1） */
        pivot?: {x: number, y: number};
        /**クリック・タップ時に実行するイベント */
        onEvent?: (e: PIXI.FederatedPointerEvent) => void;
    }): PIXI.Graphics {
        const graphics = this.newRect({x: x, y: y, width: width, height: height, color: color, alpha: alpha, pivot: pivot, onEvent: onEvent});
        SceneManager.activeScene?.addChild(layer, graphics);
        return graphics;
    }

    /**テキストを生成する関数 */
    static newText({
        x = 0,
        y = 0,
        text,
        style = new PIXI.TextStyle({
            fontFamily: ["Helvetica", "Arial", "Hiragino Kaku Gothic ProN", "Meiryo", "sans-serif"],
            fontSize: 36, 
            fill: "#ffffff"
        }),
        alpha = 1,
    }: {
        x?: number;
        y?: number;
        text: string;
        style?: PIXI.TextStyle; 
        alpha?: number;
    }): PIXI.Text {
        const pixiText = new PIXI.Text({text: text, style: style});
        pixiText.anchor.set(0.5);
        pixiText.x = x;
        pixiText.y = y;
        pixiText.alpha = alpha;
        return pixiText;
    }

    /**テキストを生成する関数（シーンに自動で追加する） */
    static createText({
        layer,
        x = 0,
        y = 0,
        text,
        style = new PIXI.TextStyle({
            fontFamily: ["Helvetica", "Arial", "Hiragino Kaku Gothic ProN", "Meiryo", "sans-serif"],
            fontSize: 36, 
            fill: "#ffffff"
        }),
        alpha = 1,
    }: {
        layer: LayerType;
        x?: number;
        y?: number;
        text: string;
        style?: PIXI.TextStyle; 
        alpha?: number;
    }): PIXI.Text {
        const pixiText = this.newText({x: x, y: y, text: text, style: style, alpha: alpha});
        SceneManager.activeScene?.addChild(layer, pixiText);
        return pixiText;
    }
}