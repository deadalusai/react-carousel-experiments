
const CAN_ANIMATE = !!window.requestAnimationFrame;
const DEFAULT_DURATION = 350;

export interface AnimationHandle {
    end: Promise<boolean>;
    cancel (): void;
}

type ElementProperty = 'scrollTop' | 'scrollLeft';

// easing functions http://goo.gl/5HLl8
function easeInOutQuad (time: number, start: number, delta: number, duration: number): number {
    time /= duration / 2;
    if (time < 1) {
        return delta / 2 * time * time + start;
    }
    time--;
    return -delta / 2 * (time * (time - 2) - 1) + start;
}

const NULL_ANIMATION_HANDLE: AnimationHandle = {
    end: Promise.resolve(true),
    cancel: () => { return; },
};

export class Animator {

    public scrollToLeft (element: HTMLElement, to: number, duration?: number): AnimationHandle {
        return this.tryStartAnimation(element, 'scrollLeft', to, duration ?? DEFAULT_DURATION);
    }

    public scrollToTop (element: HTMLElement, to: number, duration?: number): AnimationHandle {
        return this.tryStartAnimation(element, 'scrollTop', to, duration ?? DEFAULT_DURATION);
    }

    private tryStartAnimation (element: HTMLElement, property: ElementProperty, to: number, duration: number): AnimationHandle {
        if (!CAN_ANIMATE) {
            element[property] = to;
            return NULL_ANIMATION_HANDLE;
        }
        const start = element[property];
        const change = to - start;

        let startTime: number | null = null; // NOTE: For the first frame we do not have a time reference.
        let animationHandle: number | null = null;
        let resolve: (result: boolean) => void; // Initialized by Promise constructor

        const complete = new Promise<boolean>(res => resolve = res);

        const step = (timestamp: number) => {
            if (!startTime) {
                startTime = timestamp;
            }
            // Determine time delta.
            // NOTE: time = 0 for the first frame
            let time = timestamp - startTime;
            if (time <= duration) {
                // Find the value with the quadratic in-out easing function, then apply the scroll
                element[property] = easeInOutQuad(time, start, change, duration);
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
        return { end: complete, cancel };
    }
}