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
        'app-panel-solid relative overflow-hidden rounded-[32px] px-6 py-7 md:px-8 md:py-8',
        className
      )}
      data-testid={testId}
    >
      <div className="pointer-events-none absolute -right-8 top-0 h-36 w-36 rounded-full bg-[rgba(167,239,138,0.16)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-0 h-36 w-36 rounded-full bg-[rgba(239,193,119,0.16)] blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
          <h1 className={cn('page-title mt-4', titleClassName)}>{title}</h1>
          {description ? <p className="page-subtitle mt-3 max-w-xl">{description}</p> : null}
          {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
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
  return (
    <article
      className={cn('app-panel-solid relative overflow-hidden rounded-[30px] p-5 md:p-6', className)}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#607166] truncate">{label}</p>
          <p className="metric-value mt-3 text-[#173229] truncate">{value}</p>
          {detail ? <p className="mt-2 text-sm leading-6 text-[#5a6d61]">{detail}</p> : null}
        </div>

        {Icon ? (
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-[16px]',
              tone === 'fresh'
                ? 'bg-[#a7ef8a]/35 text-[#1d4427]'
                : tone === 'warm'
                  ? 'bg-[#f3c5b7]/45 text-[#8a4d36]'
                  : tone === 'pine'
                    ? 'bg-[#173229] text-white'
                    : 'bg-[#173229]/8 text-[#173229]'
            )}
          >
            <Icon size={20} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function SectionHeading({ eyebrow, title, description, meta, className }) {
  return (
    <div className={cn('flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm leading-7 text-[#5a6d61]">{description}</p> : null}
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
    <div className="app-panel-solid rounded-[32px] p-12 text-center" data-testid={testId}>
      <div className="mx-auto max-w-md">
        {Icon ? (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#a7ef8a]/25 text-[#173229]">
            <Icon size={28} />
          </div>
        ) : null}
        <h3 className="mt-6 text-3xl font-semibold tracking-tight text-[#173229]" style={{ fontFamily: 'Outfit' }}>
          {title}
        </h3>
        <p className="mt-3 text-base leading-7 text-[#5a6d61]">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}
