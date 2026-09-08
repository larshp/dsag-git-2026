/*
  Tiny syntax highlighter for the deck's code blocks.

  Each grammar is an ordered list of [token class, pattern]. The patterns are
  merged into one alternation and scanned left to right, so earlier rules win
  at the same position — that ordering is what keeps "key": from being matched
  as a plain string, or --- in a diff from being matched as a deleted line.

  Patterns must not contain capturing groups; use (?: ) instead.
*/
(function (global) {
  "use strict";

  var GRAMMARS = {
    bash: {
      flags: "gm",
      rules: [
        ["com", /#[^\n]*/],
        ["str", /"(?:\\.|[^"\\\n])*"|'[^'\n]*'/],
        ["url", /\bhttps?:\/\/[^\s"']+/],
        [
          "cmd",
          /^[ \t]*(?:git|npm|npx|node|abaplint|cd|ls|mkdir|cp|mv|rm|cat|echo|export|source|curl|wget|sh|bash|docker|code)\b/,
        ],
        [
          "sub",
          /\b(?:clone|commit|push|pull|fetch|checkout|switch|branch|merge|rebase|status|log|diff|tag|init|remote|stash|reset|revert|cherry-pick|install|run|start|test|ci)\b/,
        ],
        ["flag", /(?:^|[ \t])--?[A-Za-z][\w-]*/],
        ["num", /\b\d+\b/],
      ],
    },

    json: {
      flags: "gm",
      rules: [
        ["attr", /"(?:\\.|[^"\\\n])*"(?=[ \t]*:)/],
        ["str", /"(?:\\.|[^"\\\n])*"/],
        ["lit", /\b(?:true|false|null)\b/],
        ["num", /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/],
        ["punc", /[{}\[\],:]/],
      ],
    },

    yaml: {
      flags: "gm",
      rules: [
        ["com", /#[^\n]*/],
        ["str", /"(?:\\.|[^"\\\n])*"|'[^'\n]*'/],
        ["punc", /^[ \t]*-(?=[ \t])/],
        ["attr", /[\w.$-]+(?=:(?:[ \t]|$))/],
        ["lit", /\b(?:true|false|null|yes|no|on|off)\b/],
        ["num", /\b\d+(?:\.\d+)?\b/],
        ["punc", /[[\]{},]/],
      ],
    },

    diff: {
      flags: "gm",
      rules: [
        ["meta", /^(?:diff |index |--- |\+\+\+ |new file|deleted file|rename )[^\n]*/],
        ["hunk", /^@@[^\n]*/],
        ["add", /^\+[^\n]*/],
        ["del", /^-[^\n]*/],
      ],
    },

    abap: {
      flags: "gmi",
      rules: [
        ["com", /^[ \t]*\*[^\n]*|"[^\n]*/],
        ["str", /'(?:''|[^'\n])*'|`(?:``|[^`\n])*`/],
        [
          "key",
          /\b(?:field-symbols|class-methods|class-data|implementation|redefinition|endinterface|concatenate|endselect|endmethod|endinterface|parameters|definition|interfaces|inheriting|constants|describe|importing|exporting|returning|endclass|endwhile|endcase|abstract|interface|protected|optional|changing|endloop|private|section|methods|raising|perform|default|assert|message|public|create|method|endform|endtry|enddo|endif|report|select|update|insert|modify|delete|append|assign|cleanup|initial|static|aliases|catch|raise|final|value|class|types|table|where|split|clear|write|super|begin|check|while|loop|from|into|with|form|call|read|type|like|sort|then|when|case|else|elseif|exit|data|free|key|ref|new|end|of|is|do|if|me|not|and|or|try|return)\b/,
        ],
        ["num", /\b\d+\b/],
      ],
    },

    text: { flags: "gm", rules: [] },
  };

  var compiled = {};

  function compile(name) {
    if (compiled[name]) return compiled[name];
    var grammar = GRAMMARS[name];
    if (!grammar || !grammar.rules.length) return null;
    compiled[name] = {
      re: new RegExp(
        grammar.rules
          .map(function (rule) {
            return "(" + rule[1].source + ")";
          })
          .join("|"),
        grammar.flags
      ),
      classes: grammar.rules.map(function (rule) {
        return rule[0];
      }),
    };
    return compiled[name];
  }

  function escapeHTML(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function matchedRule(match) {
    for (var i = 1; i < match.length; i++) {
      if (match[i] !== undefined) return i - 1;
    }
    return -1;
  }

  function highlight(source, language) {
    var grammar = compile(language);
    if (!grammar) return escapeHTML(source);

    var out = "";
    var last = 0;
    var match;
    grammar.re.lastIndex = 0;

    while ((match = grammar.re.exec(source)) !== null) {
      if (match[0] === "") {
        grammar.re.lastIndex++;
        continue;
      }
      var rule = matchedRule(match);
      if (rule < 0) continue;
      out += escapeHTML(source.slice(last, match.index));
      out +=
        '<span class="tok-' +
        grammar.classes[rule] +
        '">' +
        escapeHTML(match[0]) +
        "</span>";
      last = match.index + match[0].length;
    }

    return out + escapeHTML(source.slice(last));
  }

  /* Strip the indentation the code block inherits from index.html. */
  function dedent(source) {
    var lines = source.replace(/\t/g, "  ").replace(/\r/g, "").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

    var indent = lines.reduce(function (min, line) {
      if (!line.trim()) return min;
      return Math.min(min, line.match(/^ */)[0].length);
    }, Infinity);

    if (!isFinite(indent) || indent === 0) return lines.join("\n");
    return lines
      .map(function (line) {
        return line.slice(indent);
      })
      .join("\n");
  }

  function languageOf(code) {
    if (code.dataset.lang) return code.dataset.lang;
    var match = /(?:^|\s)language-([\w-]+)/.exec(code.className);
    return match ? match[1] : "text";
  }

  function all(root) {
    var blocks = (root || document).querySelectorAll("pre > code");
    Array.prototype.forEach.call(blocks, function (code) {
      if (code.dataset.highlighted) return;
      code.innerHTML = highlight(dedent(code.textContent), languageOf(code));
      code.dataset.highlighted = "true";
    });
  }

  global.DeckHighlight = { all: all, highlight: highlight, dedent: dedent };
})(window);
