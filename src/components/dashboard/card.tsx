import { type ComponentPropsWithoutRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import { Star, Clock, Calendar } from "lucide-react";
import { SocialProofBadges } from "./social-proof-badges";
import type { SocialProofBadgeEntry } from "./types";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  variant?: "default" | "panel" | "glass" | "accent" | "compact-list";
  interactive?: boolean;
  /** href for when `as="a"` is used. */
  href?: string;
}

export function Card<T extends ElementType = "article">({
  as,
  children,
  className,
  variant = "default",
  interactive = false,
  ...props
}: CardProps & ComponentPropsWithoutRef<T>) {
  const Component = as || "article";
  const cardClassName = clsx(
    "card",
    {
      "card--panel": variant === "panel",
      "card--glass": variant === "glass",
      "card--accent": variant === "accent",
      "card--compact-list": variant === "compact-list",
      "card--interactive": interactive,
    },
    className
  );

  return (
    <Component className={cardClassName} {...props}>
      {children}
    </Component>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div className={clsx("card-header", className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div className={clsx("card-body", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div className={clsx("card-footer", className)} {...props}>
      {children}
    </div>
  );
}

export interface SupplierCardHeaderProps {
  name: string;
  title?: string;
  badges?: SocialProofBadgeEntry[];
  maxBadgesVisible?: number;
  className?: string;
}

export function SupplierCardHeader({
  name,
  title,
  badges = [],
  maxBadgesVisible = 3,
  className,
}: SupplierCardHeaderProps) {
  return (
    <CardHeader
      className={clsx(
        "flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <h3
          className="truncate text-base font-semibold text-white sm:text-lg"
          title={name}
        >
          {name}
        </h3>
        {title ? (
          <p
            className="truncate text-xs text-slate-300 sm:text-sm"
            title={title}
          >
            {title}
          </p>
        ) : null}
      </div>
      {badges.length > 0 ? (
        <SocialProofBadges
          badges={badges}
          maxVisible={maxBadgesVisible}
          className="shrink-0"
        />
      ) : null}
    </CardHeader>
  );
}

export interface SupplierCardProps {
  name: string;
  title?: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  priceFloor?: string;
  nextSlot?: string;
  responseTime?: string;
  badges?: SocialProofBadgeEntry[];
  variant?: "compact" | "comfortable";
  className?: string;
}

export function SupplierCard({
  name,
  title,
  avatarUrl,
  rating,
  reviewCount,
  priceFloor,
  nextSlot,
  responseTime,
  badges = [],
  variant = "comfortable",
  className,
}: SupplierCardProps) {
  const isCompact = variant === "compact";

  return (
    <Card className={clsx("flex flex-col", isCompact ? "p-4 gap-3" : "p-6 gap-4", className)}>
      <div className="flex items-start gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className={clsx("rounded-full object-cover shrink-0", isCompact ? "h-10 w-10" : "h-14 w-14")}
          />
        ) : (
          <div className={clsx("rounded-full bg-slate-800 flex items-center justify-center shrink-0", isCompact ? "h-10 w-10" : "h-14 w-14")}>
            <span className="text-white font-medium">{name.charAt(0)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h3 className={clsx("font-semibold text-white truncate", isCompact ? "text-base" : "text-lg")} title={name}>{name}</h3>
              {title ? <p className="text-slate-400 text-sm truncate" title={title}>{title}</p> : null}
            </div>
            {priceFloor ? (
              <div className="text-right shrink-0">
                <span className="text-xs text-slate-400">from</span>
                <div className="font-semibold text-white">{priceFloor}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {(rating !== undefined || responseTime || nextSlot) ? (
        <div className={clsx("flex flex-wrap text-sm text-slate-300 gap-y-2 gap-x-4", isCompact ? "mt-1" : "mt-2")}>
          {rating !== undefined ? (
            <div className="flex items-center gap-1" aria-label={`Rating: ${rating} out of 5 stars`}>
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" aria-hidden="true" />
              <span className="font-medium text-white">{rating.toFixed(1)}</span>
              {reviewCount !== undefined ? <span className="text-slate-500" aria-label={`${reviewCount} reviews`}>({reviewCount})</span> : null}
            </div>
          ) : null}
          {responseTime ? (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>{responseTime}</span>
            </div>
          ) : null}
          {nextSlot ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span>Next: {nextSlot}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {badges.length > 0 ? (
        <div className="mt-auto pt-2">
          <SocialProofBadges badges={badges} maxVisible={3} />
        </div>
      ) : null}
    </Card>
  );
}
