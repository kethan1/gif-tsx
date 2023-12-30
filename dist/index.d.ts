import { RefObject, MutableRefObject, DetailedHTMLProps, CanvasHTMLAttributes } from 'react';

type HTMLCanvasElementProps = DetailedHTMLProps<CanvasHTMLAttributes<HTMLCanvasElement>, HTMLCanvasElement>;
type GifControllerLoading = {
    state: "loading";
    canvasProps: HTMLCanvasElementProps;
};
type GifControllerError = {
    state: "error";
    canvasProps: HTMLCanvasElementProps;
    errorMessage: string;
};
type GifControllerResolved = {
    state: "resolved";
    canvasProps: HTMLCanvasElementProps;
    frameIndex: MutableRefObject<number>;
    playing: boolean;
    play: () => void;
    pause: () => void;
    restart: () => void;
    renderFrame: (frame: number) => void;
    renderNextFrame: () => void;
    renderPreviousFrame: () => void;
    width: number;
    height: number;
};
type GifController = GifControllerLoading | GifControllerResolved | GifControllerError;
/**
 * The core of the `gif-tsx` library. This hook exposes callbacks that allow a
 * React component to control a GIF playing within a canvas.
 *
 * @param url URL of the GIF to play.
 * @param canvas Ref to a `canvas` element.
 * @param autoplay Whether to autoplay the GIF on initial render. `false` by default.
 * @returns A GIF controller.
 */
declare function useGifController(url: string, canvas: RefObject<HTMLCanvasElement | null>, autoplay?: boolean): GifController;

export { useGifController };
