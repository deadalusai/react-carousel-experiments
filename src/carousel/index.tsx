import * as React from "react";

import { classString } from "./util";
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

function itemInfoCacheEntry(el: HTMLElement) {
    const { offsetLeft, clientWidth } = el;
    return {
        el,
        offsetLeft: offsetLeft,
        itemWidth: clientWidth,
    };
}

enum ItemVisibility {
    notVisible,
    fullyVisible,
    partiallyVisible,
}

function calculateItemVisibility(viewport: ViewportInfo, item: ItemInfo): ItemVisibility {
    const itemLeft = item.offsetLeft;
    const itemRight = itemLeft + item.itemWidth;
    const isOutsideViewport = itemRight < viewport.viewportLeft || itemLeft > viewport.viewportRight;
    if (isOutsideViewport) {
        return ItemVisibility.notVisible;
    }
    // Item is partially or fully contained by viewport
    const visibleLeft = Math.max(itemLeft, viewport.viewportLeft);
    const visibleRight = Math.min(itemRight, viewport.viewportRight);
    const visibleWidth = visibleRight - visibleLeft;
    const visiblePercentage = visibleWidth / item.itemWidth;
    return (
        // We consider an item "fully visible" if at least 95% of it is visible
        (visiblePercentage >= 0.95) ? ItemVisibility.fullyVisible :
        // We consider an item "partially visible" if at least 5% of it is visible
        (visiblePercentage >= 0.05) ? ItemVisibility.partiallyVisible : ItemVisibility.notVisible
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
    
    private viewport = null as HTMLDivElement | null;
    private itemInfoCache = [] as Array<ItemInfo | null>;

    public render() {
        const lastItemIndex = this.props.children.length - 1;
        return <div className="bil-carousel">
            <div
                ref={el => this.viewport = el}
                className={classString(
                    "bil-carousel__container",
                    this.state.isFullyScrolledLeft && "bil-carousel__container--fully-scrolled-left",
                    this.state.isFullyScrolledRight && "bil-carousel__container--fully-scrolled-right"
                )}
                onScroll={() => this.handleScroll()}>
                
                {this.props.children.map((child, index) =>
                    <div
                        key={index}
                        ref={el => this.itemInfoCache[index] = el && itemInfoCacheEntry(el)}
                        className={classString(
                            "bil-carousel__item",
                            index === 0 && "bil-carousel__item--first",
                            index === lastItemIndex && "bil-carousel__item--last"
                        )}>
                        {child}
                    </div>
                )}

            </div>
            
            <div className="bil-carousel__controls">
                <button
                    className={classString(
                        "bil-carousel__button",
                        "bil-carousel__button--left",
                        this.state.isFullyScrolledLeft && "bil-carousel__button--disabled",
                    )}
                    onClick={e => this.goLeft(e)}
                    disabled={this.state.isFullyScrolledLeft}>
                    Prev
                </button>
                <button
                    className={classString(
                        "bil-carousel__button",
                        "bil-carousel__button--right",
                        this.state.isFullyScrolledRight && "bil-carousel__button--disabled",
                    )}
                    onClick={e => this.goRight(e)}
                    disabled={this.state.isFullyScrolledRight}>
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
        if (!this.viewport) {
            throw new Error("Tried to read viewport state before component mounted");
        }
        // NOTE: Always retrieve up-to-date information about the viewport (scroll position changes frequently)
        const { scrollLeft, clientWidth } = this.viewport;
        return {
            el: this.viewport,
            viewportWidth: clientWidth,
            viewportLeft: scrollLeft,
            viewportRight: scrollLeft + clientWidth,
        };
    }

    private itemInfo(index: number): ItemInfo {
        // NOTE: Item width and position information is assumed to be fixed/unchanging and is cached on mount
        const itemInfo = this.itemInfoCache[index];
        if (!itemInfo) {
            throw new Error("Tried to read item cache before component mounted");
        }
        return itemInfo;
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
            }
        });
    }
    
    private handleScroll() {
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
