// See:
var require = {
    // Note: baseUrl set at optimization stage (release) or in _Layout (dev)
    baseUrl: null, // "./generated"
    paths: {
        // Map library names to their physical location relative to baseUrl
        "react": "react/umd/react.development",
        "react-dom": "react-dom/umd/react-dom.development",
        "react-redux": "react-redux/dist/react-redux.min",
        "redux": "redux/dist/redux.min",
        "redux-form": "redux-form/dist/redux-form",
        "redux-saga": "redux-saga/dist/redux-saga.umd.min",
        "redux-saga/effects": "redux-saga/dist/redux-saga-effects.umd.min",
        "immutable": "immutable/dist/immutable.min",
        // Typescript support library
        "tslib": "tslib/tslib"
    }
};
if (typeof exports === 'object') {
    exports.config = require;
}