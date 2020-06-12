import * as React from "react";

import { Animator, AnimationHandle, easingFunctions } from "./animator";

const DEFAULT_ANIMATION_TIME_MS = 300; // ms
const DEFAULT_PAGE_SIZE = 1;

interface ViewportInfo {
    el: HTMLElement;
    viewportWidth: number;
    viewportLeft: number;
    viewportRight: number;
}

interface ItemInfo {
    el: HTMLElement;
    offsetLeft: number;
    itemWidth: number;
}

enum ItemVisibility {
    notVisible,
    fullyVisible,
    partiallyVisible,
}

function calculateItemVisibility(viewport: ViewportInfo, item: ItemInfo): ItemVisibility {
    const itemLeft = item.offsetLeft;
    const itemRight = itemLeft + item.itemWidth;
    let visiblePercentage = 0;    
    const isOutsideViewport = itemRight < viewport.viewportLeft || itemLeft > viewport.viewportRight;
    if (!isOutsideViewport) {
        // Item is partially or fully contained by viewport
        let visibleLeft = Math.max(itemLeft, viewport.viewportLeft);
        let visibleRight = Math.min(itemRight, viewport.viewportRight);
        let visibleWidth = visibleRight - visibleLeft;
        visiblePercentage = visibleWidth / item.itemWidth;
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
    animationTimeMs?: number;
    pageSize?: number;
    children: React.ReactNode[];
}

interface ICarouselState {
    scrollIndex: number;
    isFullyScrolledLeft: boolean;
    isFullyScrolledRight: boolean;
}

export class Carousel extends React.PureComponent<ICarouselProps, ICarouselState> {
    public state = {
        scrollIndex: 0,
        isFullyScrolledLeft: false,
        isFullyScrolledRight: false,
    };

    private animator = new Animator(easingFunctions.easeInOutQuad);
    private animation = null as AnimationHandle | null;
    
    private viewportElement = null as HTMLDivElement | null;
    private itemElements = [] as Array<HTMLDivElement | null>;

    public render() {
        return <div className="bil-carousel">
            <div className="bil-carousel--container" ref={el => this.viewportElement = el} onScroll={() => this.handleScroll()}>
                {this.props.children.map((child, index) =>
                    <div key={index} className="bil-carousel--item" ref={el => this.itemElements[index] = el}>
                        {child}
                    </div>)}
            </div>
            
            <div className="bil-carousel--controls">
                <button className="bil-carousel--button" onClick={e => this.goLeft(e)} disabled={this.state.isFullyScrolledLeft}>
                    Prev
                </button>
                {`scrollIndex: ${this.state.scrollIndex}`}
                <button className="bil-carousel--button" onClick={e => this.goRight(e)} disabled={this.state.isFullyScrolledRight}>
                    Next
                </button>
            </div>
        </div>;
    }

    public componentDidMount() {
        this.updateScrollState();
    }

    public componentDidUpdate(prevProps: ICarouselProps) {
        if (this.props.children.length != prevProps.children.length) {
            this.updateScrollState();
        }
    }

    public componentWillUnmount() {
        if (this.animation) {
            this.animation.cancel();
        }
    }

    private viewportInfo(): ViewportInfo {
        if (!this.viewportElement) {
            throw new Error("Tried to read viewport before component mounted");
        }
        const { scrollLeft, clientWidth } = this.viewportElement;
        return {
            el: this.viewportElement,
            viewportWidth: clientWidth,
            viewportLeft: scrollLeft,
            viewportRight: scrollLeft + clientWidth,
        };
    }

    private itemInfo(index: number): ItemInfo {
        const itemEl = this.itemElements[index];
        if (!itemEl) {
            throw new Error("Tried to read item before component mounted");
        }
        const { offsetLeft, clientWidth } = itemEl;
        return {
            el: itemEl,
            offsetLeft: offsetLeft,
            itemWidth: clientWidth,
        };
    }
    
    // TODO: Can we use CSS scroll-snap-type and scroll-snap-align?
    // The user interaction is nice, but not sure how to trigger scrolls programmatically.

    private animateScrollToIndex(targetIndex: number) {
        if (this.animation) {
            this.animation.cancel();
        }
        const viewport = this.viewportInfo();
        const item = this.itemInfo(targetIndex);
        const animationMs = this.props.animationTimeMs ?? DEFAULT_ANIMATION_TIME_MS;
        this.animation = this.animator.startAnimation(viewport.el, 'scrollLeft', item.offsetLeft, animationMs);
        this.animation.end.then((completed) => {
            if (completed) {
                this.animation = null;
                this.updateScrollState();
            }
        });
    }
    
    private handleScroll() {
        // Skip updating scroll state while the animation is in progress
        if (this.animation) {
            return;
        }
        this.updateScrollState();
    }

    private updateScrollState() {
        const itemCount = this.props.children.length;
        const viewport = this.viewportInfo();
        // Determine where we're scrolled to by finding the first fully-visible child from left to right
        let minPartialIndex = Infinity;
        let minVisibleIndex = Infinity;
        let maxVisibleIndex = 0;
        for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
            const item = this.itemInfo(itemIndex);
            const visibility = calculateItemVisibility(viewport, item);
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
        // The "scrollIndex" represents the left-most visible or partially visible item.
        const scrollIndex = Math.min(minVisibleIndex, minPartialIndex);
        this.setState({
            scrollIndex,
            isFullyScrolledLeft: itemCount === 0 || minVisibleIndex === 0,
            isFullyScrolledRight: itemCount === 0 || maxVisibleIndex === (itemCount - 1),
        });
    };
    
    private goLeft(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        let scrollIndex = this.state.scrollIndex - (this.props.pageSize ?? DEFAULT_PAGE_SIZE);
        if (scrollIndex < 0) {
            scrollIndex = 0;
        }
        this.setState({ scrollIndex });
        this.animateScrollToIndex(scrollIndex);
    };
    
    private goRight(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        const scrollIndex = this.state.scrollIndex + (this.props.pageSize ?? DEFAULT_PAGE_SIZE);
        this.setState({ scrollIndex });
        this.animateScrollToIndex(scrollIndex);
    }
}
