import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import type { VideoOverlay } from '../types';

type Props = {
  overlays: VideoOverlay[];
  currentTimeMs: number;
  width: number;
  height: number;
  toleranceMs?: number;
  draftOverlay?: VideoOverlay | null;
};

function clamp01(v: number) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function VideoOverlayLayer({
  overlays,
  currentTimeMs,
  width,
  height,
  toleranceMs = 400,
  draftOverlay = null,
}: Props) {
  const visible = useMemo(() => {
    if (!overlays?.length) return [];
    return overlays.filter((o) => Math.abs(currentTimeMs - o.tMs) <= toleranceMs);
  }, [overlays, currentTimeMs, toleranceMs]);

  const items = useMemo(() => {
    if (!draftOverlay) return visible;
    return [...visible, { ...draftOverlay, tMs: currentTimeMs }];
  }, [visible, draftOverlay, currentTimeMs]);

  if (!width || !height || items.length === 0) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      <Svg width={width} height={height}>
        {items.map((o, idx) => {
          const isDraft = (o as any)?.draft;
          const color = o.color || (isDraft ? '#94a3b8' : '#bb2b2b');
          const thickness = o.thickness || (isDraft ? 2 : 3);
          const opacity = isDraft ? 0.7 : 1;
          const dash = isDraft ? '4 3' : undefined;
          const x = clamp01(o.x) * width;
          const y = clamp01(o.y) * height;

          if (o.type === 'circle') {
            const diameter = Math.max(6, (o.w || 0.12) * width);
            const r = diameter / 2;
            return (
              <Circle
                key={idx}
                cx={x}
                cy={y}
                r={r}
                stroke={color}
                strokeWidth={thickness}
                fill="none"
                opacity={opacity}
                strokeDasharray={dash}
              />
            );
          }

          if (o.type === 'line' || o.type === 'arrow') {
            const x2 = clamp01(o.x + o.w) * width;
            const y2 = clamp01(o.y + o.h) * height;

            if (o.type === 'line') {
              return (
                <Line
                  key={idx}
                  x1={x}
                  y1={y}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth={thickness}
                  opacity={opacity}
                  strokeDasharray={dash}
                />
              );
            }

            const angle = Math.atan2(y2 - y, x2 - x);
            const headLen = 10;
            const hx1 = x2 - headLen * Math.cos(angle - Math.PI / 6);
            const hy1 = y2 - headLen * Math.sin(angle - Math.PI / 6);
            const hx2 = x2 - headLen * Math.cos(angle + Math.PI / 6);
            const hy2 = y2 - headLen * Math.sin(angle + Math.PI / 6);

            return (
              <G key={idx}>
                <Line
                  x1={x}
                  y1={y}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth={thickness}
                  opacity={opacity}
                  strokeDasharray={dash}
                />
                <Line
                  x1={x2}
                  y1={y2}
                  x2={hx1}
                  y2={hy1}
                  stroke={color}
                  strokeWidth={thickness}
                  opacity={opacity}
                  strokeDasharray={dash}
                />
                <Line
                  x1={x2}
                  y1={y2}
                  x2={hx2}
                  y2={hy2}
                  stroke={color}
                  strokeWidth={thickness}
                  opacity={opacity}
                  strokeDasharray={dash}
                />
              </G>
            );
          }

          if (o.type === 'text') {
            return (
              <SvgText
                key={idx}
                x={x}
                y={y}
                fill={color}
                fontSize={14}
                fontWeight="700"
                opacity={opacity}
              >
                {o.text || 'Note'}
              </SvgText>
            );
          }

          return null;
        })}
      </Svg>
    </View>
  );
}

export default memo(VideoOverlayLayer);
