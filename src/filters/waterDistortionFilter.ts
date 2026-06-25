import * as PIXI from "pixi.js";

import SceneManager from "@/core/sceneManager";
import * as config from "@/config";
import VRE from "@/core/visualRenderEngine";
import math from "@/utils/math";
import { LayerType } from "@/core/scene";

const FILTER_COUNT = config.FILTER_COUNT;
const NOISE_MIN_SPEED = config.NOISE_MIN_SPEED;
const NOISE_MAX_SPEED = config.NOISE_MAX_SPEED;
const NOISE_SCALE = config.NOISE_SCALE;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default class waterDistortion {
    static noiseList : Filter[] = [];

    //初期化する関数
    static async initialize() {
        const { width, height } = VRE.app.screen;

        for (let i = 0;i < FILTER_COUNT;i ++) {
            const textureUrl = new URL(`../assets/texture/tex_noise_p0${i+1}_normal.png`, import.meta.url).href;
            const texture = await PIXI.Assets.load(textureUrl);
            texture.source.addressMode = 'repeat';
            texture.source.scaleMode = 'linear';

            const sprite = new PIXI.Sprite ({
                texture: texture,
                width: width,
                height: height
            });

            const filter = new PIXI.DisplacementFilter({
                sprite: sprite,
                scale: NOISE_SCALE
            });

            const noise = new Filter({sprite: sprite, filter: filter});
            noise.randomSpeed(math.randomRange(NOISE_MIN_SPEED, NOISE_MAX_SPEED));

            this.noiseList.push(noise);
            VRE.app.stage.addChild(noise.sprite);
        }
    }


    static addShader(sprite: PIXI.Container, scale: number = NOISE_SCALE) {
        if (this.noiseList === null) {
            console.error("ノイズ画像のリストが存在しません！")
            return;
        }

        let filterList = [];
        for (let noise of this.noiseList) {
            noise.filter.scale.set(scale, scale);
            filterList.push(noise.filter);
        }

        sprite.filters = sprite.filters ? [...sprite.filters, ...filterList] : filterList;
    }

    static update(ticker : PIXI.Ticker) {
        //各ノイズの位置を更新
        for (let noise of this.noiseList) {
            noise.move(ticker);
        }
    }

    static setScale(scale: number) {
        for (let noise of this.noiseList) {
            noise.filter.scale.set(scale, scale);
        }
    }
}

class Filter {
    sprite: PIXI.Sprite;
    filter: PIXI.DisplacementFilter;
    speed: PIXI.Point;

    constructor({
        sprite,
        filter,
        speed = new PIXI.Point(NOISE_MIN_SPEED, 0)
    } : {
        /**フィルタ用の画像 */
        sprite: PIXI.Sprite;
        /**ディスプレイスメントフィルター */
        filter: PIXI.DisplacementFilter;
        /**ノイズの移動方向 */
        speed?: PIXI.Point;
    }) {
        this.sprite = sprite;
        this.filter = filter;
        this.speed = speed;
    }

    move(ticker: PIXI.Ticker) {
        this.sprite.x += this.speed.x * ticker.deltaTime;
        this.sprite.y += this.speed.y * ticker.deltaTime;
    }

    randomSpeed(length: number) {
        const randomAngle = Math.random() * Math.PI * 2;

        this.speed.x = Math.cos(randomAngle) * length;
        this.speed.y = Math.sin(randomAngle) * length;
    }

    destroy() {
        this.sprite.destroy();
        this.filter.destroy();
    }
}