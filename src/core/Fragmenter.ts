import * as PIXI from "pixi.js";
import { Delaunay } from "d3-delaunay";
import { LayerType } from './scene';
import SceneManager from "./sceneManager";

interface Fragment {
  sprite: PIXI.Sprite;
  polygon: PIXI.Polygon;  // Voronoi セルの頂点
}

export default class Fragmenter {
    public fragments: Fragment[] = [];
    private originalSprite: PIXI.Sprite;
    private canvasWidth: number;
    private canvasHeight: number;
    private pointCount: number;
    private container: PIXI.Container;

    constructor({
        x,
        y,
        container,
        sprite,
        pointCount = 50,
        isRandom = false,
    }: {
        /**分割後のx座標 */
        x: number;
        /**分割後のy座標 */
        y: number;
        /**追加先のレイヤー */
        container: PIXI.Container;
        /**分割する元の Sprite */
        sprite: PIXI.Sprite;
        /**基準点の数（デフォルト: 50） */
        pointCount: number;
        /**配列の要素をランダムにする（オプション） */
        isRandom?: boolean;
    }) {
        this.container = new PIXI.Container({x: sprite.x, y: sprite.y});
        this.container.position.set(x, y);
        container.addChild(this.container);
        this.originalSprite = sprite;
        this.canvasWidth = sprite.width;
        this.canvasHeight = sprite.height;
        this.pointCount = pointCount;

        const points: number[][] = [];
        for (let i = 0; i < this.pointCount; i++) {
        const x = Math.random() * this.canvasWidth;
        const y = Math.random() * this.canvasHeight;
        points.push([x, y]);
        }
        
        if (points.length < 3) {
            this.container.destroy();
            return;
        }
        const pointsObj = points.map(([x, y]) => ({ x, y }));
        const delaunay = Delaunay.from(pointsObj, p => p.x, p => p.y);
        const voronoi = delaunay.voronoi([0, 0, this.canvasWidth, this.canvasHeight]);

        for (let i = 0; i < points.length; i++) {
            const cellPolygon = voronoi.cellPolygon(i);

            const polygonPoints = [];
            const points: PIXI.Point[] = [];
            for (const [x, y] of cellPolygon) {
                polygonPoints.push(x, y);
                points.push(new PIXI.Point(x, y));
            }

            const polygon = new PIXI.Polygon(polygonPoints);

            const container = new PIXI.Container();
            const maskGraphics = new PIXI.Graphics();
            maskGraphics
                .poly(polygonPoints)
                .fill(0xffffff)

            // スプライトにマスク適用
            const _sprite = new PIXI.Sprite(this.originalSprite.texture);
            _sprite.mask = maskGraphics;
            _sprite.x = 0;
            _sprite.y = 0;
            _sprite.alpha = 0;

            container.addChild(maskGraphics)
            container.addChild(_sprite);

            container.x = -this.originalSprite.width / 2;
            container.y = -this.originalSprite.height / 2;

            this.container.addChild(container);

            const fragment: Fragment = {
                sprite: _sprite,
                polygon: polygon,
            }

            this.fragments.push(fragment);
        }

        if (isRandom) {
            this.fragments = this.shuffle(this.fragments);
        }
    }

    private shuffle<T>(array: T[]) {
        const out = Array.from(array);
        for (let i = out.length - 1; i > 0; i--) {
            const r = Math.floor(Math.random() * (i + 1));
            const tmp = out[i];
            out[i] = out[r];
            out[r] = tmp;
        }
        return out;
    }
}