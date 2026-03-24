"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  size?: "default" | "lg";
  href?: string;
}

export default function Button({
  children,
  variant = "primary",
  size = "default",
  className,
  href,
  ...props
}: ButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-300 cursor-pointer";

  const variants = {
    primary:
      "bg-accent text-white hover:bg-accent-dark shadow-sm hover:shadow-[0_4px_12px_rgba(15,23,42,0.25)] active:scale-95",
    outline:
      "border border-accent text-accent hover:bg-accent/5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.15)] active:scale-95",
  };

  const sizes = {
    default: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
  };

  const classes = cn(baseStyles, variants[variant], sizes[size], className);

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current || "ontouchstart" in window) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setOffset({ x: x * 0.15, y: y * 0.15 });
  }

  function handleMouseLeave() {
    setOffset({ x: 0, y: 0 });
  }

  const magneticStyle = {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: offset.x === 0 ? "transform 0.4s ease" : "transform 0.1s ease",
  };

  if (href) {
    return (
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        <a href={href} className={classes} style={magneticStyle}>
          {children}
        </a>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="inline-block"
    >
      <button className={classes} style={magneticStyle} {...props}>
        {children}
      </button>
    </div>
  );
}
