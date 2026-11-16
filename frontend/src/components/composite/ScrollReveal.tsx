import React, { useEffect, useRef, useState } from "react"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number // dalam ms (misal 100, 200)
  direction?: "up" | "down" | "left" | "right" | "none"
  distance?: number // dalam px
  duration?: number // dalam ms
  once?: boolean
}

/**
 * Komponen ScrollReveal untuk memberikan efek animasi saat elemen masuk ke viewport saat discroll.
 * Menggunakan IntersectionObserver yang sangat ringan dan efisien.
 */
export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  distance = 24,
  duration = 600,
  once = true,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Cek preferensi reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            if (once) {
              observer.unobserve(entry.target)
            }
          } else if (!once) {
            setIsVisible(false)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px", // Memicu animasi sedikit sebelum elemen benar-benar lewat
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [once])

  // Menghitung transform style berdasarkan arah
  const getInitialTransform = () => {
    switch (direction) {
      case "up":
        return `translateY(${distance}px)`
      case "down":
        return `translateY(-${distance}px)`
      case "left":
        return `translateX(${distance}px)`
      case "right":
        return `translateX(-${distance}px)`
      case "none":
      default:
        return "none"
    }
  }

  const style: React.CSSProperties = {
    transitionDuration: `${duration}ms`,
    transitionDelay: `${delay}ms`,
    transitionProperty: "opacity, transform",
    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "none" : getInitialTransform(),
    willChange: "opacity, transform",
  }

  return (
    <div ref={elementRef} className={className} style={style}>
      {children}
    </div>
  )
}

