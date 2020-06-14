
export const classString: (...fragments: Array<string | false | null | undefined>) => string = function () {
    let s = "", len = arguments.length;
    for (let i = 0; i < len; i++) {
        const a = arguments[i];
        if (a) {
            s += ((i === 0) ? "" : " ") + a;
        }
    }
    return s;
};