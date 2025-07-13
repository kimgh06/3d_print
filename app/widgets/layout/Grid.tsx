import { ReactNode } from "react";

interface GridProps {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: "sm" | "md" | "lg" | "xl";
  responsive?: boolean;
}

const colsClasses = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  6: "grid-cols-6",
  12: "grid-cols-12",
};

const gapClasses = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
  xl: "gap-12",
};

const responsiveClasses = {
  1: "md:grid-cols-1 lg:grid-cols-1",
  2: "md:grid-cols-2 lg:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
  6: "md:grid-cols-3 lg:grid-cols-6",
  12: "md:grid-cols-6 lg:grid-cols-12",
};

export const Grid: React.FC<GridProps> = ({
  children,
  className = "",
  cols = 1,
  gap = "md",
  responsive = true,
}) => {
  const gridClasses = responsive
    ? `grid grid-cols-1 ${responsiveClasses[cols]} ${gapClasses[gap]}`
    : `grid ${colsClasses[cols]} ${gapClasses[gap]}`;

  return <div className={`${gridClasses} ${className}`}>{children}</div>;
};
