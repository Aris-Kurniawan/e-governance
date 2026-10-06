import React from "react"
import ReactECharts from "echarts-for-react"
import { CHART_COLORS, CHART_PALETTE, FONT_FAMILY } from "./theme"

export interface DamageDonutChartProps {
  data: Array<{ name: string; value: number; color?: string }>
  title?: string
  subTitle?: string
  centerLabel?: string
  centerValue?: string | number
  height?: number | string
}

export const DamageDonutChart: React.FC<DamageDonutChartProps> = ({
  data,
  title,
  subTitle,
  centerLabel = "Total",
  centerValue,
  height = 240,
}) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0)
  const displayValue = centerValue !== undefined ? centerValue : total

  const option = {
    title: [
      title
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
        : {},
      {
        text: `${displayValue}`,
        subtext: centerLabel,
        left: "35%",
        top: "43%",
        textAlign: "center",
        textStyle: {
          fontFamily: FONT_FAMILY,
          fontSize: 22,
          fontWeight: "800",
          color: CHART_COLORS.textPrimary,
        },
        subtextStyle: {
          fontFamily: FONT_FAMILY,
          fontSize: 10,
          color: CHART_COLORS.textTertiary,
          fontWeight: "600",
        },
      },
    ],
    tooltip: {
      trigger: "item",
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
        const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0
        return `
          <div style="font-weight: 700; color: ${CHART_COLORS.textPrimary};">${params.name}</div>
          <div style="margin-top: 4px; color: ${CHART_COLORS.textSecondary};">
            ${params.value} Unit (${percent}%)
          </div>
        `
      },
    },
    legend: {
      orient: "vertical",
      right: "5%",
      top: "center",
      itemWidth: 10,
      itemHeight: 10,
      icon: "circle",
      textStyle: {
        fontFamily: FONT_FAMILY,
        fontSize: 11,
        color: CHART_COLORS.textSecondary,
      },
      formatter: (name: string) => {
        const item = data.find((d) => d.name === name)
        const val = item ? item.value : 0
        const pct = total > 0 ? Math.round((val / total) * 100) : 0
        return `${name}  ${pct}%`
      },
    },
    series: [
      {
        name: title || "Kondisi Kerusakan",
        type: "pie",
        radius: ["55%", "75%"],
        center: ["35%", "52%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#FFFFFF",
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: false },
          itemStyle: {
            shadowBlur: 8,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.15)",
          },
        },
        data: data.map((d, idx) => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color:
              d.color ||
              (d.name.toLowerCase().includes("baik")
                ? CHART_COLORS.success
                : d.name.toLowerCase().includes("ringan") || d.name.toLowerCase().includes("sedang")
                ? CHART_COLORS.warning
                : d.name.toLowerCase().includes("berat") || d.name.toLowerCase().includes("kritis")
                ? CHART_COLORS.danger
                : CHART_PALETTE[idx % CHART_PALETTE.length]),
          },
        })),
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

export default DamageDonutChart
