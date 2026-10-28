export interface BuiltinSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  content: string;
}

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    id: "code-review",
    name: "code-review",
    description: "Review a diff or files for correctness, security, performance and missing tests.",
    tags: ["engineering", "quality"],
    content: `# Code review

Use this skill when the user asks for a review, an audit, or a second opinion on code.

## Procedure
1. Establish scope: read the diff (\`git diff\`, \`git diff --staged\`) or the named files. If the repo is large, start with \`list_dir\` and \`grep\`.
2. Read the surrounding code, not just the changed lines. Check how the change interacts with callers, error paths, and configuration.
3. Run what can be run: type checker, linter, and the relevant tests. Report the exact commands and outcomes.
4. Review in this order: correctness → security → data loss/edge cases → performance → readability → tests.

## What to look for
- Broken assumptions, off-by-one errors, unhandled null/undefined, swallowed exceptions.
- Injection (shell, SQL, path traversal), secret leakage in logs, unsafe deserialization, missing auth checks.
- Race conditions, unbounded memory/CPU, N+1 queries, missing indexes.
- API/contract drift, migration hazards, backwards compatibility.
- Tests that assert the wrong thing, or no test for the risky path.

## Output
Lead with findings, ordered by severity. For each: file:line, what is wrong, why it matters, and a concrete fix. Do not pad with praise. If nothing is wrong, say so plainly and list what you verified.`,
  },
  {
    id: "debugging",
    name: "debugging",
    description: "Systematically reproduce, isolate and fix a bug, then verify the fix.",
    tags: ["engineering", "quality"],
    content: `# Debugging

Use this skill when something is broken, failing, or behaving unexpectedly.

## Procedure
1. Reproduce: find the smallest command or test that shows the failure. Capture the full error and environment.
2. Read the error: identify the first frame in project code, not the last frame in a library.
3. Form a hypothesis and test it with a targeted read, log, or command. Do not change several things at once.
4. Isolate: bisect inputs, config, versions, or recent commits until the trigger is clear.
5. Fix the root cause, not the symptom. Keep the change minimal.
6. Verify: rerun the reproduction, the surrounding test suite, and a case that should still fail/behave differently.
7. Report: cause, fix, verification commands, residual risk.

## Rules
- Never claim a fix works without running it.
- If you cannot reproduce, say what you tried and what evidence is missing.
- Prefer adding a regression test when the bug could return.`,
  },
  {
    id: "web-research",
    name: "web-research",
    description: "Research a topic on the web, fetch primary sources, and produce a cited answer.",
    tags: ["research", "web"],
    content: `# Web research

Use this skill for questions that need current or external information.

## Procedure
1. Restate the question as 1-3 concrete search queries.
2. Run \`web_search\` for each angle. Prefer primary sources: official docs, changelogs, standards, source repos, papers.
3. Open the best 3-5 results with \`web_fetch\`. Verify claims against the source text; do not trust snippets alone.
4. Note publication dates and versions. Flag anything that may be outdated.
5. If sources disagree, say so and explain which is more authoritative and why.

## Output
Answer directly first. Then the evidence, with inline links. Include a short "Sources" list. Never invent URLs, quotes, or version numbers. If you could not verify something, label it as unverified.`,
  },
  {
    id: "file-editing",
    name: "file-editing",
    description: "Safely modify files in a repository: read first, exact edits, verify after.",
    tags: ["engineering", "files"],
    content: `# File editing

## Procedure
1. Locate the file with \`glob\` or \`grep\`; read it with \`read_file\` before changing anything.
2. Match the project's conventions: naming, imports, formatting, error handling, test style.
3. Use \`edit_file\` with exact \`oldString\` including enough context to be unique. Use \`write_file\` only for new files or full rewrites.
4. Keep changes focused. Do not reformat unrelated code or delete work you do not understand.
5. After editing: run the formatter/type checker/tests the project uses. Fix what you broke.
6. Summarize exactly which files changed and what was verified.

## Safety
- Never overwrite a file you have not read.
- Preserve user changes; if a file looks unrelated or modified, leave it alone.
- Do not commit, push, or rewrite history unless the user asks.`,
  },
  {
    id: "project-scaffold",
    name: "project-scaffold",
    description: "Plan and build a new project or feature from scratch, ending with a runnable artifact.",
    tags: ["engineering", "planning"],
    content: `# Project scaffold

Use this skill for "build me an app/feature" requests.

## Procedure
1. Clarify only the decisions that change the architecture (target platforms, runtime, storage, auth). If the request is clear enough, proceed with sensible defaults and state them.
2. Inspect the environment first: runtime versions, package manager, available toolchains, network access.
3. Write a short plan: modules, data flow, dependencies, build/package path, verification.
4. Scaffold the smallest end-to-end slice that runs. Build from the core outward: data layer → engine → interface → packaging.
5. Verify at every layer with real commands. Keep a scratch note of what passed.
6. Finish with: how to run it, what works, what is stubbed, and the next concrete step.

## Rules
- Prefer boring, well-supported technology over novelty.
- Do not add a dependency for something you can implement in a few lines.
- Do not leave placeholder code that pretends to work. Mark stubs explicitly.
- Build artifacts must be reproducible from a clean checkout.`,
  },
];
