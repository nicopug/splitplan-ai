import React from 'react';

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', className = '' }) => {
    return (
        <div
            className={`shimmer ${className}`}
            style={{
                width,
                height,
                borderRadius,
                background: 'linear-gradient(90deg, rgba(24, 24, 46, 1) 25%, rgba(46, 46, 80, 1) 50%, rgba(24, 24, 46, 1) 75%)',
                backgroundSize: '200% 100%'
            }}
        />
    );
};

export default Skeleton;
