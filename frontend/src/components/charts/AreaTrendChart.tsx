import React from "react"
import ReactECharts from "echarts-for-react"
import * as echarts from "echarts"
import { CHART_COLORS, FONT_FAMILY, rgba } from "./theme"

export interface AreaTrendChartProps {
  data: Array<{ bulan: string; nilai: number }>
  title?: string
  subTitle?: string
  height?: number | string
  color?: string
}

export const AreaTrendChart: React.FC<AreaTrendChartProps> = ({
  data,
  title,
  subTitle,
  height = 240,
  color = CHART_COLORS.primary,
}) => {
  const categories = data.map((d) => d.bulan)
  const values = data.map((d) => d.nilai)

  const option = {
    title: title
      ? {
          text: title,
          subtext: subTitle,
          textStyle: {
            fontFamily: FONT_FAMILY,
            fontSize: 14,
            fontWeight: "bold",
            color: CHART_COLORS.textPrimary,
          },
          subtextStyle: {
            fontSize: 11,
            color: CHART_COLORS.textTertiary,
          },
          top: 0,
          left: 0,
        }
      : undefined,
    tooltip: {
      trigger: "axis",
      backgroundColor: "#FFFFFF",
      borderColor: CHART_COLORS.border,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: {
        fontFamily: FONT_FAMILY,
        fontSize: 12,
        color: CHART_COLORS.textPrimary,
      },
      extraCssText: "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 10px;",
      formatter: (params: any) => {
        if (!params || !params[0]) return ""
        const p = params[0]
        return `
          <div style="font-weight: 700; margin-bottom: 4px; color: ${CHART_COLORS.textPrimary};">${p.name}</div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
            <span style="color: ${CHART_COLORS.textSecondary};">Jumlah Isu:</span>
            <strong style="color: ${CHART_COLORS.textPrimary};">${p.value}</strong>
          </div>
        `
      },
    },
    grid: {
      top: title ? 45 : 20,
      right: 15,
      bottom: 25,
      left: 35,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: CHART_COLORS.border } },
      axisLabel: {
        fontFamily: FONT_FAMILY,
        fontSize: 11,
        color: CHART_COLORS.textSecondary,
        fontWeight: 500,
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: "#F1F5F9",
          type: "dashed",
        },
      },
      axisLabel: {
        fontFamily: FONT_FAMILY,
        fontSize: 11,
        color: CHART_COLORS.textTertiary,
      },
    },
    series: [
      {
        name: "Isu Mismatch",
        type: "line",
        smooth: 0.35,
        data: values,
        symbol: "circle",
        symbolSize: 6,
        showSymbol: true,
        itemStyle: {
          color: color,
          borderWidth: 2,
          borderColor: "#FFFFFF",
        },
        lineStyle: {
          width: 3,
          color: color,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: rgba(color, 0.28) },
            { offset: 1, color: rgba(color, 0.0) },
          ]),
        },
      },
    ],
  }

  return (
    <div className="w-full" style={{ height }}>
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "svg" }}
        notMerge={true}
      />
    </div>
  )
}

export default AreaTrendChart
