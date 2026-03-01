import React from 'react';

export const SkeletonBox = ({ className = '', style = {} }) => (
    <div
        className={`shimmer rounded-lg ${className}`}
        style={{
            minHeight: '20px',
            width: '100%',
            opacity: 0.1,
            ...style
        }}
    />
);

export const SkeletonDashboard = () => (
    <div className="section animate-fade-in">
        <div className="container max-w-6xl space-y-12">
            {/* Header Skeleton */}
            <div className="flex justify-between items-end pb-8 border-b border-white/5">
                <div className="space-y-3 w-1/3">
                    <SkeletonBox className="h-4 w-24" />
                    <SkeletonBox className="h-10 w-full" />
                </div>
                <div className="flex gap-2">
                    <SkeletonBox className="h-10 w-32 rounded-full" />
                    <SkeletonBox className="h-10 w-10 rounded-full" />
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    <SkeletonBox className="h-[400px] rounded-3xl" />
                    <div className="grid grid-cols-2 gap-4">
                        <SkeletonBox className="h-32 rounded-2xl" />
                        <SkeletonBox className="h-32 rounded-2xl" />
                    </div>
                </div>
                <div className="lg:col-span-4 space-y-6">
                    <SkeletonBox className="h-64 rounded-3xl" />
                    <SkeletonBox className="h-48 rounded-3xl" />
                </div>
            </div>
        </div>
    </div>
);
