import React from "react"
import ReactECharts from "echarts-for-react"
import { CHART_COLORS, FONT_FAMILY } from "./theme"

export interface IntegrityHeatmapProps {
  sekolahList: string[]
  fasilitas: string[]
  data: [number, number, number][] // [fasilitasIdx, sekolahIdx, score]
  title?: string
  height?: number | string
}

export const IntegrityHeatmap: React.FC<IntegrityHeatmapProps> = ({
  sekolahList,
  fasilitas,
  data,
  title,
  height = 280,
}) => {
  const option = {
    title: title
      ? {
          text: title,
          textStyle: {
            fontFamily: FONT_FAMILY,
            fontSize: 14,
            fontWeight: "bold",
            color: CHART_COLORS.textPrimary,
          },
          top: 0,
          left: 0,
        }
      : undefined,
    tooltip: {
      position: "top",
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
        const [fIdx, sIdx, val] = params.data
        return `
          <div style="font-weight: 700; color: ${CHART_COLORS.textPrimary};">${sekolahList[sIdx]}</div>
          <div style="color: ${CHART_COLORS.textSecondary}; font-size: 11px;">${fasilitas[fIdx]}</div>
          <div style="margin-top: 4px; font-weight: bold; color: ${
            val >= 70 ? CHART_COLORS.danger : val >= 40 ? CHART_COLORS.warning : CHART_COLORS.success
          };">
            Skor Integritas: ${val}
          </div>
        `
      },
    },
    grid: {
      top: title ? 40 : 20,
      right: 15,
      bottom: 40,
      left: 70,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: fasilitas,
      splitArea: { show: true },
      axisLine: { lineStyle: { color: CHART_COLORS.border } },
      axisLabel: {
        fontFamily: FONT_FAMILY,
        fontSize: 10,
        color: CHART_COLORS.textSecondary,
        interval: 0,
        rotate: 20,
      },
    },
    yAxis: {
      type: "category",
      data: sekolahList,
      splitArea: { show: true },
      axisLine: { lineStyle: { color: CHART_COLORS.border } },
      axisLabel: {
        fontFamily: FONT_FAMILY,
        fontSize: 11,
        color: CHART_COLORS.textSecondary,
        fontWeight: 600,
        formatter: (val: string) => (val.length > 16 ? `${val.slice(0, 14)}…` : val),
      },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: "0%",
      itemWidth: 12,
      itemHeight: 80,
      text: ["Kritis (>70)", "Aman (<40)"],
      textStyle: {
        fontFamily: FONT_FAMILY,
        fontSize: 10,
        color: CHART_COLORS.textTertiary,
      },
      inRange: {
        color: ["#ECFDF5", "#FEF3C7", "#FEE2E2", "#DC2626"],
      },
    },
    series: [
      {
        name: "Matriks Integritas",
        type: "heatmap",
        data: data,
        label: {
          show: true,
          fontFamily: FONT_FAMILY,
          fontSize: 10,
          fontWeight: "bold",
          color: "#1E293B",
        },
        itemStyle: {
          borderColor: "#FFFFFF",
          borderWidth: 2,
          borderRadius: 4,
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

export default IntegrityHeatmap
