/**
 * Centralized theme colors & options for ECharts
 * Sesuai UI_COMPONENTS.md §1 & §6
 */

export const CHART_COLORS = {
  primary: "#123A63",
  primaryDark: "#0B3052",
  primaryLight: "#EAF1F8",
  primaryBorder: "#D3E1EF",
  danger: "#DC2626",
  dangerText: "#991B1B",
  dangerLight: "#FEF2F2",
  dangerBorder: "#FEE2E2",
  warning: "#D97706",
  warningText: "#92400E",
  warningLight: "#FEF3C7",
  warningBorder: "#FDE68A",
  success: "#059669",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  cyan: "#0EA5E9",
  textPrimary: "#101828",
  textSecondary: "#475467",
  textTertiary: "#8A94A6",
  border: "#E4E7EC",
  backgroundSubtle: "#F8FAFC",
  backgroundAlt: "#F4F6F9",
}

export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.danger,
  CHART_COLORS.warning,
  CHART_COLORS.success,
  CHART_COLORS.cyan,
  "#8B5CF6",
]

export const FONT_FAMILY = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"

export function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const getChartBaseOption = () => ({
  color: CHART_PALETTE,
  textStyle: {
    fontFamily: FONT_FAMILY,
    color: CHART_COLORS.textSecondary,
  },
  tooltip: {
    backgroundColor: "#FFFFFF",
    borderColor: CHART_COLORS.border,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: {
      color: CHART_COLORS.textPrimary,
      fontSize: 12,
      fontFamily: FONT_FAMILY,
    },
    extraCssText: "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 10px;",
  },
  grid: {
    top: 24,
    right: 20,
    bottom: 30,
    left: 45,
    containLabel: true,
  },
})
