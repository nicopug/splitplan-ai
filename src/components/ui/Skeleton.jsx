import React from 'react';
import { cn } from '../../lib/utils';

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '2px', className = '' }) => {
    return (
        <div
            className={cn("shimmer bg-muted/10 animate-pulse transition-all duration-500", className)}
            style={{
                width,
                height,
                borderRadius,
            }}
        />
    );
};

export default Skeleton;
