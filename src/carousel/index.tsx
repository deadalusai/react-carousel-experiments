import * as React from "react";

import { classString } from "./util";
import { Animator, AnimationHandle, easingFunctions } from "./animator";

const DEFAULT_SCROLL_BEHAVIOR: CarouselScrollBehavior = "ScrollToLeft";
const DEFAULT_SCROLL_DURATION_MS = 300; // ms
const DEFAULT_SCROLL_PAGE_SIZE = 1;

interface ViewportInfo {
    el: HTMLDivElement;
    viewportWidth: number;
    viewportLeft: number;
    viewportRight: number;
    viewportCenter: number;
}

interface ItemInfo {
    el: HTMLDivElement;
    ref: React.LegacyRef<HTMLDivElement>,
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

function calculateIsItemInMiddleOfViewport(viewport: ViewportInfo, item: ItemInfo): boolean {
    const itemLeft = item.offsetLeft;
    const itemRight = itemLeft + item.itemWidth;
    return itemLeft <= viewport.viewportCenter && itemRight >= viewport.viewportCenter;
}

export type CarouselScrollBehavior = "ScrollToLeft" | "ScrollToMiddle";

export interface ICarouselProps {
    /** The time in MS over which the animation should play */
    scrollDurationMs?: number;
    
    /** The number of items to scroll with each click of the next/prev buttons */
    scrollPageSize?: number;

    /** The index of the initial item to scroll to */
    scrollIndex?: number;

    /** Callback invoked when the current scroll index changes */
    scrollIndexChanged?: (scrollIndex: number) => void;

    /** The behavior which determine where in the viewport a given item will be scrolled _to_. */
    scrollBehavior?: CarouselScrollBehavior,
    
