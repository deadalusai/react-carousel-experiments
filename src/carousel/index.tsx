import * as React from "react";

import { classString } from "./util";

const DEFAULT_SCROLL_BEHAVIOR: CarouselScrollBehavior = "ScrollToLeft";
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
    offsetLeft: number;
    itemWidth: number;
}

interface ItemCacheEntry {
    el: HTMLDivElement;
    ref: React.LegacyRef<HTMLDivElement>;
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

export type CarouselScrollBehavior = "ScrollToLeft" | "ScrollToMiddle" | "ScrollToRight";

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
    currentScrollIndex: number;
    isFullyScrolledLeft: boolean;
    isFullyScrolledRight: boolean;
}

export class Carousel extends React.PureComponent<ICarouselProps, ICarouselState> {
    public state = {
        currentScrollIndex: 0,
        isFullyScrolledLeft: false,
        isFullyScrolledRight: false,
    };

    private viewport = null as HTMLDivElement | null;
    private itemCache = [] as Array<ItemCacheEntry | null>;

    public render() {
        const lastItemIndex = this.props.children.length - 1;
        const scrollBehavior = this.props.scrollBehavior ?? DEFAULT_SCROLL_BEHAVIOR;
        return (
            <div className={classString(
                "bil-carousel",
                this.state.isFullyScrolledLeft && "bil-carousel--fully-scrolled-left",
                this.state.isFullyScrolledRight && "bil-carousel--fully-scrolled-right",
                scrollBehavior === "ScrollToLeft" && "bil-carousel--snap-left",
                scrollBehavior === "ScrollToMiddle" && "bil-carousel--snap-middle",
                scrollBehavior === "ScrollToRight" && "bil-carousel--snap-right"
            )}>
                <div
                    ref={this.acceptViewportRef}
                    onScroll={() => this.handleScrollEvent()}
                    className="bil-carousel__container">
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
            </div>
        );
    }
    
    private acceptViewportRef: React.LegacyRef<HTMLDivElement> = (el) => {
        this.viewport = el;
        if (this.viewport && this.props.scrollIndex) {
            // At this stage all item refs should be cached.
            // We can now calculate and set the initial scroll offset.
            const viewport = this.getViewportInfo();
            const item = this.getItemInfo(this.props.scrollIndex);
            viewport.el.scrollLeft = this.getScrollOffset(viewport, item);
        }
    };

    private acceptItemRef(index: number): React.LegacyRef<HTMLDivElement> {
        // Do we already have an entry for this position?
        const cached = this.itemCache[index];
        if (cached) {
            return cached.ref;
        }
        // Construct a new ref callback which will populate the cache and handle cleanup.
        const ref: React.LegacyRef<HTMLDivElement> = (el) => {
            if (el) {
                // This DOM element is being added. Update the cache
                this.itemCache[index] = { el, ref };
            }
            else {
                // This DOM element is being removed. Clean up the cache
                this.itemCache[index] = null;
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
        const cached = this.itemCache[index];
        if (!cached) {
            throw new Error("Tried to read item cache before item mounted");
        }
        return {
            el: cached.el,
            itemWidth: cached.el.clientWidth,
            offsetLeft: cached.el.offsetLeft,
        };
    }

    private getScrollOffset(viewport: ViewportInfo, item: ItemInfo): number {
        const scrollBehavior = this.props.scrollBehavior ?? DEFAULT_SCROLL_BEHAVIOR;
        return (
            // Find the scroll target's offset within the viewport
            (scrollBehavior === "ScrollToLeft") ? item.offsetLeft :
            // Find the scrollLeft of the viewport required to place the item in the middle of the viewport.
            (scrollBehavior === "ScrollToMiddle") ? Math.max(0, item.offsetLeft - ((viewport.viewportWidth / 2) - (item.itemWidth / 2))) :
            // Find the scrollLeft of the viewport required to place the item in the middle of the viewport.
            (scrollBehavior === "ScrollToRight") ? Math.max(0, item.offsetLeft + item.itemWidth - viewport.viewportWidth):
            // Unknown scroll behavior    
            NaN
        );
    }
    
    private scrollToItem(targetScrollIndex: number) {
        const viewport = this.getViewportInfo();
        const item = this.getItemInfo(targetScrollIndex);
        const scrollOffset = this.getScrollOffset(viewport, item);
        // TODO: This test may not work on Safari?
        if (viewport.el.scrollTo) {
            viewport.el.scrollTo({ left: scrollOffset, behavior: "smooth", });
        }
        else {
            viewport.el.scrollLeft = scrollOffset;
        }
    }

    private updateScrollState() {
        const itemCount = this.props.children.length;
        const viewport = this.getViewportInfo();
        // Determine which index we're scrolled
        let middleOfViewportIndex = 0;
        let minPartialIndex = Infinity;
        let maxPartialIndex = 0;
        let minVisibleIndex = Infinity;
        let maxVisibleIndex = 0;
        for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
            const item = this.getItemInfo(itemIndex);
            const visibility = calculateItemVisibility(viewport, item);
            if (visibility === ItemVisibility.partiallyVisible) {
                minPartialIndex = Math.min(minPartialIndex, itemIndex);
                maxPartialIndex = Math.max(maxPartialIndex, itemIndex);
            }
            else if (visibility === ItemVisibility.fullyVisible) {
                minVisibleIndex = Math.min(minVisibleIndex, itemIndex);
                maxVisibleIndex = Math.max(maxVisibleIndex, itemIndex);
            }
            if (calculateIsItemInMiddleOfViewport(viewport, item)) {
                middleOfViewportIndex = itemIndex;
            }
        }
        const scrollBehavior = this.props.scrollBehavior ?? DEFAULT_SCROLL_BEHAVIOR;
        const currentScrollIndex = (
            // The "scrollIndex" represents the left-most visible or partially visible item
            (scrollBehavior === "ScrollToLeft") ? Math.min(minVisibleIndex, minPartialIndex) :
            // The "scrollIndex" represents the item straddling the middle of the viewport
            (scrollBehavior === "ScrollToMiddle") ? middleOfViewportIndex :
            // The "scrollIndex" represents the right-most visible or partially visible item
            (scrollBehavior === "ScrollToRight") ? Math.max(maxVisibleIndex, maxPartialIndex) :
            // Unknown scroll behavior    
            NaN
        );
        this.setState({
            currentScrollIndex,
            isFullyScrolledLeft: itemCount === 0 || minVisibleIndex === 0,
            isFullyScrolledRight: itemCount === 0 || maxVisibleIndex === (itemCount - 1),
        });
        // Notify the caller
        if (currentScrollIndex !== this.props.scrollIndex) {
            this.props.scrollIndexChanged?.(currentScrollIndex);
        }
    };
    
    private scrollLeft(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        // Pick a new scroll index
        const targetScrollIndex = Math.max(
            0,
            this.state.currentScrollIndex - (this.props.scrollPageSize ?? DEFAULT_SCROLL_PAGE_SIZE)
        );
        this.scrollToItem(targetScrollIndex);
    };
    
    private scrollRight(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        // Pick a new scroll index
        const targetScrollIndex = Math.min(
            this.props.children.length - 1,
            this.state.currentScrollIndex + (this.props.scrollPageSize ?? DEFAULT_SCROLL_PAGE_SIZE)
        );
        this.scrollToItem(targetScrollIndex);
    }
}
