export function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  const parts = normalized.split("/");
  const safeParts: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }

    if (part === "..") {
      const previous = safeParts.at(-1);
      if (previous && previous !== "**") {
        safeParts.pop();
      }
      continue;
    }

    safeParts.push(part);
  }

  return safeParts.join("/");
}

export function matchesPattern(filePath: string, pattern: string): boolean {
  const file = normalizePath(filePath);
  const normalizedPattern = normalizePath(pattern.trim());
  const fileForMatch = file.toLowerCase();
  const patternForMatch = normalizedPattern.toLowerCase();

  if (patternForMatch === "**" || patternForMatch === "**/*") {
    return true;
  }

  if (fileForMatch === patternForMatch) {
    return true;
  }

  if (patternForMatch.endsWith("/**") && !patternForMatch.slice(0, -3).includes("*") && !patternForMatch.includes("?")) {
    const prefix = patternForMatch.slice(0, -3);
    return fileForMatch === prefix || fileForMatch.startsWith(`${prefix}/`);
  }

  const regex = globToRegExp(patternForMatch);
  return regex.test(fileForMatch);
}

export function matchesAnyPattern(filePath: string, patterns: string[] = []): boolean {
  return patterns.some((pattern) => matchesPattern(filePath, pattern));
}

export function globToRegExp(pattern: string): RegExp {
  let source = "^";

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    const next = pattern[i + 1];

    if (char === "*") {
      if (next === "*") {
        const after = pattern[i + 2];
        if (after === "/") {
          source += "(?:.*/)?";
          i += 2;
        } else {
          source += ".*";
          i += 1;
        }
      } else {
        source += "[^/]*";
      }
      continue;
    }

    if (char === "?") {
      source += "[^/]";
      continue;
    }

    source += escapeRegExp(char);
  }

  source += "$";
  return new RegExp(source);
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}
