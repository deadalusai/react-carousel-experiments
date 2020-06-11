import * as React from "react";

import { Animator, AnimationHandle, easingFunctions } from "./animator";

const ANIMATION_TIME_MS = 300; // ms

interface Viewport {
    el: HTMLElement;
    viewportWidth: number;
    viewportLeft: number;
    viewportRight: number;
    itemWidth: number;
    itemCount: number;
}

enum ItemVisibility {
    notVisible,
    fullyVisible,
    partiallyVisible,
}

function itemVisibility(viewport: Viewport, itemIndex: number): ItemVisibility {
    const itemLeft = itemIndex * viewport.itemWidth;
    const itemRight = itemLeft + viewport.itemWidth;
    let visiblePercentage = 0;    
    const isOutsideViewport = itemRight < viewport.viewportLeft || itemLeft > viewport.viewportRight;
    if (!isOutsideViewport) {
        // Item is partially or fully contained by viewport
        let visibleLeft = Math.max(itemLeft, viewport.viewportLeft);
        let visibleRight = Math.min(itemRight, viewport.viewportRight);
        let visibleWidth = visibleRight - visibleLeft;
        visiblePercentage = visibleWidth / viewport.itemWidth;
    }
    return (
        // NOTE: We consider an item "fully visible" if at least 95% of it is visible
        (visiblePercentage >= 0.95) ? ItemVisibility.fullyVisible :
        // NOTE: We consider an item "partially visible" if at least 5% of it is visible
        (visiblePercentage >= 0.05) ? ItemVisibility.partiallyVisible :
            ItemVisibility.notVisible
    );
}

export interface ICarouselProps {
    children: React.ReactNode[];
}

interface ICarouselState {
    scrollIndex: number;
    isFullyScrolledLeft: boolean;
    isFullyScrolledRight: boolean;
}

export class Carousel extends React.Component<ICarouselProps, ICarouselState> {
    public state = {
        scrollIndex: 0,
        isFullyScrolledLeft: false,
        isFullyScrolledRight: false,
    };

    private animator = new Animator(easingFunctions.easeInOutQuad);
    private animation = null as AnimationHandle | null;
    private viewportEl = null as HTMLDivElement | null;

    public render() {
        return <div className="bil-carousel">
            <div className="bil-carousel--container" onScroll={this.handleScroll} ref={this.initializeViewport}>
                {this.props.children.map((child, index) =>
                    <div key={index} className="bil-carousel--item">
                        {child}
                    </div>
                )}
            </div>
            <div className="bil-carousel--controls">
                <button className="bil-carousel--button" onClick={this.goLeft} disabled={this.state.isFullyScrolledLeft}>
                    Prev
                </button>
                <button className="bil-carousel--button" onClick={this.goRight} disabled={this.state.isFullyScrolledRight}>
                    Next
                </button>
            </div>
        </div>;
    }

    public componentDidUpdate = (prevProps: ICarouselProps) => {
        if (this.props.children.length != prevProps.children.length) {
            this.updateScrollState();
        }
    };

    private initializeViewport = (el: HTMLDivElement) => {
        this.viewportEl = el;
        if (this.viewportEl) {
            this.updateScrollState();
        }
    };

    private viewport = (): Viewport => {
        if (!this.viewportEl) {
            throw new Error("Tried to read viewport before ref loaded");
        }
        const { scrollLeft, clientWidth, scrollWidth } = this.viewportEl;
        return {
            el: this.viewportEl,
            viewportWidth: clientWidth,
            viewportLeft: scrollLeft,
            viewportRight: scrollLeft + clientWidth,
            itemWidth: scrollWidth / this.props.children.length, // NOTE: Assuming all items are of equal width
            itemCount: this.props.children.length,
        };
    };
    
    private animateScrollToIndex = (targetIndex: number) => {
        if (this.animation) {
            this.animation.cancel();
        }
        const viewport = this.viewport();
        // Determine where we're scrolling to
        const scrollLeft = targetIndex * viewport.itemWidth;
        this.animation = this.animator.startAnimation(viewport.el, 'scrollLeft', scrollLeft, ANIMATION_TIME_MS);
        this.animation.end.then((completed) => {
            if (completed) {
                this.animation = null;
                this.updateScrollState();
            }
        });
    };
    
    private handleScroll = () => {
        if (this.animation) {
            // Skip updating scroll state while the animation is in progress
            return;
        }
        this.updateScrollState();
    };

    private updateScrollState = () => {
        const viewport = this.viewport();
        // Determine where we're scrolled to by finding the first fully-visible child from left to right
        let minPartialIndex = Infinity;
        let minVisibleIndex = Infinity;
        let maxVisibleIndex = 0;
        for (let itemIndex = 0; itemIndex < viewport.itemCount; itemIndex++) {
            const visibility = itemVisibility(viewport, itemIndex);
            if (visibility === ItemVisibility.partiallyVisible) {
                minPartialIndex = Math.min(minPartialIndex, itemIndex);
            }
            else if (visibility === ItemVisibility.fullyVisible) {
                minVisibleIndex = Math.min(minVisibleIndex, itemIndex);
                maxVisibleIndex = Math.max(maxVisibleIndex, itemIndex);
            }
        }
        // Handle empty collection or zero-width items
        if (!isFinite(minVisibleIndex)) {
            minVisibleIndex = 0;
        }
        // Handle no partially-visible items
        if (!isFinite(minPartialIndex)) {
            minPartialIndex = minVisibleIndex;
        }
        this.setState({
            scrollIndex: minPartialIndex,
            isFullyScrolledLeft: minVisibleIndex === 0,
            isFullyScrolledRight: maxVisibleIndex === (viewport.itemCount - 1),
        });
    };
    
    private goLeft = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        let scrollIndex = this.state.scrollIndex - 1;
        if (scrollIndex < 0) {
            scrollIndex = 0;
        }
        this.setState({ scrollIndex });
        this.animateScrollToIndex(scrollIndex);
    };
    
    private goRight = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        let scrollIndex = this.state.scrollIndex + 1;
        if (scrollIndex >= this.props.children.length) {
            scrollIndex = this.props.children.length - 1;
        }
        this.setState({ scrollIndex });
        this.animateScrollToIndex(scrollIndex);
    };
}
