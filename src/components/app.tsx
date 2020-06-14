import * as React from "react";
import { Carousel } from 'carousel';

const item = (index: number, max: number, fixedWidth: boolean) => {
    return {
        name: `Item ${index}`,
        width: fixedWidth ? '150px' : `${150 + Math.round(Math.cos((Math.PI / 2) * index) * 25)}px`,
        color: hsbToRgb(index * (360 / max), 100, 100),
    };
};
const makeItems = (count: number, fixedWidth: boolean) => new Array(count).fill(0).map((_, index) => item(index, count, fixedWidth));

export function App() {
    const [fixedWidthItems, setFixedWidthItems] = React.useState(true);
    const [itemCount, setItemCount] = React.useState(15);
    const [showCarousel, setShowCarousel] = React.useState(true);
    const [scrollToMiddle, setScrollToMiddle] = React.useState(true);
    const [scrollIndex, setScrollIndex] = React.useState(6);
    const items = makeItems(itemCount, fixedWidthItems);
    const containerStyle: React.CSSProperties = {
        height: '200px',
        width: '750px', // 5 x 150
        border: '1px solid black',
    };
    return <>
        {showCarousel &&
            <section style={containerStyle}>
                <Carousel
                    scrollPageSize={3}
                    scrollBehavior={scrollToMiddle ? "ScrollToMiddle" : "ScrollToLeft"}
                    scrollDurationMs={300}
                    scrollIndex={scrollIndex}
                    scrollIndexChanged={setScrollIndex}>
                    {items.map(x =>
                        <div key={x.name} style={{ width: x.width, backgroundColor: x.color }}>
                            <h4>{x.name}</h4>
                            <p>({x.width})</p>
                        </div>)}
                </Carousel>
            </section>}
        <div>
            {`scrollIndex: ${scrollIndex}`}
        </div>
        <button onClick={() => setItemCount(itemCount + 1)}>
            Add item
        </button>
        <button onClick={() => setItemCount(Math.max(0, itemCount - 1))}>
            Remove item
        </button>
        <button onClick={() => setFixedWidthItems(!fixedWidthItems)}>
            Use {fixedWidthItems ? "variable" : "fixed"} width items
        </button>
        <button onClick={() => setShowCarousel(!showCarousel)}>
            {showCarousel ? "Hide carousel" : "Show carousel"}
        </button>
        <button onClick={() => setScrollToMiddle(!scrollToMiddle)}>
            Set scroll mode to {scrollToMiddle ? "ScrollToLeft" : "ScrollToMiddle"}
        </button>
        <button onClick={() => setScrollIndex(5)}>
            Scroll to 5
        </button>
        {showCarousel &&
            <section style={{ ...containerStyle, width: "150px" }}>
                <Carousel
                    scrollPageSize={1}
                    scrollBehavior={scrollToMiddle ? "ScrollToMiddle" : "ScrollToLeft"}
                    scrollDurationMs={300}
                    scrollIndex={scrollIndex}
                    scrollIndexChanged={setScrollIndex}>
                    {items.map(x =>
                        <div key={x.name} style={{ width: x.width, backgroundColor: x.color }}>
                            <h4>{x.name}</h4>
                            <p>({x.width})</p>
                        </div>)}
                </Carousel>
            </section>}
            
        {showCarousel &&
            <section style={{ ...containerStyle, width: "100%" }}>
                <Carousel
                    scrollPageSize={2}
                    scrollBehavior={scrollToMiddle ? "ScrollToMiddle" : "ScrollToLeft"}
                    scrollDurationMs={300}
                    scrollIndex={scrollIndex}
                    scrollIndexChanged={setScrollIndex}>
                    {items.map(x =>
                        <div key={x.name} style={{ width: x.width, backgroundColor: x.color }}>
                            <h4>{x.name}</h4>
                            <p>({x.width})</p>
                        </div>)}
                </Carousel>
            </section>}
            
        {showCarousel &&
            <section style={{ ...containerStyle, height: "400px" }}>
                <Carousel
                    scrollPageSize={3}
                    scrollBehavior={"ScrollToLeft"}
                    scrollDurationMs={300}
                    scrollIndex={scrollIndex}
                    scrollIndexChanged={setScrollIndex}>
                    {items.map(x =>
                        <div key={x.name} style={{ width: x.width, backgroundColor: x.color }}>
                            <h4>{x.name}</h4>
                            <p>({x.width})</p>
                        </div>)}
                </Carousel>
            </section>}
    </>;
}

function hex(v: number): string {
    const c = v.toString(16);
    return (c.length < 2) ? `0${c}` : c;
}
function hsbToRgb(hi: number, si: number, bi: number) {
    let h = Math.round(hi);
    let s = Math.round(si * 255 / 100);
    let v = Math.round(bi * 255 / 100);
    let r = 0, g = 0, b = 0;
    if (s == 0) {
        r = g = b = v;
    }
    else {
        var t1 = v;
        var t2 = (255 - s) * v / 255;
        var t3 = (t1 - t2) * (h % 60) / 60;
        if (h == 360) { h = 0; }
        if (h < 60) { r = t1; b = t2; g = t2 + t3 }
        else if (h < 120) { g = t1; b = t2; r = t1 - t3 }
        else if (h < 180) { g = t1; r = t2; b = t2 + t3 }
        else if (h < 240) { b = t1; r = t2; g = t1 - t3 }
        else if (h < 300) { b = t1; g = t2; r = t2 + t3 }
        else if (h < 360) { r = t1; g = t2; b = t1 - t3 }
        else { r = 0; g = 0; b = 0 }
    }
    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);
    return `#${hex(r)}${hex(g)}${hex(b)}`   
}