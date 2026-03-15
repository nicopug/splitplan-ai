import { useRef } from 'react';

/**
 * useSpotlight hook
 * Returns a ref and an onMouseMove handler to apply a spotlight effect via CSS variables.
 * Usage:
 * const { ref, onMouseMove } = useSpotlight();
 * <div ref={ref} onMouseMove={onMouseMove} className="premium-card">...</div>
 */
export const useSpotlight = () => {
    const ref = useRef(null);

    const onMouseMove = (e) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ref.current.style.setProperty('--mouse-x', `${x}px`);
        ref.current.style.setProperty('--mouse-y', `${y}px`);
    };

    return { ref, onMouseMove };
};
