import { GifReader } from 'omggif';
import { useState, useRef, useEffect } from 'react';

/**
 * Function that accepts a `GifReader` instance and returns an array of
 * `ImageData` objects that represent the frames of the gif.
 *
 * @param gifReader The `GifReader` instance.
 * @returns An array of `ImageData` objects representing each frame of the GIF.
 * Or `null` if something went wrong.
 */
function extractFrames(gifReader) {
    const frames = [];
    // the width and height of the complete gif
    const { width, height } = gifReader;
    // This is the primary canvas that the tempCanvas below renders on top of. The
    // reason for this is that each frame stored internally inside the GIF is a
    // "diff" from the previous frame. To resolve frame 4, we must first resolve
    // frames 1, 2, 3, and then render frame 4 on top. This canvas accumulates the
    // previous frames.
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx)
        return null;
    for (let frameIndex = 0; frameIndex < gifReader.numFrames(); frameIndex++) {
        // the width, height, x, and y of the "dirty" pixels that should be redrawn
        const { width: dirtyWidth, height: dirtyHeight, x: dirtyX, y: dirtyY, disposal, delay, } = gifReader.frameInfo(0);
        // create hidden temporary canvas that exists only to render the "diff"
        // between the previous frame and the current frame
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
        if (!tempCtx)
            return null;
        // extract GIF frame data to tempCanvas
        const newImageData = tempCtx.createImageData(width, height);
        gifReader.decodeAndBlitFrameRGBA(frameIndex, newImageData.data);
        tempCtx.putImageData(newImageData, 0, 0, dirtyX, dirtyY, dirtyWidth, dirtyHeight);
        // Disposal Method 1: Leave the current graphic in place and draw next frame
        // on top of it.
        if (disposal === 0 || disposal === 1) {
            // draw the tempCanvas on top. ctx.putImageData(tempCtx.getImageData(...))
            // is too primitive here, since the pixels would be *replaced* by incoming
            // RGBA values instead of layered.
            ctx.drawImage(tempCanvas, 0, 0);
        }
        else if (disposal === 2) {
            // Disposal Method 2: Restore to background color.
            ctx.putImageData(tempCtx.getImageData(0, 0, dirtyWidth, dirtyHeight), 0, 0);
        }
        else ;
        frames.push({
            delay: delay * 10,
            imageData: ctx.getImageData(0, 0, width, height),
        });
    }
    return frames;
}

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * The core of the `gif-tsx` library. This hook exposes callbacks that allow a
 * React component to control a GIF playing within a canvas.
 *
 * @param url URL of the GIF to play.
 * @param canvas Ref to a `canvas` element.
 * @param autoplay Whether to autoplay the GIF on initial render. `false` by default.
 * @returns A GIF controller.
 */
function useGifController(url, canvas, autoplay = false) {
    var _a;
    const ctx = (_a = canvas.current) === null || _a === void 0 ? void 0 : _a.getContext("2d", { willReadFrequently: true });
    // asynchronous state variables strongly typed as a union such that properties
    // are only defined when `loading === true`.
    const [state, setState] = useState({ loading: true, error: false });
    // needs to update at least once to ensure access to ref
    const [shouldUpdate, setShouldUpdate] = useState(false);
    const [canvasAccessible, setCanvasAccessible] = useState(false);
    const frameIndex = useRef(-1);
    // state variable returned by hook
    const [playing, setPlaying] = useState(false);
    // ref that is used internally
    const _playing = useRef(false);
    // Load GIF on initial render and when url changes.
    useEffect(() => {
        function loadGif() {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(url);
                const buffer = yield response.arrayBuffer();
                const uInt8Array = new Uint8Array(buffer);
                // Type cast is necessary because GifReader expects Buffer, which extends
                // Uint8Array. Doesn't *seem* to cause any runtime errors, but I'm sure
                // there's some edge case I'm not covering here.
                const gifReader = new GifReader(uInt8Array);
                const frames = extractFrames(gifReader);
                if (!frames) {
                    setState({
                        loading: false,
                        error: true,
                        errorMessage: "Could not extract frames from GIF.",
                    });
                }
                else {
                    setState({ loading: false, error: false, gifReader, frames });
                    setShouldUpdate(true);
                }
            });
        }
        loadGif();
        // only run this effect on initial render and when URL changes.
    }, [url]);
    // update if shouldUpdate gets set to true
    useEffect(() => {
        if (shouldUpdate) {
            setShouldUpdate(false);
        }
        else if (canvas.current !== null) {
            setCanvasAccessible(true);
        }
    }, [canvas, shouldUpdate]);
    // if canvasAccessible is set to true, render first frame and then autoplay if
    // specified in hook arguments
    useEffect(() => {
        if (canvasAccessible && frameIndex.current === -1) {
            renderNextFrame();
            if (autoplay)
                setPlaying(true);
        }
        // ignore renderNextFrame as it is referentially unstable
        // eslint-disable-next-line
    }, [autoplay, canvasAccessible]);
    useEffect(() => {
        if (playing) {
            _playing.current = true;
            _iterateRenderLoop();
        }
        else {
            _playing.current = false;
        }
        // ignore _iterateRenderLoop() as it is referentially unstable
        // eslint-disable-next-line
    }, [playing]);
    if (state.loading === true || !canvas)
        return {
            state: "loading",
            canvasProps: { hidden: true },
        };
    if (state.error === true)
        return {
            state: "error",
            canvasProps: { hidden: true },
            errorMessage: state.errorMessage,
        };
    const { width, height } = state.gifReader;
    return {
        state: "resolved",
        canvasProps: { width, height },
        playing,
        play,
        pause,
        restart,
        frameIndex,
        renderFrame,
        renderNextFrame,
        renderPreviousFrame,
        width,
        height,
    };
    function play() {
        if (state.error || state.loading)
            return;
        if (playing)
            return;
        setPlaying(true);
    }
    function _iterateRenderLoop() {
        if (state.error || state.loading || !_playing.current)
            return;
        const delay = state.frames[frameIndex.current].delay;
        setTimeout(() => {
            renderNextFrame();
            _iterateRenderLoop();
        }, delay);
    }
    function pause() {
        setPlaying(false);
    }
    function restart() {
        frameIndex.current = 0;
    }
    function renderFrame(frameIndex) {
        if (!ctx || state.loading === true || state.error === true)
            return;
        if (frameIndex < 0 || frameIndex >= state.gifReader.numFrames())
            return;
        ctx.putImageData(state.frames[frameIndex].imageData, 0, 0);
    }
    function renderNextFrame() {
        if (!ctx || state.loading === true || state.error === true)
            return;
        const nextFrame = frameIndex.current + 1 >= state.gifReader.numFrames()
            ? 0
            : frameIndex.current + 1;
        renderFrame(nextFrame);
        frameIndex.current = nextFrame;
    }
    function renderPreviousFrame() {
        if (!ctx || state.loading === true || state.error === true)
            return;
        const prevFrame = frameIndex.current - 1 < 0
            ? state.gifReader.numFrames() - 1
            : frameIndex.current - 1;
        renderFrame(prevFrame);
        frameIndex.current = prevFrame;
    }
}

export { useGifController };