    /** The list of nodes which make up the scrolling items in this carousel */
    children: React.ReactNode[];
}

interface ICarouselState {
    targetScrollIndex: number;
    currentScrollIndex: number;
    isFullyScrolledLeft: boolean;
    isFullyScrolledRight: boolean;
}

export class Carousel extends React.PureComponent<ICarouselProps, ICarouselState> {
    public state = {
        targetScrollIndex: 0,
        currentScrollIndex: 0,
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
                ref={this.acceptViewportRef}
                onScroll={() => this.handleScrollEvent()}
                className={classString(
                    "bil-carousel__container",
                    this.state.isFullyScrolledLeft && "bil-carousel__container--fully-scrolled-left",
                    this.state.isFullyScrolledRight && "bil-carousel__container--fully-scrolled-right"
                )}>
                
                {this.props.children.map((child, index) =>
                    <div
                        key={index}
                        ref={this.acceptItemRef(index)}
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
                    onClick={e => this.scrollLeft(e)}
                    disabled={this.state.isFullyScrolledLeft}>
                    Prev
                </button>
                <div>
                    <p>{`current: ${this.state.currentScrollIndex}`}</p>
                    <p>{`target: ${this.state.targetScrollIndex}`}</p>
                </div>
                <button
                    className={classString(
                        "bil-carousel__button",
                        "bil-carousel__button--right",
                        this.state.isFullyScrolledRight && "bil-carousel__button--disabled",
                    )}
                    onClick={e => this.scrollRight(e)}
                    disabled={this.state.isFullyScrolledRight}>
                    Next
                </button>
            </div>
        </div>;
    }
    
    private acceptViewportRef: React.LegacyRef<HTMLDivElement> = (el) => {
        this.viewport = el;
        if (this.viewport && this.props.scrollIndex) {
            // At this stage all item refs should be caches.
            // We can now calculate and set the initial scroll offset.
            const viewport = this.getViewportInfo();
            const item = this.getItemInfo(this.props.scrollIndex);
            this.viewport.scrollLeft = this.getScrollOffset(viewport, item);
        }
    };

    private acceptItemRef(index: number): React.LegacyRef<HTMLDivElement> {
        // Do we already have an entry for this position?
        const cached = this.itemInfoCache[index];
        if (cached) {
            return cached.ref;
        }
        // Construct a new ref callback which will populate the cache and handle cleanup.
        const ref: React.LegacyRef<HTMLDivElement> = (el) => {
            if (el) {
                // This DOM element is being added. Update the cache
                const { offsetLeft, clientWidth } = el;
                this.itemInfoCache[index] = { el, ref, offsetLeft, itemWidth: clientWidth };
            }
            else {
                // This DOM element is being removed. Clean up the cache
                this.itemInfoCache[index] = null;
            }
        };
        return ref;
    };

    public componentDidMount() {
        this.updateScrollState();
    }

    public componentDidUpdate(prevProps: ICarouselProps) {
        if (this.props.scrollIndex !== undefined &&
            this.props.scrollIndex !== prevProps.scrollIndex &&
            this.props.scrollIndex !== this.state.currentScrollIndex) {
            this.scrollToItem(this.props.scrollIndex);
        }
        else if (this.props.children.length != prevProps.children.length) {
            this.updateScrollState();
        }
    }

    public componentWillUnmount() {
        if (this.animation) {
            this.animation.cancel();
        }
    }
    
    private handleScrollEvent() {
        this.updateScrollState();
    }

    private getViewportInfo(): ViewportInfo {
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
            viewportCenter: scrollLeft + (clientWidth / 2),
        };
    }

    private getItemInfo(index: number): ItemInfo {
        if (index < 0 || index > this.props.children.length) {
            throw new Error(`Item index out of bounds: ${index}`);
        }
        // NOTE: Item width and position information is assumed to be fixed/unchanging and is cached on mount
        const itemInfo = this.itemInfoCache[index];
        if (!itemInfo) {
            throw new Error("Tried to read item cache before item mounted");
        }
        return itemInfo;
    }

    private getScrollOffset(viewport: ViewportInfo, item: ItemInfo): number {
        const scrollBehavior = this.props.scrollBehavior ?? DEFAULT_SCROLL_BEHAVIOR;
        return (
            // Find the scroll target's offset within the viewport
            (scrollBehavior === "ScrollToLeft") ? item.offsetLeft :
            // Find the scrollLeft of the viewport required to place the item in the middle of the viewport.
            (scrollBehavior === "ScrollToMiddle") ? Math.max(0, item.offsetLeft - ((viewport.viewportWidth / 2) - (item.itemWidth / 2))) :
            // Unknown scroll behavior    
            NaN
        );
    }
    
    // TODO: Can we use CSS scroll-snap-type and scroll-snap-align?
    // The user interaction is nice, but not sure how to trigger scrolls programmatically.

    private scrollToItem(targetScrollIndex: number) {
        this.setState({ targetScrollIndex });
        if (this.animation) {
            this.animation.cancel();
        }
        const durationMs = this.props.scrollDurationMs ?? DEFAULT_SCROLL_DURATION_MS;
        const viewport = this.getViewportInfo();
        const item = this.getItemInfo(targetScrollIndex);
        const scrollOffset = this.getScrollOffset(viewport, item);
        this.animation = this.animator.startAnimation(viewport.el, 'scrollLeft', scrollOffset, durationMs);
        this.animation.end.then((completed) => {
            if (completed) {
                this.animation = null;
            }
        });
    }

    private updateScrollState() {
        const itemCount = this.props.children.length;
        const viewport = this.getViewportInfo();
        // Determine which index we're scrolled
        let middleOfViewportIndex = 0;
        let minPartialIndex = Infinity;
        let minVisibleIndex = Infinity;
        let maxVisibleIndex = 0;
        for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
            const item = this.getItemInfo(itemIndex);
            const visibility = calculateItemVisibility(viewport, item);
            if (visibility === ItemVisibility.partiallyVisible) {
                minPartialIndex = Math.min(minPartialIndex, itemIndex);
            }
            else if (visibility === ItemVisibility.fullyVisible) {
                minVisibleIndex = Math.min(minVisibleIndex, itemIndex);
                maxVisibleIndex = Math.max(maxVisibleIndex, itemIndex);
            }
            if (calculateIsItemInMiddleOfViewport(viewport, item)) {
                middleOfViewportIndex = itemIndex;
            }
        }
        // Handle empty collection or zero-width items
        if (!isFinite(minVisibleIndex)) {
            minVisibleIndex = 0;
        }
        const scrollBehavior = this.props.scrollBehavior ?? DEFAULT_SCROLL_BEHAVIOR;
        const currentScrollIndex = (
            // The "scrollIndex" represents the left-most visible or partially visible item
            (scrollBehavior === "ScrollToLeft") ? Math.min(minVisibleIndex, minPartialIndex) :
            // The "scrollIndex" represents the item straddling the middle of the viewport
            (scrollBehavior === "ScrollToMiddle") ? middleOfViewportIndex :
            // Unknown scroll behavior    
            NaN
        );
        this.setState({
            currentScrollIndex,
            isFullyScrolledLeft: itemCount === 0 || minVisibleIndex === 0,
            isFullyScrolledRight: itemCount === 0 || maxVisibleIndex === (itemCount - 1),
        });
        // Notify the caller as long as we're not currently animating.
        if (currentScrollIndex !== this.props.scrollIndex && !this.animation) {
            this.props.scrollIndexChanged?.(currentScrollIndex);
        }
    };
    
    private scrollLeft(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        // Pick a new scroll index
        // NOTE: If an animation is in progress then treat the "target" index as if it has already been scrolled to
        const currentScrollIndex = this.animation ? this.state.targetScrollIndex : this.state.currentScrollIndex;
        const targetScrollIndex = Math.max(
            0,
            currentScrollIndex - (this.props.scrollPageSize ?? DEFAULT_SCROLL_PAGE_SIZE)
        );
        this.scrollToItem(targetScrollIndex);
    };
    
    private scrollRight(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        // Pick a new scroll index
        // NOTE: If an animation is in progress then treat the "target" index as if it has already been scrolled to
        const currentScrollIndex = this.animation ? this.state.targetScrollIndex : this.state.currentScrollIndex;
        const targetScrollIndex = Math.min(
            this.props.children.length - 1,
            currentScrollIndex + (this.props.scrollPageSize ?? DEFAULT_SCROLL_PAGE_SIZE)
        );
        this.scrollToItem(targetScrollIndex);
    }
}
