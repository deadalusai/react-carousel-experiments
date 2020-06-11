import * as React from "react";

import { Animator, AnimationHandle, easingFunctions } from "./animator";

const ANIMATION_TIME_MS = 300; // ms

export interface ICarouselProps {
    children: React.ReactNode[];
}

interface ICarouselState {
    scrollIndex: number;
}

export class Carousel extends React.Component<ICarouselProps, ICarouselState> {
    state = { scrollIndex: 0 };

    animator = new Animator(easingFunctions.easeInOutQuad);
    animation = null as AnimationHandle | null;
    container = null as HTMLDivElement | null;

    public render() {
        return <div className="bil-carousel">
            <div className="bil-carousel--container" onScroll={this.handleScroll} ref={(e) => this.container = e}>
                {this.props.children.map((child, index) =>
                    <div key={index} className="bil-carousel--item">
                        {child}
                    </div>
                )}
            </div>
            <div className="bil-carousel--controls">
                <button className="bil-carousel--button" onClick={this.goLeft}>
                    Prev
                </button>
                <button className="bil-carousel--button" onClick={this.goRight}>
                    Next
                </button>
            </div>
        </div>;
    }

    itemWidth = () => {
        const scrollWidth = this.container?.scrollWidth ?? 0;
        return scrollWidth / this.props.children.length; // NOTE: Assuming all items are of equal width
    };
    
    animateScroll = (targetScrollIndex: number) => {
        if (!this.container) {
            return;
        }
        if (this.animation) {
            this.animation.cancel();
        }
        const scrollLeft = targetScrollIndex * this.itemWidth();
        this.animation = this.animator.startAnimation(this.container, 'scrollLeft', scrollLeft, ANIMATION_TIME_MS);
        this.animation.end.then((completed) => {
            if (completed) {
                this.animation = null;
            }
        });
    };
    
    handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (this.animation) {
            return;
        }
        const scrollIndex = Math.floor(e.currentTarget.scrollLeft / this.itemWidth());
        this.setState({ scrollIndex });
    };
    
    goLeft = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        let scrollIndex = this.state.scrollIndex - 1;
        if (scrollIndex < 0) {
            scrollIndex = 0;
        }
        this.setState({ scrollIndex });
        this.animateScroll(scrollIndex);
    };
    
    goRight = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        let scrollIndex = this.state.scrollIndex + 1;
        if (scrollIndex >= this.props.children.length) {
            scrollIndex = this.props.children.length - 1;
        }
        this.setState({ scrollIndex });
        this.animateScroll(scrollIndex);
    };
}
