/**
 * parseClaudeJSON – Robustly parse a JSON object out of a Claude response.
 *
 * Claude sometimes:
 *  • Wraps the JSON in markdown code fences (```json … ```)
 *  • Includes unescaped ASCII double-quotes inside string values
 *  • Emits literal newlines inside strings instead of \n
 *  • Appends trailing commas before ] or }
 *  • Prepends/appends explanatory prose around the JSON block
 *
 * Strategy (four successive attempts, most → least strict):
 *  1. Strip fences → extract {…} → clean → JSON.parse
 *  2. Same cleaned text, but also run the state-machine quote fixer
 *  3. Brute-force regex fixup pass → JSON.parse
 *  4. Field-by-field regex extraction (never throws; returns partial data)
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip markdown fences and grab the outermost {...} block. */
function extractBlock(raw) {
  // Remove ```json ... ``` or ``` ... ```
  let text = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

/** Basic sanitise pass – safe to run before any parse attempt. */
function sanitize(text) {
  return (
    text
      // Control characters (except \t \n \r)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Smart / curly double-quotes → straight (they're not JSON delimiters)
      .replace(/[“”]/g, '"')
      // Smart single-quotes → straight
      .replace(/[‘’]/g, "'")
      // Trailing commas before } or ]
      .replace(/,(\s*[}\]])/g, "$1")
  );
}

/**
 * State-machine pass: walk the JSON character by character.
 * When inside a string value, escape any bare " that isn't already escaped,
 * and replace literal newlines with \n.
 */
function fixUnescapedQuotes(text) {
  const out = [];
  let inString = false;
  let escaped  = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      out.push(ch);
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      out.push(ch);
      escaped = true;
      continue;
    }

    // Literal newline inside a string → escape it
    if (inString && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++; // skip CRLF second byte
      out.push("\\n");
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        inString = true;
        out.push(ch);
      } else {
        // Is this the closing quote?
        // After a closing quote we expect structural JSON tokens: , : } ] or whitespace.
        // If the very next non-space char is something else, this is an embedded quote.
        const rest = text.slice(i + 1).replace(/^\s*/, "");
        const isStructural = rest.length === 0 || /^[,:\]}]/.test(rest);

        if (isStructural) {
          inString = false;
          out.push(ch);
        } else {
          // Embedded bare quote – escape it
          out.push('\\"');
        }
      }
      continue;
    }

    out.push(ch);
  }

  return out.join("");
}

/**
 * Last-resort field extraction using simple regex.
 * Returns a partial but safe result object even when JSON is totally broken.
 */
function extractFallback(raw) {
  const str = (key) => {
    // Match "key": "value" allowing for escaped chars inside value
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    return m ? m[1] : null;
  };
  const num = (key) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`));
    return m ? parseInt(m[1], 10) : null;
  };

  const overallScore = num("overallScore") ?? 50;
  const rawLabel     = str("label");
  const label        =
    rawLabel === "高度疑似AI" || rawLabel === "部分疑似" || rawLabel === "原创可信"
      ? rawLabel
      : overallScore >= 70 ? "高度疑似AI" : overallScore >= 40 ? "部分疑似" : "原创可信";

  // Extract frames via repeated pattern matching
  const frames = [];
  // Match {"name":"X","score":N} style entries (order of keys may vary)
  const frameRe = /"name"\s*:\s*"([^"]+)"[^}]*?"score"\s*:\s*(\d+)|"score"\s*:\s*(\d+)[^}]*?"name"\s*:\s*"([^"]+)"/g;
  for (const m of raw.matchAll(frameRe)) {
    const name  = m[1] ?? m[4];
    const score = parseInt(m[2] ?? m[3], 10);
    if (name) frames.push({ name, score, flags: [] });
  }

  return {
    studentName:       str("studentName"),
    studentNameSource: str("studentNameSource"),
    overallScore,
    label,
    summary: str("summary") ?? "分析完成，部分细节因格式问题无法完整显示。",
    frames,
    _parsedByFallback: true, // internal marker for logging
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * @param {string} raw – raw text from Claude
 * @returns {object} parsed result (never throws)
 */
export function parseClaudeJSON(raw) {
  const block = extractBlock(raw);

  if (block) {
    const clean = sanitize(block);

    // Attempt 1 – direct parse after basic sanitise
    try {
      return JSON.parse(clean);
    } catch { /* continue */ }

    // Attempt 2 – state-machine quote fixer
    try {
      return JSON.parse(fixUnescapedQuotes(clean));
    } catch { /* continue */ }

    // Attempt 3 – brute-force: strip all literal newlines not already escaped
    try {
      const brutal = clean.replace(/(?<!\\)\n/g, "\\n").replace(/(?<!\\)\r/g, "");
      return JSON.parse(brutal);
    } catch { /* continue */ }
  }

  // Attempt 4 – regex field extraction fallback
  console.warn("[parseClaudeJSON] all parse attempts failed, using fallback extractor");
  return extractFallback(raw);
}
