import '@testing-library/jest-dom';

// Carbon components use matchMedia (e.g. Modal, Header breakpoint detection).
// jsdom does not implement it — provide a minimal stub.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Carbon's useResizeObserver requires ResizeObserver — stub it out.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Carbon Modal calls scrollIntoView on focus — stub it.
window.HTMLElement.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};
