import React from "react"
import ReactECharts from "echarts-for-react"
import { CHART_COLORS, FONT_FAMILY } from "./theme"

export interface HorizontalBarChartProps {
  data: Array<{ nama: string; nilai: number; subLabel?: string; status?: "kritis" | "sedang" | "rendah"; color?: string }>
  title?: string
  subTitle?: string
  height?: number | string
  unit?: string
  colorByThreshold?: boolean
  showValueLabels?: boolean
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  title,
  subTitle,
  height = 240,
  unit = "",
  colorByThreshold = false,
  showValueLabels = true,
}) => {
  // Sort or preserve data (reverse so highest is on top in Y axis category)
  const reversedData = [...data].reverse()
  const categories = reversedData.map((d) => d.nama)

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
      axisPointer: { type: "shadow" },
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
          <div style="font-weight: 700; color: ${CHART_COLORS.textPrimary};">${p.name}</div>
          <div style="margin-top: 4px; color: ${CHART_COLORS.textSecondary};">
            Nilai: <strong style="color: ${CHART_COLORS.textPrimary};">${p.value} ${unit}</strong>
          </div>
        `
      },
    },
    grid: {
      top: title ? 45 : 15,
      right: 40,
      bottom: 15,
      left: 10,
      containLabel: true,
    },
    xAxis: {
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
        fontSize: 10,
        color: CHART_COLORS.textTertiary,
      },
    },
    yAxis: {
      type: "category",
      data: categories,
      axisLine: { lineStyle: { color: CHART_COLORS.border } },
      axisTick: { show: false },
      axisLabel: {
        fontFamily: FONT_FAMILY,
        fontSize: 11,
        color: CHART_COLORS.textSecondary,
        fontWeight: 600,
        formatter: (val: string) => (val.length > 18 ? `${val.slice(0, 16)}…` : val),
      },
    },
    series: [
      {
        name: "Nilai",
        type: "bar",
        data: reversedData.map((item) => {
          let itemColor = item.color || CHART_COLORS.primary
          if (!item.color && colorByThreshold) {
            if (item.nilai >= 70 || item.status === "kritis") {
              itemColor = CHART_COLORS.danger
            } else if (item.nilai >= 40 || item.status === "sedang") {
              itemColor = CHART_COLORS.warning
            } else {
              itemColor = CHART_COLORS.success
            }
          }
          return {
            value: item.nilai,
            itemStyle: {
              color: itemColor,
              borderRadius: [0, 6, 6, 0],
            },
          }
        }),
        barWidth: 14,
        label: {
          show: showValueLabels,
          position: "right",
          fontFamily: FONT_FAMILY,
          fontSize: 11,
          fontWeight: "bold",
          color: CHART_COLORS.textPrimary,
          formatter: (params: any) => `${params.value}${unit ? ` ${unit}` : ""}`,
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

export default HorizontalBarChart
