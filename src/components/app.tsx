import * as React from "react";
import { Carousel } from 'carousel';

const MAX_ITEMS = 10;
const item = (index: number) => ({ name: `Item ${index}`, color: hsbToRgb(index * (360 / MAX_ITEMS), 100, 100) });
const items = new Array(MAX_ITEMS).fill(0).map((_, index) => item(index));

export function App() {
    const containerStyle: React.CSSProperties = {
        width: '600px',
        height: '200px',
        border: '1px solid black',
    };
    const itemStyle: React.CSSProperties = {
        width: '150px',
    };
    return <>
        <section style={containerStyle}>
            <Carousel>
                {items.map(x =>
                    <div key={x.name} style={{ ...itemStyle, backgroundColor: x.color }}>
                        {x.name}
                    </div>
                )}
            </Carousel>
        </section>
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