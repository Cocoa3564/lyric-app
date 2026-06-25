
export default class MathUtil {
    /**指定した範囲の乱数を返す */
    static randomRange(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }
}