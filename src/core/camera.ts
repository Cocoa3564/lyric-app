//外部ライブラリ
import { createNoise2D } from 'simplex-noise';
import { Viewport, IViewportOptions } from 'pixi-viewport';

import * as config from "@/config";
import VRE from "@/core/visualRenderEngine";

const GAME_WIDTH = config.GAME_WIDTH;
const GAME_HEIGHT = config.GAME_HEIGHT;

export default class Camera extends Viewport {
    public offset: {x: number, y: number} = {x: 0, y: 0};
    private scrollSpeed: {x: number, y: number} = {x: 0, y: 0};
    private noiseX = createNoise2D();
    private noiseY = createNoise2D();
    private time = 0;

    private worldPosition: {x: number, y: number} = {x: 0, y: 0};
    private shakeOffset: {x: number, y: number} = {x: 0, y: 0};

    constructor(options: IViewportOptions) {
        super(options);

        if (!options.screenHeight) return;
        if (!options.screenWidth) return;

        this.worldPosition = { x: 0, y: 0 };
        this.moveCenter(this.worldPosition.x, this.worldPosition.y);
    }

    // 毎フレーム自動で呼ばれるアップデート処理
    public update(elapsed: number): void {
        if (this.scrollSpeed.x !== 0 || this.scrollSpeed.y !== 0) {
            this.worldPosition.x += this.scrollSpeed.x;
            this.worldPosition.y += this.scrollSpeed.y;
        }

        if (this.shakeOffset.x !== 0 || this.shakeOffset.y !== 0) {
            this.moveCenter(
                this.worldPosition.x + this.shakeOffset.x,
                this.worldPosition.y + this.shakeOffset.y
            );
        }

        this.offset.x = this.left;
        this.offset.y = this.top;

        super.update(elapsed);
    }

    public shake({
        speed = 0.01,
        amount = 20,
    }: {
        speed?: number;
        amount?: number;
    }) {
        this.time += speed;

        this.shakeOffset.x = this.noiseX(this.time, 0) * amount;
        this.shakeOffset.y = this.noiseY(0, this.time) * amount;
    }

    public shakeEnd() {
        this.shakeOffset = {x: 0, y: 0};
    }

    public scrollStart({
        vx = 0,
        vy = 0,
    }: {
        vx?: number;
        vy?: number;
    } = {}) {
        if (vx == 0 && vy == 0) {
            console.error("x,yがどちらも0のためスクロールされません！");
            return;
        }

        this.scrollSpeed = {x: vx, y: vy};
    }

    public scrollEnd() {
        this.scrollSpeed = {x: 0, y: 0};
    }

    public override resize(width?: number, height?: number): void {
        if (!width) return;
        if (!height) return;

        super.resize(width, height, width, height);
        this.moveCenter(width / 2, height / 2)

        const scale = Math.max(
            width / GAME_WIDTH,
            height / GAME_HEIGHT
        );

        this.position.set(width / 2, height / 2);
        this.scale.set(scale, scale);
    }
}