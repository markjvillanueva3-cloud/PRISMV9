function normalizeNumericExpression(raw: string): string {
  return raw
    .trim()
    .replace(/[×xX]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/,/g, '')
    .replace(/(\d+(?:\.\d+)?)\s+(\d+\s*\/\s*\d+)/g, '($1+$2)');
}

class ExpressionParser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): number | null {
    const value = this.parseExpression();
    this.skipWhitespace();
    if (value === null || this.index !== this.source.length) {
      return null;
    }
    return Number.isFinite(value) ? value : null;
  }

  private parseExpression(): number | null {
    let value = this.parseTerm();
    if (value === null) {
      return null;
    }

    while (true) {
      this.skipWhitespace();
      const operator = this.peek();
      if (operator !== '+' && operator !== '-') {
        return value;
      }
      this.index += 1;
      const right = this.parseTerm();
      if (right === null) {
        return null;
      }
      value = operator === '+' ? value + right : value - right;
    }
  }

  private parseTerm(): number | null {
    let value = this.parseUnary();
    if (value === null) {
      return null;
    }

    while (true) {
      this.skipWhitespace();
      const operator = this.peek();
      if (operator !== '*' && operator !== '/') {
        return value;
      }
      this.index += 1;
      const right = this.parseUnary();
      if (right === null) {
        return null;
      }
      value = operator === '*' ? value * right : value / right;
    }
  }

  private parseUnary(): number | null {
    this.skipWhitespace();
    const operator = this.peek();
    if (operator === '+' || operator === '-') {
      this.index += 1;
      const value = this.parseUnary();
      if (value === null) {
        return null;
      }
      return operator === '-' ? -value : value;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number | null {
    this.skipWhitespace();
    if (this.peek() === '(') {
      this.index += 1;
      const value = this.parseExpression();
      this.skipWhitespace();
      if (value === null || this.peek() !== ')') {
        return null;
      }
      this.index += 1;
      return value;
    }
    return this.parseNumber();
  }

  private parseNumber(): number | null {
    this.skipWhitespace();
    const start = this.index;
    let seenDigit = false;
    let seenDecimal = false;

    while (this.index < this.source.length) {
      const char = this.source[this.index]!;
      if (char >= '0' && char <= '9') {
        seenDigit = true;
        this.index += 1;
        continue;
      }
      if (char === '.' && !seenDecimal) {
        seenDecimal = true;
        this.index += 1;
        continue;
      }
      break;
    }

    if (!seenDigit) {
      return null;
    }

    const token = this.source.slice(start, this.index);
    const value = Number.parseFloat(token);
    return Number.isFinite(value) ? value : null;
  }

  private skipWhitespace() {
    while (this.index < this.source.length && /\s/.test(this.source[this.index]!)) {
      this.index += 1;
    }
  }

  private peek(): string | null {
    return this.index < this.source.length ? this.source[this.index]! : null;
  }
}

export function evaluateNumericExpression(raw: string): number | null {
  const normalized = normalizeNumericExpression(raw);
  if (!normalized) {
    return null;
  }
  if (!/^[\d+\-*/().\s]+$/.test(normalized)) {
    return null;
  }
  return new ExpressionParser(normalized).parse();
}

export function formatNumericExpressionValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  return value.toLocaleString('en-US', {
    useGrouping: false,
    maximumFractionDigits: 8,
  });
}
