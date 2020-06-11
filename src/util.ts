import { Action } from "redux";

/**
 * Obtain the return type of a funciton type if the return type is a Redux Action
 */
// tslint:disable-next-line
export type ActionReturnType<F> = F extends (...args: any[]) => any ? ReturnType<F> extends Action ? ReturnType<F> : never : never;

/**
 * Obtain a union type representing the return types of any action factories on the given object type.
 * E.g.
 *     const factories = {
 *         makeA: A,
 *         makeB: B,
 *     };
 *     type FactoryTypes = ActionsFrom<typeof factories>; // A | B
 */
// tslint:disable-next-line
export type ActionsFrom<T> = { [K in keyof T]: ActionReturnType<T[K]> }[keyof T];


/**
 * Utility function to support reducer switches.
 * E.g.
 *     switch (action.type) {
 *         case "action1": return action1Reducer(state, action);
 *         case "action2": return action1Reducer(state, action);
 *         case "action3": return action1Reducer(state, action);
 *         default: assertNever(action);
 *     }
 *
 * @param _never Any value which should resolve to type `never`.
 */
export function assertNever(_never: never) {}


export function debounce<Fn extends Function>(ms: number, fn: Fn): Fn {
    let timeoutId: any;
    return <any> ((...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(args), ms);
    });
}

export function delayMs(ms: number): Promise<void> {
    return new Promise<void>((resolve, _reject) => {
        setTimeout(() => resolve(), ms);
    });
}