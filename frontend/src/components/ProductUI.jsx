import { cn } from '@/lib/utils';

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  titleClassName,
  testId,
}) {
  return (
    <section
      className={cn(
        'fintech-card px-8 py-10 md:px-12 md:py-16 relative overflow-hidden',
        className
      )}
      data-testid={testId}
    >
      <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? <div className="text-xs font-semibold tracking-widest uppercase text-primary mb-4">{eyebrow}</div> : null}
          <h1 className={cn('text-4xl sm:text-5xl lg:text-6xl font-light tracking-extratight text-foreground', titleClassName)}>{title}</h1>
          {description ? <p className="mt-4 text-lg leading-relaxed text-muted-foreground max-w-xl">{description}</p> : null}
          {actions ? <div className="mt-8 flex flex-wrap gap-4">{actions}</div> : null}
        </div>

        {children ? <div className="w-full max-w-xl">{children}</div> : null}
      </div>
    </section>
  );
}

export function MetricPanel({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'default',
  className,
  testId,
}) {
  // If tone is spotlight, we apply the glow
  const isSpotlight = tone === 'spotlight';

  return (
    <article
      className={cn('metric-block', className)}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="metric-label">{label}</p>
          <p className={cn("metric-value mt-3", isSpotlight ? "text-glow font-normal" : "text-foreground")}>{value}</p>
          {detail ? <p className="mt-2 max-w-[18rem] text-sm leading-6 text-muted-foreground">{detail}</p> : null}
        </div>

        {Icon ? (
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              tone === 'spotlight'
                ? 'bg-primary/10 text-primary'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            <Icon size={20} strokeWidth={1.5} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function SectionHeading({ eyebrow, title, description, meta, className }) {
  return (
    <div className={cn('flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        {eyebrow ? <div className="text-xs font-medium tracking-widest uppercase text-primary mb-2">{eyebrow}</div> : null}
        <h2 className="text-2xl font-light tracking-tight text-foreground">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>

      {meta ? <div>{meta}</div> : null}
    </div>
  );
}

export function EmptyWorkspaceState({
  icon: Icon,
  title,
  description,
  action,
  testId,
}) {
  return (
    <div className="fintech-card p-12 text-center" data-testid={testId}>
      <div className="mx-auto max-w-md">
        {Icon ? (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-6">
            <Icon size={28} strokeWidth={1.5} />
          </div>
        ) : null}
        <h3 className="text-2xl font-light tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
        {action ? <div className="mt-8">{action}</div> : null}
      </div>
    </div>
  );
}
