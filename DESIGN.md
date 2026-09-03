---
name: Sightline
description: A calm shared review surface where agent work stops for human judgment.
colors:
  system-blue: "#0071e3"
  system-blue-dark: "#0058b0"
  verified-green: "#34c759"
  verified-green-dark: "#248a3d"
  human-orange: "#ff9500"
  human-orange-dark: "#b25000"
  critical-red: "#ff3b30"
  severity-purple: "#af52de"
  system-field: "#f2f2f7"
  page-white: "#ffffff"
  primary-text: "#1c1c1e"
  secondary-text: "#4a4a4f"
  tertiary-text: "#6a6a70"
  disabled-text: "#a8a8ae"
  hairline: "rgb(60 60 67 / 13%)"
  control-fill: "rgb(120 120 128 / 12%)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "46px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.026em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  evidence:
    fontFamily: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
rounded:
  icon: "7px"
  compact: "10px"
  card: "14px"
  page: "20px"
  sheet: "22px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "30px"
components:
  button-primary:
    backgroundColor: "{colors.system-blue}"
    textColor: "{colors.page-white}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "46px"
  segmented-control:
    backgroundColor: "{colors.control-fill}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.compact}"
    padding: "2px"
    height: "34px"
  issue-card:
    backgroundColor: "{colors.page-white}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.card}"
  approval-sheet:
    backgroundColor: "rgb(255 255 255 / 88%)"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.sheet}"
    padding: "8px 22px 16px"
---

# Design System: Sightline

## Overview

**Creative North Star: "The Human Review Surface"**

Sightline v5 is a calm Apple-style workbench built around one relationship:
the agent works on the page, then stops when human judgment is required. The
solid white Stride for Life fixture owns the left side. A translucent review
rail owns status, progress, issues, and declared WebMCP calls on the right.

Visual authority is the user-selected, thumbnail-matching
`Sightline Workbench v5.dc.html` with SHA-256
`c88cf56020b7caa5e2a90187c78741132f5aa6c310abf4b37ed800ef50b23b7c`.

**Key Characteristics:**
- F2F2F7 field and restrained translucent system chrome.
- Solid white page card with quiet depth.
- System blue for agent action, orange for the human turn, green for proof.
- Issues and Agent log share one fixed rail.
- Approval rises from the page as a bottom sheet.
- Monospace appears only for selectors, rules, tools, and diffs.

## Colors

The palette follows semantic system roles rather than product decoration.

- **System Blue** (`#0071e3`): primary action, selected DOM outline, links,
  agent trace, and active controls.
- **Human Orange** (`#ff9500`): Your turn and waiting-for-approval state.
- **Verified Green** (`#34c759`): progress, fixed state, and successful re-scan.
- **System Field** (`#f2f2f7`): application ground and image placeholder.
- **Page White** (`#ffffff`): audited page, issue card, trace card, and export.
- **Primary / Secondary / Tertiary Text** (`#1c1c1e`, `#4a4a4f`,
  `#6a6a70`): hierarchy without decorative color.

**The State Color Rule.** Blue acts, orange waits for the person, green proves.
Never use green for a proposal.

## Typography

**Display and body:** Apple-compatible system sans stack  
**Evidence:** SF Mono-compatible monospace stack

- **Display** (600, `46px`, 1.05): fixture hero only.
- **Rail title** (600, `17px`, 1.25): current system state.
- **Body** (400, `14px`, 1.5): explanations and human guidance.
- **Issue title** (500, `14.5px`, 1.35): human-readable barrier.
- **Evidence** (400–600, `12–12.5px`, 1.45): rule, selector, tool, and diff.

**The Evidence Rule.** Machine-readable facts use mono; decisions use system
sans.

## Layout

A `52px` translucent header sits above a two-pane workbench. The review rail
is `336–404px`; remaining width belongs to the page. The audited card is
centered at `868px` with `30px` stage insets.

The rail order is fixed: status, progress, primary Watch action, segmented
Issues/Agent log, scrolling content, Undo/Start over. Approval docks over the
bottom of the stage at `748px` maximum width. At `980px`, stage and rail stack;
at `700px`, the page becomes single-column and approval controls stack.

## Elevation & Depth

Routine UI is tonal and hairline-separated. Three surfaces lift:

- Page card: `0 1px 2px rgb(0 0 0 / 5%), 0 14px 44px rgb(0 0 0 / 9%)`.
- Node callout: `0 1px 3px rgb(0 0 0 / 8%), 0 16px 38px rgb(0 0 0 / 18%)`.
- Approval sheet: `0 1px 3px rgb(0 0 0 / 8%), 0 18px 50px rgb(0 0 0 / 22%)`.

Blur belongs only to header, rail, node callout, approval, and export scrim.

## Shapes

Small icon marks use `7px`; segmented controls `10px`; issue and trace cards
`14px`; audited page `20px`; approval/export `22px`. Capsules are reserved for
actions, amount controls, progress, and sheet handles.

## Components

### Status and progress
Orange dot + title + body explain who acts next. Progress states fixed count
and remaining count above a `6px` green track.

### Review rail
Issues and Agent log use a two-option segmented control. Issue rows show
ordinal, human title, mono rule/impact, optional state, and chevron. Detail
expands inside the same white card.

### Node callout
A translucent `224px` callout attaches to the blue DOM outline and lists
highlight, proposal, and apply state.

### Approval sheet
The glass sheet contains Your call, selector/rule, human explanation, compact
diff, safe Skip, and blue Approve. Nothing applies before this step.

### Stride fixture
White page with blue actions, neutral controls, gray media placeholder, green
fundraising bar, and synthetic demo metrics. It contains fourteen deliberate
barriers and must remain labelled synthetic.

## Do's and Don'ts

### Do:
- **Do** match `Sightline Workbench v5.dc.html`, not another archive variant.
- **Do** keep page and review rail visible together.
- **Do** show Watch the agent work before issue detail.
- **Do** stop every mutation at Your call.
- **Do** keep native WebMCP results at 23 issues / overall score 54.

### Don't:
- **Don't** restore the pink unversioned variant.
- **Don't** restore the custom Apple/Liquid Glass welcome interface.
- **Don't** add a third permanent panel or fake chat.
- **Don't** use orange for agent work or green before verification.
- **Don't** present synthetic metrics as real charity claims.
