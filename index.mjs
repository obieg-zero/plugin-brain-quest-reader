import { jsx, jsxs } from "react/jsx-runtime";
const plugin = ({ React, ui, store, sdk, icons }) => {
  const { useState, useMemo, useEffect } = React;
  const { BookOpen, ChevronLeft, ChevronRight, X } = icons;
  const useLocal = sdk.create(() => ({
    slideIdx: 0,
    activeTermId: null
  }));
  const jparse = (s, fb) => {
    try {
      return JSON.parse(s);
    } catch {
      return fb;
    }
  };
  const helpers = () => {
    var _a;
    return (_a = sdk.shared.getState()) == null ? void 0 : _a.bqHelpers;
  };
  const segmentText = (text, lexEntries) => {
    const forms = [];
    for (const lex of lexEntries) {
      forms.push({ lower: String(lex.data.term).toLowerCase(), termId: lex.id });
      for (const f of jparse(String(lex.data.forms || "[]"), [])) {
        if (f.length >= 3) forms.push({ lower: f.toLowerCase(), termId: lex.id });
      }
    }
    forms.sort((a, b) => b.lower.length - a.lower.length);
    const segments = [];
    let i = 0;
    const lower = text.toLowerCase();
    while (i < text.length) {
      let matched = false;
      for (const f of forms) {
        if (i + f.lower.length > text.length) continue;
        if (lower.slice(i, i + f.lower.length) !== f.lower) continue;
        const before = i > 0 ? text[i - 1] : " ";
        const after = i + f.lower.length < text.length ? text[i + f.lower.length] : " ";
        if (/\w/.test(before) || /\w/.test(after)) continue;
        segments.push({ text: text.slice(i, i + f.lower.length), termId: f.termId });
        i += f.lower.length;
        matched = true;
        break;
      }
      if (!matched) {
        if (segments.length && segments[segments.length - 1].termId === null) {
          segments[segments.length - 1].text += text[i];
        } else {
          segments.push({ text: text[i], termId: null });
        }
        i++;
      }
    }
    return segments;
  };
  const splitSlides = (texts) => {
    const joined = texts.join("\n\n");
    if (!joined.trim()) return [];
    if (/\n#{2,3}\s/.test("\n" + joined)) {
      return ("\n" + joined).split(/\n(?=#{2,3}\s)/).map((s) => s.trim()).filter(Boolean);
    }
    const paras = joined.split(/\n\n+/).filter(Boolean);
    const slides = [];
    let current = "";
    for (const p of paras) {
      if (current && current.length + p.length > 800) {
        slides.push(current.trim());
        current = p;
      } else current += (current ? "\n\n" : "") + p;
    }
    if (current.trim()) slides.push(current.trim());
    return slides.length ? slides : [joined];
  };
  const edgeStr = (disc) => {
    var _a;
    return ((_a = helpers()) == null ? void 0 : _a.edgeStr(disc)) ?? 0;
  };
  const highlightStyle = (strength) => {
    if (strength === void 0) return { background: "rgba(100,116,139,0.25)", padding: "1px 3px", borderRadius: "3px", cursor: "pointer" };
    if (strength >= 0.8) return { background: "rgba(34,197,94,0.6)", padding: "1px 3px", borderRadius: "3px", cursor: "pointer", fontWeight: 600 };
    return { background: `rgba(34,197,94,${0.15 + strength * 0.55})`, padding: "1px 3px", borderRadius: "3px", cursor: "pointer" };
  };
  function InlineMarkdown({ text, lexicon }) {
    const parts = [];
    let rest = text;
    while (rest.length) {
      const mb = rest.match(/\*\*(.+?)\*\*/);
      const mi = rest.match(/\*(.+?)\*/);
      const match = mb && mi ? mb.index <= mi.index ? mb : mi : mb || mi;
      if (!match) {
        parts.push({ text: rest });
        break;
      }
      if (match.index > 0) parts.push({ text: rest.slice(0, match.index) });
      parts.push({ text: match[1], bold: match[0].startsWith("**"), italic: !match[0].startsWith("**") });
      rest = rest.slice(match.index + match[0].length);
    }
    return /* @__PURE__ */ jsx("span", { children: parts.map((p, i) => {
      const inner = /* @__PURE__ */ jsx(HighlightedText, { text: p.text, lexicon }, i);
      if (p.bold) return /* @__PURE__ */ jsx("strong", { children: inner }, i);
      if (p.italic) return /* @__PURE__ */ jsx("em", { children: inner }, i);
      return inner;
    }) });
  }
  const proseStyle = {
    fontSize: "15px",
    lineHeight: 1.8,
    color: "inherit"
  };
  const headingStyle = {
    fontSize: "18px",
    fontWeight: 700,
    lineHeight: 1.4,
    marginTop: "16px",
    marginBottom: "8px"
  };
  const paraStyle = {
    marginBottom: "12px",
    lineHeight: 1.8,
    fontSize: "15px"
  };
  const ulStyle = {
    marginTop: "8px",
    marginBottom: "12px",
    paddingLeft: "24px",
    listStyleType: "disc"
  };
  const liStyle = {
    marginBottom: "6px",
    lineHeight: 1.7,
    fontSize: "15px",
    paddingLeft: "4px"
  };
  function MarkdownBlock({ text, lexicon }) {
    const lines = text.split("\n");
    const blocks = [];
    let listItems = [];
    const flushList = () => {
      if (!listItems.length) return;
      blocks.push(
        /* @__PURE__ */ jsx("ul", { style: ulStyle, children: listItems.map((li, j) => /* @__PURE__ */ jsx("li", { style: liStyle, children: /* @__PURE__ */ jsx(InlineMarkdown, { text: li, lexicon }) }, j)) }, `ul-${blocks.length}`)
      );
      listItems = [];
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^#{2,3}\s/.test(line)) {
        flushList();
        blocks.push(/* @__PURE__ */ jsx("div", { style: headingStyle, children: line.replace(/^#{2,3}\s/, "") }, i));
      } else if (/^[-*]\s/.test(line)) {
        listItems.push(line.replace(/^[-*]\s/, ""));
      } else if (line.trim() === "") {
        flushList();
      } else {
        flushList();
        blocks.push(/* @__PURE__ */ jsx("div", { style: paraStyle, children: /* @__PURE__ */ jsx(InlineMarkdown, { text: line, lexicon }) }, i));
      }
    }
    flushList();
    return /* @__PURE__ */ jsx("div", { style: proseStyle, children: blocks });
  }
  function HighlightedText({ text, lexicon }) {
    const discoveries = store.usePosts("discovery");
    const dmap = useMemo(() => {
      const m = {};
      for (const d of discoveries) m[String(d.data.termId)] = edgeStr(d);
      return m;
    }, [discoveries]);
    const segments = useMemo(() => segmentText(text, lexicon), [text, lexicon]);
    return /* @__PURE__ */ jsx("span", { children: segments.map((seg, i) => {
      if (!seg.termId) return /* @__PURE__ */ jsx("span", { children: seg.text }, i);
      return /* @__PURE__ */ jsx("span", { style: highlightStyle(dmap[seg.termId]), onClick: () => useLocal.setState({ activeTermId: seg.termId }), children: seg.text }, i);
    }) });
  }
  function TermPopover() {
    const { activeTermId } = useLocal();
    const term = store.usePost(activeTermId || "");
    const discoveries = store.usePosts("discovery");
    if (!term || !activeTermId) return null;
    const disc = discoveries.find((d) => d.data.termId === activeTermId);
    const strength = disc ? edgeStr(disc) : 0;
    return /* @__PURE__ */ jsx(ui.Card, { children: /* @__PURE__ */ jsxs(ui.Stack, { children: [
      /* @__PURE__ */ jsxs(ui.Row, { justify: "between", children: [
        /* @__PURE__ */ jsx(ui.Text, { bold: true, children: String(term.data.term) }),
        /* @__PURE__ */ jsx("span", { style: { cursor: "pointer" }, onClick: () => useLocal.setState({ activeTermId: null }), children: /* @__PURE__ */ jsx(X, { size: 16 }) })
      ] }),
      /* @__PURE__ */ jsx(ui.Text, { size: "sm", children: String(term.data.definition) }),
      term.data.example && /* @__PURE__ */ jsx(ui.Text, { size: "xs", muted: true, children: String(term.data.example) }),
      term.data.category && /* @__PURE__ */ jsx(ui.Badge, { color: "info", children: String(term.data.category) }),
      /* @__PURE__ */ jsxs(ui.Row, { justify: "between", children: [
        /* @__PURE__ */ jsx(ui.Badge, { color: disc ? strength >= 0.8 ? "success" : strength > 0.3 ? "warning" : "error" : "neutral", children: disc ? `Siła: ${Math.round(strength * 100)}%` : "Nieodkryte" }),
        /* @__PURE__ */ jsx(ui.Button, { size: "xs", color: "primary", onClick: () => {
          var _a;
          (_a = helpers()) == null ? void 0 : _a.discover(activeTermId);
          sdk.log(`Odkryto: ${term.data.term}`, "ok");
        }, children: disc ? "Powtórz (+1)" : "Odkryj" })
      ] })
    ] }) });
  }
  function SlideReader() {
    const bq = sdk.shared((s) => s == null ? void 0 : s.bq);
    const treeId = (bq == null ? void 0 : bq.treeId) || "";
    const postId = (bq == null ? void 0 : bq.postId) || "";
    const { slideIdx } = useLocal();
    const node = store.usePost(postId);
    const nodeContents = store.useChildren(postId, "content");
    const treeContents = store.useChildren(treeId, "content");
    const lexicon = store.useChildren(treeId, "lexicon");
    const slides = useMemo(() => {
      const texts = nodeContents.filter((c) => String(c.data.contentType) !== "quiz").map((c) => String(c.data.text));
      return splitSlides(texts);
    }, [nodeContents]);
    const quizzes = useMemo(() => [
      ...nodeContents.filter((c) => String(c.data.contentType) === "quiz"),
      ...treeContents.filter((c) => String(c.data.contentType) === "quiz")
    ], [nodeContents, treeContents]);
    if (!treeId) return /* @__PURE__ */ jsx(ui.Placeholder, { text: "Otwórz BrainQuest i wybierz węzeł" });
    if (!postId || !node) return /* @__PURE__ */ jsx(ui.Placeholder, { text: "Kliknij węzeł w drzewie wiedzy" });
    if (!slides.length && !quizzes.length) return /* @__PURE__ */ jsx(ui.Placeholder, { text: "Brak treści dla tego węzła" });
    const totalSlides = slides.length + (quizzes.length ? 1 : 0);
    const safeIdx = Math.min(slideIdx, totalSlides - 1);
    const isQuizSlide = safeIdx >= slides.length;
    const goBack = () => {
      var _a;
      const bq2 = (_a = sdk.shared.getState()) == null ? void 0 : _a.bq;
      if (bq2) sdk.shared.setState({ bq: { ...bq2, phase: "map" } });
      sdk.useHostStore.setState({ activeId: "plugin-brain-quest" });
    };
    return /* @__PURE__ */ jsx(ui.Page, { children: /* @__PURE__ */ jsx(ui.Stage, { children: /* @__PURE__ */ jsx(
      ui.StageLayout,
      {
        top: /* @__PURE__ */ jsxs(ui.Stack, { gap: "md", children: [
          /* @__PURE__ */ jsx(ui.StepHeading, { step: `${safeIdx + 1}`, title: String(node.data.title), subtitle: `${safeIdx + 1} / ${totalSlides}` }),
          !isQuizSlide && slides[safeIdx] && /* @__PURE__ */ jsx(ui.Card, { children: /* @__PURE__ */ jsx(ui.Stack, { children: /* @__PURE__ */ jsx(MarkdownBlock, { text: slides[safeIdx], lexicon }) }) }),
          isQuizSlide && /* @__PURE__ */ jsxs(ui.Stack, { children: [
            /* @__PURE__ */ jsx(ui.Text, { bold: true, children: "Quiz" }),
            quizzes.map((q) => /* @__PURE__ */ jsx(QuizCard, { quiz: q }, q.id))
          ] }),
          /* @__PURE__ */ jsx(TermPopover, {})
        ] }),
        bottom: /* @__PURE__ */ jsxs(ui.Stack, { children: [
          safeIdx < totalSlides - 1 ? /* @__PURE__ */ jsx(
            ui.Button,
            {
              size: "lg",
              color: "primary",
              block: true,
              onClick: () => useLocal.setState({ slideIdx: safeIdx + 1, activeTermId: null }),
              children: "Dalej"
            }
          ) : /* @__PURE__ */ jsx(ui.Button, { size: "lg", color: "primary", block: true, onClick: goBack, children: "Wróć do mapy" }),
          safeIdx > 0 && /* @__PURE__ */ jsx(
            ui.Button,
            {
              size: "lg",
              outline: true,
              block: true,
              onClick: () => useLocal.setState({ slideIdx: safeIdx - 1, activeTermId: null }),
              children: "Wstecz"
            }
          )
        ] })
      }
    ) }) });
  }
  function QuizCard({ quiz }) {
    const [show, setShow] = useState(false);
    return /* @__PURE__ */ jsx(ui.Card, { children: /* @__PURE__ */ jsxs(ui.Stack, { children: [
      /* @__PURE__ */ jsx(ui.Text, { bold: true, children: String(quiz.data.text) }),
      show ? /* @__PURE__ */ jsx(ui.Text, { size: "sm", children: String(quiz.data.answer) }) : /* @__PURE__ */ jsx(ui.Button, { size: "xs", outline: true, onClick: () => setShow(true), children: "Pokaż odpowiedź" })
    ] }) });
  }
  function DiscoveredPanel() {
    var _a;
    const discoveries = store.usePosts("discovery");
    const bq = (_a = sdk.shared.getState()) == null ? void 0 : _a.bq;
    const treeId = (bq == null ? void 0 : bq.treeId) || "";
    const lexicon = store.useChildren(treeId, "lexicon");
    const discovered = useMemo(() => {
      const dmap = /* @__PURE__ */ new Map();
      for (const d of discoveries) dmap.set(String(d.data.termId), edgeStr(d));
      return lexicon.filter((l) => dmap.has(l.id)).map((l) => ({ lex: l, strength: dmap.get(l.id) })).sort((a, b) => b.strength - a.strength);
    }, [discoveries, lexicon]);
    if (!treeId) return /* @__PURE__ */ jsx(ui.Placeholder, { text: "Wybierz drzewo" });
    return /* @__PURE__ */ jsx(ui.Page, { children: /* @__PURE__ */ jsxs(ui.Stack, { children: [
      /* @__PURE__ */ jsx(ui.Heading, { title: "Odkryte terminy", subtitle: `${discovered.length}/${lexicon.length}` }),
      !discovered.length && /* @__PURE__ */ jsx(ui.Text, { muted: true, size: "sm", children: "Kliknij podświetlony termin w czytniku, by go odkryć." }),
      discovered.map((t) => /* @__PURE__ */ jsx(
        ui.ListItem,
        {
          label: String(t.lex.data.term),
          detail: `${Math.round(t.strength * 100)}%`,
          onClick: () => useLocal.setState({ activeTermId: t.lex.id })
        },
        t.lex.id
      ))
    ] }) });
  }
  function LeftPanel() {
    const bq = sdk.shared((s) => s == null ? void 0 : s.bq);
    return /* @__PURE__ */ jsx(ui.Page, { children: /* @__PURE__ */ jsxs(ui.Stack, { children: [
      /* @__PURE__ */ jsx(ui.Heading, { title: "Czytnik" }),
      /* @__PURE__ */ jsxs(ui.Button, { size: "sm", outline: true, onClick: () => {
        sdk.shared.setState({ bq: { ...bq, phase: "map" } });
        sdk.useHostStore.setState({ activeId: "plugin-brain-quest" });
      }, children: [
        /* @__PURE__ */ jsx(ChevronLeft, { size: 14 }),
        " Wróć do mapy"
      ] })
    ] }) });
  }
  sdk.registerView("bqr.left", { slot: "left", component: LeftPanel });
  sdk.registerView("bqr.center", { slot: "center", component: SlideReader });
  sdk.registerView("bqr.right", { slot: "right", component: DiscoveredPanel });
  return { id: "plugin-brain-quest-reader", label: "BQ Czytnik", icon: BookOpen, version: "0.2.0" };
};
export {
  plugin as default
};
