/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactDOM from 'react-dom';

export const smoothTransition = (updateDOM: () => void) => {
    if (!(document as any).startViewTransition) {
        updateDOM();
        return;
    }

    (document as any).startViewTransition(() => {
        ReactDOM.flushSync(() => {
            updateDOM();
        });
    });
};
