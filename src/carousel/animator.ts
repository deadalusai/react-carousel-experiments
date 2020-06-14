
const CAN_ANIMATE = (
    typeof window.requestAnimationFrame === "function" &&
    typeof window.cancelAnimationFrame === "function"
);

export type EasingFunction = (time: number, start: number, delta: number, duration: number) => number;

export interface AnimationHandle {
    end: Promise<boolean>;
    cancel (): void;
}

// Add props you want to animate here
type ElementProperty = "scrollTop" | "scrollLeft";

const NULL_ANIMATION_HANDLE: AnimationHandle = {
    end: Promise.resolve(true),
    cancel: () => { return; },
};

export class Animator {

    constructor(private easingFunction: EasingFunction) {}

    public startAnimation (element: HTMLElement, property: ElementProperty, to: number, duration: number): AnimationHandle {
        if (!CAN_ANIMATE) {
            element[property] = to;
            return NULL_ANIMATION_HANDLE;
        }
        const from = element[property];
        const delta = to - from;

        let startTime: number | null = null; // NOTE: For the first frame we do not have a time reference.
        let animationHandle: number | null = null;
        let resolve: (result: boolean) => void; // Initialized by Promise constructor

        const end = new Promise<boolean>(res => resolve = res);

        const step = (timestamp: number) => {
            if (!startTime) {
                startTime = timestamp;
            }
            // Determine time delta.
            // NOTE: time = 0 for the first frame
            const time = timestamp - startTime;
            if (time <= duration) {
                // Find the value with the quadratic in-out easing function, then apply the scroll
                element[property] = this.easingFunction(time, from, delta, duration);
                animationHandle = requestAnimationFrame(step);
            } else {
                element[property] = to;
                animationHandle = null;
                resolve(true);
            }
        };

        const cancel = () => {
            if (animationHandle) {
                cancelAnimationFrame(animationHandle);
            }
            resolve(false);
        };

        // Start the animation
        animationHandle = requestAnimationFrame(step);
        return { end, cancel };
    }
}

// easing functions http://goo.gl/5HLl8

const easeInOutQuad: EasingFunction = (time, start, delta, duration) => {
    time /= duration / 2;
    if (time < 1) {
        return delta / 2 * time * time + start;
    }
    time--;
    return -delta / 2 * (time * (time - 2) - 1) + start;
};

export const easingFunctions = {
    easeInOutQuad,
};