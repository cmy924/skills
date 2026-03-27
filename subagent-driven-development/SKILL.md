---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute plan by dispatching fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration

## When to Use

**Use when:**
- You have a written implementation plan
- Tasks are mostly independent
- You want to stay in the current session

**vs. Executing Plans:**
- Same session (no context switch)
- Fresh subagent per task (no context pollution)
- Two-stage review after each task: spec compliance first, then code quality

## The Process

1. **Read plan, extract all tasks with full text, note context, create TodoWrite**
2. **For each task:**
   - Dispatch implementer subagent with full task text + context
   - Answer any questions the implementer asks (before proceeding)
   - Implementer implements, tests, commits, self-reviews
   - Dispatch spec reviewer subagent — confirms code matches spec
   - If spec issues found → implementer fixes → re-review
   - Dispatch code quality reviewer subagent
   - If quality issues found → implementer fixes → re-review
   - Mark task complete in TodoWrite
3. **After all tasks:** Dispatch final code reviewer for entire implementation
4. **Use superpowers:finishing-a-development-branch**

## Model Selection

- **Mechanical tasks** (isolated functions, clear specs, 1-2 files): use a fast, cheap model
- **Integration tasks** (multi-file coordination, debugging): use a standard model
- **Architecture/design/review tasks**: use the most capable available model

## Handling Implementer Status

- **DONE:** Proceed to spec compliance review.
- **DONE_WITH_CONCERNS:** Read concerns. Address correctness/scope issues before review.
- **NEEDS_CONTEXT:** Provide missing context and re-dispatch.
- **BLOCKED:** Assess: provide more context, use more capable model, break into smaller pieces, or escalate to human.

**Never** ignore an escalation or force the same model to retry without changes.

## Prompt Templates

- `./implementer-prompt.md` - Dispatch implementer subagent
- `./spec-reviewer-prompt.md` - Dispatch spec compliance reviewer subagent
- `./code-quality-reviewer-prompt.md` - Dispatch code quality reviewer subagent

## Red Flags

**Never:**
- Start implementation on main/master branch without explicit user consent
- Skip reviews (spec compliance OR code quality)
- Proceed with unfixed issues
- Dispatch multiple implementation subagents in parallel (conflicts)
- Make subagent read plan file (provide full text instead)
- Accept "close enough" on spec compliance
- **Start code quality review before spec compliance is ✅** (wrong order)
- Move to next task while either review has open issues

**If reviewer finds issues:**
- Implementer (same subagent) fixes them
- Reviewer reviews again
- Repeat until approved

## Integration

**Required workflow skills:**
- **superpowers:using-git-worktrees** - REQUIRED: Set up isolated workspace before starting
- **superpowers:writing-plans** - Creates the plan this skill executes
- **superpowers:requesting-code-review** - Code review template for reviewer subagents
- **superpowers:finishing-a-development-branch** - Complete development after all tasks

**Subagents should use:**
- **superpowers:test-driven-development** - Subagents follow TDD for each task
