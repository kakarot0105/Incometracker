const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatCurrency(value = 0) {
  const number = Number(value);
  return currencyFormatter.format(Number.isFinite(number) ? number : 0);
}

export function formatCompactCurrency(value = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '$0';
  }

  if (Math.abs(number) >= 1000) {
    return `$${(number / 1000).toFixed(Math.abs(number) >= 10000 ? 0 : 1)}k`;
  }

  return `$${integerFormatter.format(number)}`;
}

export function formatHours(value = 0) {
  const number = Number(value);
  return `${decimalFormatter.format(Number.isFinite(number) ? number : 0)} hrs`;
}

export function formatInteger(value = 0) {
  const number = Number(value);
  return integerFormatter.format(Number.isFinite(number) ? number : 0);
}

export function formatMonthLabel(value) {
  if (!value) {
    return '';
  }

  return new Date(`${value}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
