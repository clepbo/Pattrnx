# Personal Behavioral Intelligence Platform

## Architecture & Product Blueprint

**Document:** `architecture.md`\
**Version:** 0.1\
**Status:** Concept / Architecture Definition\
**Purpose:** Define the product, domain model, system architecture,
intelligence layer, and MVP direction for a platform that helps people
understand and change recurring behavioral patterns while actively
executing toward goals.

------------------------------------------------------------------------

# 1. Product Definition

## 1.1 Core idea

The platform is a **personal behavioral intelligence and goal-execution
system**.

It is not primarily:

-   a journal
-   a habit tracker
-   a task manager
-   a routine timer
-   a mood tracker
-   an AI chatbot
-   a traditional goal tracker

Instead, it connects all of these concepts into a continuous feedback
loop:

``` text
Intent
  ↓
Goal
  ↓
Strategy
  ↓
Plan
  ↓
Execution
  ↓
Observed Activity
  ↓
Outcomes
  ↓
Pattern Detection
  ↓
Loop Detection
  ↓
Intervention
  ↓
Experiment
  ↓
New Execution
  ↓
New Evidence
```

The system continuously compares:

> **What I said I wanted → what I said I would do → what I actually did
> → what happened → what keeps happening → what should I change.**

------------------------------------------------------------------------

# 2. Product Philosophy

## 2.1 Intention is not progress

A user saying:

> "I want to become a better Product Designer"

does not mean progress is occurring.

The platform must distinguish:

-   intention
-   planning
-   execution
-   consistency
-   outcome
-   evidence of progress

## 2.2 Goals must be grounded in reality

The system should not blindly encourage a goal.

It should assess:

-   current state
-   target state
-   deadline
-   available resources
-   historical behavior
-   required rate of progress
-   user's proposed strategy
-   execution capacity
-   previous attempts

It can then classify a goal as:

-   On track
-   At risk
-   Stalled
-   Uncertain
-   Needs recalibration

These are descriptive states, not judgments about the person.

## 2.3 Correlation is not causation

The system must distinguish between:

> "These things often happen together."

and:

> "This thing causes that thing."

Unless causality is supported by sufficient evidence or an explicit user
experiment, the system should use cautious language such as:

-   "Possible pattern detected"
-   "These events frequently occur together"
-   "This may be contributing to..."
-   "Consider testing whether..."

## 2.4 The system should optimize for learning, not perfection

A missed activity is data.

A failed plan is data.

A broken routine is data.

The product should help users understand why execution failed rather
than simply displaying failure statistics.

------------------------------------------------------------------------

# 3. Core Product Loop

The primary product loop is:

``` text
1. Define
2. Plan
3. Execute
4. Observe
5. Analyze
6. Intervene
7. Experiment
8. Learn
9. Adapt
```

### Example

Goal:

> Build a ₦2,000,000 emergency fund.

Strategy:

> Save monthly + reduce discretionary spending + increase freelance
> income.

Plan:

> Save ₦150,000/month.

Execution:

> Saved ₦80,000.

Observed behavior:

> Weekend discretionary spending repeatedly increases.

Pattern:

> Spending spikes after stressful work weeks.

Possible loop:

``` text
Work stress
    ↓
Entertainment spending
    ↓
Reduced savings
    ↓
Financial pressure
    ↓
More stress
    ↺
```

Intervention:

> Introduce a predefined weekend spending limit and a lower-cost
> recovery activity.

Experiment:

> Run for 21 days.

Result:

> Compare spending and stress patterns before vs. after intervention.

------------------------------------------------------------------------

# 4. Core Domain Model

The platform should be built around explicit domain entities.

## 4.1 User

Represents the person using the system.

``` text
User
├── Profile
├── Preferences
├── Life Areas
├── Goals
├── Activities
├── Routines
├── Patterns
├── Experiments
└── Insights
```

------------------------------------------------------------------------

# 5. Life Areas

Life Areas provide broad context for activities and goals.

Initial areas:

-   Career
-   Finance
-   Health
-   Emotional wellbeing
-   Relationships
-   Learning
-   Personal development
-   Spirituality
-   Productivity
-   Lifestyle

Users should be able to create custom areas.

### Example

``` text
Life Area: Career

Goals:
├── Build portfolio
├── Improve UX research skills
└── Secure new role

Activities:
├── Figma practice
├── Portfolio work
├── Applications
├── Networking
└── Courses
```

------------------------------------------------------------------------

# 6. Goals

A Goal represents a desired future state.

## Goal attributes

``` text
Goal
├── id
├── title
├── description
├── life_area_id
├── current_state
├── target_state
├── unit
├── target_value
├── deadline
├── priority
├── motivation
├── strategy
├── status
├── confidence
├── created_at
└── updated_at
```

### Example

``` text
Goal:
Become employable as a Product Designer

Current state:
Junior / developing portfolio

Target state:
Strong portfolio + interview readiness

Deadline:
12 months

Life area:
Career
```

------------------------------------------------------------------------

# 7. Goal Strategy

A Goal should have a strategy layer.

The user should be able to tell the system:

> "This is how I intend to achieve this."

Example:

``` text
Goal
└── Strategy
    ├── Improve UX fundamentals
    ├── Complete 3 projects
    ├── Build portfolio
    ├── Network with designers
    └── Apply consistently
```

The system analyzes whether the proposed strategy appears sufficient
relative to the goal.

------------------------------------------------------------------------

# 8. Milestones

Large goals should be decomposed into meaningful milestones.

``` text
Goal
│
├── Milestone 1
│   └── Learn UX research
│
├── Milestone 2
│   └── Complete 3 case studies
│
├── Milestone 3
│   └── Build portfolio
│
└── Milestone 4
    └── Apply to roles
```

Milestones represent meaningful stages of progress.

They are not necessarily daily tasks.

------------------------------------------------------------------------

# 9. Actions

Actions are concrete things the user can do.

Example:

``` text
Milestone:
Build portfolio

Actions:
- Select case study
- Write problem statement
- Document research
- Create process section
- Add final UI
- Request feedback
```

An action should ideally answer:

> "What exactly should I do?"

rather than:

> "Work on portfolio."

------------------------------------------------------------------------

# 10. Tasks

Tasks are scheduled or actionable instances of an action.

``` text
Action:
Write problem statement

Task:
Write problem statement for EventPlanna case study

Scheduled:
Tuesday, 7:00 PM

Duration:
30 minutes
```

Tasks may be generated from goals, milestones, routines, or manually
created.

------------------------------------------------------------------------

# 11. Routines

Routines are repeated sequences of actions.

This is where the Routinery-inspired component belongs.

Example:

``` text
Morning Design Routine

07:00 Wake
07:10 Water
07:15 Read
07:30 Plan day
07:40 Design practice
08:10 Begin work
```

A routine can contain:

-   ordered steps
-   expected duration
-   frequency
-   preferred time
-   minimum viable version
-   fallback version

### Minimum viable routine

Instead of:

> "Exercise for 60 minutes"

the system may support:

> Normal: 60 minutes\
> Minimum: 15 minutes

This helps prevent all-or-nothing behavior.

------------------------------------------------------------------------

# 12. Activity

An Activity is an observed event representing something the user
actually did or experienced.

Examples:

``` text
Worked on portfolio
Spent ₦20,000
Exercised
Had difficult meeting
Studied Figma
Scrolled social media
Applied for job
Slept 5 hours
Prayed
Met friend
```

Activities can be:

-   manually logged
-   generated from tasks
-   generated from routines
-   imported from integrations
-   inferred cautiously from connected data

------------------------------------------------------------------------

# 13. Activity Structure

``` text
Activity
├── id
├── user_id
├── life_area_id
├── goal_id (optional)
├── type
├── title
├── description
├── timestamp
├── duration
├── quantity
├── unit
├── energy_level
├── mood
├── context
├── source
├── tags
└── created_at
```

Not every field is required.

The logging experience should remain lightweight.

------------------------------------------------------------------------

# 14. Outcomes

An Outcome is what happened after a behavior, action, or period.

Examples:

``` text
Activity:
Worked on portfolio for 45 minutes

Outcome:
Completed case-study section
```

or:

``` text
Activity:
Spent ₦40,000 on entertainment

Outcome:
Savings contribution reduced that week
```

Outcomes can be:

-   quantitative
-   qualitative
-   positive
-   negative
-   neutral
-   unknown

------------------------------------------------------------------------

# 15. Context

Patterns are rarely understandable without context.

Useful context dimensions include:

-   time of day
-   day of week
-   location/category
-   workload
-   sleep
-   energy
-   mood
-   social context
-   financial context
-   previous activity
-   goal state
-   deadline proximity

Context should be captured manually only when necessary and
automatically where integrations permit.

------------------------------------------------------------------------

# 16. Patterns

A Pattern is a repeated relationship, sequence, trend, or behavioral
structure detected from historical data.

Examples:

### Frequency pattern

> User exercises more consistently on weekdays.

### Sequence pattern

``` text
Stress → late-night scrolling → poor sleep
```

### Temporal pattern

> Portfolio activity consistently decreases during the final week of
> each month.

### Behavioral pattern

> User frequently creates new plans after abandoning previous ones.

### Cross-domain pattern

``` text
Financial stress
    ↓
Anxiety
    ↓
Reduced career focus
    ↓
Reduced output
```

------------------------------------------------------------------------

# 17. Pattern Confidence

Every detected pattern should have a confidence level.

``` text
Pattern confidence
├── Low
├── Moderate
├── High
└── Very High
```

Confidence should depend on:

-   number of observations
-   consistency
-   data quality
-   timeframe
-   number of independent occurrences
-   strength of association

The system must avoid presenting weak correlations as established
truths.

------------------------------------------------------------------------

# 18. Loops

A Loop is a recurring sequence of behaviors or events that returns to an
earlier state.

Example:

``` text
Ambitious plan
    ↓
Strong start
    ↓
Workload increases
    ↓
Execution decreases
    ↓
Goal feels abandoned
    ↓
New plan
    ↓
Strong start
    ↺
```

A loop requires more evidence than a single pattern.

------------------------------------------------------------------------

# 19. Loop Anatomy

Every detected loop should have:

``` text
Loop
├── Trigger
├── Initial response
├── Behavior sequence
├── Short-term outcome
├── Long-term consequence
├── Re-entry condition
├── Breaking points
├── Historical frequency
└── Candidate interventions
```

### Example

``` text
Trigger:
High workload

Response:
Skip planned personal work

Sequence:
Skip → accumulate tasks → feel behind → create new plan

Re-entry:
New week / new motivation

Breaking point:
First missed day
```

------------------------------------------------------------------------

# 20. Intervention

An Intervention is a proposed change intended to alter a detected
pattern or improve goal execution.

Examples:

-   reduce task size
-   change timing
-   change environment
-   remove friction
-   add accountability
-   introduce a minimum commitment
-   change sequence
-   change strategy
-   change goal deadline
-   remove unnecessary activity

The platform should prefer **small, testable interventions** over broad
motivational advice.

------------------------------------------------------------------------

# 21. Behavioral Experiments

Interventions should often become experiments.

``` text
Experiment
├── Hypothesis
├── Intervention
├── Duration
├── Baseline
├── Metrics
├── Expected result
├── Actual result
├── Conclusion
└── Next action
```

### Example

``` text
Hypothesis:

A 30-minute daily portfolio commitment
will be easier to maintain than a
2-hour commitment.

Experiment:

30 minutes/day for 14 days.

Measure:

Execution consistency
Portfolio output
Perceived effort

Result:

12/14 days completed.

Conclusion:

Smaller commitment produced higher
consistency.
```

This transforms the platform from a passive tracker into a system for
personal experimentation.

------------------------------------------------------------------------

# 22. Goal Reality Model

Every goal should maintain three layers:

``` text
INTENTION
What I want

     ↓

PLAN
What I believe I need to do

     ↓

REALITY
What I actually do
```

The system continuously compares these layers.

### Example

``` text
Intention:
Exercise 5x/week

Plan:
Mon Tue Wed Thu Fri

Reality:
Mon ✓
Tue ✓
Wed ✗
Thu ✗
Fri ✓
```

The system can learn:

> Sustainable execution appears closer to 3 sessions/week.

It can then suggest redesigning the plan around actual behavior rather
than continuing to assume an unrealistic schedule.

------------------------------------------------------------------------

# 23. Goal Feasibility Engine

The platform should evaluate whether a goal appears achievable under the
current strategy.

## Inputs

-   target
-   current state
-   deadline
-   historical rate of progress
-   required rate
-   available time
-   available money/resources
-   user's proposed strategy
-   execution consistency

## Outputs

``` text
Goal feasibility
├── Appears feasible
├── Feasible with adjustments
├── At risk
├── Currently unrealistic
└── Insufficient data
```

The engine should explain the result.

### Example

``` text
Target:
₦2,000,000

Current:
₦400,000

Time:
6 months

Required monthly savings:
₦266,667

Historical monthly savings:
₦80,000

Gap:
₦186,667

Assessment:
Current strategy appears insufficient.

Possible adjustments:
1. Increase income
2. Reduce spending
3. Extend deadline
4. Combine multiple strategies
```

------------------------------------------------------------------------

# 24. Goal Progress Engine

Progress should not be represented only as percentage completion.

Dimensions may include:

``` text
Outcome progress
Execution progress
Consistency
Milestone progress
Strategy adherence
Time progress
Momentum
```

Example:

``` text
GOAL HEALTH

Outcome progress       54%
Execution consistency  72%
Milestone progress     61%
Strategy adherence     48%
Time elapsed           65%

State:
AT RISK

Primary reason:
Execution is inconsistent relative to the
required rate of progress.
```

------------------------------------------------------------------------

# 25. Pattern Engine

The Pattern Engine analyzes historical activity and goal data.

It should detect:

## A. Frequency

What happens often?

## B. Sequence

What tends to happen before/after something?

## C. Duration

How long does a behavior persist?

## D. Timing

When does it happen?

## E. Co-occurrence

What happens together?

## F. Deviation

When does actual behavior differ from the plan?

## G. Trend

Is behavior increasing, decreasing, or stable?

## H. Recurrence

Does the same pattern repeatedly return?

## I. Cross-domain relationships

Does activity in one life area repeatedly coincide with changes in
another?

------------------------------------------------------------------------

# 26. Pattern Detection Pipeline

``` text
Raw Activities
      ↓
Normalize
      ↓
Enrich with Context
      ↓
Aggregate
      ↓
Generate Candidate Patterns
      ↓
Statistical / Rule Analysis
      ↓
Pattern Confidence
      ↓
Pattern Classification
      ↓
Human-readable Explanation
      ↓
User Feedback
```

User feedback should improve the model.

For example:

> "This pattern is not relevant."

or:

> "Yes, this is something I struggle with."

------------------------------------------------------------------------

# 27. Loop Detection Pipeline

``` text
Activities
    ↓
Sequences
    ↓
Repeated Sequences
    ↓
Cycle Detection
    ↓
Context Analysis
    ↓
Loop Candidate
    ↓
Confidence
    ↓
Loop Explanation
    ↓
Breaking Point Detection
    ↓
Intervention Candidates
```

------------------------------------------------------------------------

# 28. Breaking Point Detection

A key feature should be identifying where a user typically falls out of
a successful behavior sequence.

Example:

``` text
Day 1  ✓
Day 2  ✓
Day 3  ✓
Day 4  ✗
Day 5  ✗
Day 6  ✗
```

Across several repetitions:

``` text
Typical breakdown:
Day 3–4
```

The system can then intervene before the expected failure point.

Instead of:

> "You missed today's task."

It could say:

> "This is usually where this goal starts losing momentum. Consider
> switching to your minimum version today."

------------------------------------------------------------------------

# 29. Intervention Engine

The Intervention Engine takes:

``` text
Goal state
+
Detected pattern
+
User constraints
+
Historical interventions
+
Available actions
```

and generates candidate interventions.

## Intervention categories

### Reduce

Reduce task size or duration.

### Reschedule

Move activity to a higher-probability time.

### Sequence

Change the order of actions.

### Replace

Replace an ineffective behavior.

### Remove friction

Make desired behavior easier.

### Add friction

Make undesired behavior harder.

### Environment

Change the physical/digital context.

### Accountability

Add another person or commitment.

### Strategy change

Change the method of pursuing the goal.

### Goal recalibration

Change target or deadline when evidence suggests the original plan is
not realistic.

------------------------------------------------------------------------

# 30. Recommendation Engine

Recommendations should be:

-   specific
-   actionable
-   contextual
-   evidence-based
-   proportional
-   testable

Avoid:

> "Stay motivated."

Prefer:

> "Your execution drops when tasks exceed approximately 60 minutes. For
> the next 14 days, split portfolio work into 30-minute sessions."

The recommendation should include the evidence behind it.

------------------------------------------------------------------------

# 31. Daily Experience

The daily experience should not become another overwhelming dashboard.

A possible daily screen:

``` text
GOOD MORNING

Today's focus

1. Finish case-study problem statement
   30 min

2. Review yesterday's spending
   10 min

3. 20-minute workout

--------------------------------

PATTERN TO WATCH

You tend to skip personal projects
after high-workload days.

Today is a high-workload day.

Suggested adjustment:
Use the 20-minute minimum version.

--------------------------------

ACTIVE GOALS

Career       🟡
Finance      🟢
Health       🟡
```

------------------------------------------------------------------------

# 32. Weekly Review

The weekly view answers:

> What happened this week?

> What repeated?

> What changed?

> What should I adjust?

Example:

``` text
WEEKLY REVIEW

Execution
████████░░ 78%

Goals
2 progressing
1 at risk

Patterns detected
3

Loop detected
1

Largest positive change
Portfolio consistency +24%

Largest concern
Sleep disruption correlated with
lower next-day execution.

Suggested experiment
Protect sleep start time for 7 days.
```

------------------------------------------------------------------------

# 33. Monthly Review

The monthly view should identify higher-level trends.

``` text
MONTHLY TRAJECTORY

Career
↑

Finance
→

Health
↓

Learning
↑

Patterns

1. Stronger execution on mornings
2. Spending spikes after stressful weeks
3. Goal abandonment after missed days

Loop status

Career loop:
Still active

Finance loop:
Reduced frequency

Experiment results:
2 completed
1 inconclusive
```

------------------------------------------------------------------------

# 34. Yearly View

The yearly view should answer:

> Who am I becoming based on what I repeatedly do?

Possible outputs:

-   goal trajectories
-   behavior trends
-   major changes
-   recurring loops
-   abandoned goals
-   completed experiments
-   strategy changes
-   life-area balance
-   important milestones

The yearly view should emphasize **trajectory**, not vanity statistics.

------------------------------------------------------------------------

# 35. Life Graph

A graph layer can connect:

``` text
Goal
↓
Milestone
↓
Action
↓
Activity
↓
Outcome
↓
Pattern
↓
Loop
↓
Intervention
↓
Experiment
```

Cross-domain relationships can also be represented:

``` text
Finance Activity
      ↓
Financial Stress
      ↓
Emotional State
      ↓
Career Execution
      ↓
Career Outcome
```

This becomes the underlying "thread" visualization concept.

------------------------------------------------------------------------

# 36. Visualization Model

The product should support multiple visualization modes.

## Timeline

Chronological activity.

## Thread

A goal or behavioral trajectory across time.

## Loop

Circular representation of repeated behavior.

## Graph

Relationships between areas, activities, patterns, and outcomes.

## Trend

Change over time.

## Heatmap

Frequency by day/time.

## Goal trajectory

Current trajectory versus required trajectory.

## Sankey-style flow

Useful for showing:

``` text
Trigger → Behavior → Outcome
```

The visualization should explain data rather than simply decorate it.

------------------------------------------------------------------------

# 37. Data Architecture

A relational database is appropriate for the core system.

Suggested entities:

``` text
users
life_areas
goals
goal_strategies
milestones
actions
tasks
routines
routine_steps
activities
activity_context
outcomes
patterns
pattern_occurrences
loops
loop_occurrences
interventions
experiments
experiment_metrics
insights
reviews
integrations
events
```

------------------------------------------------------------------------

# 38. Simplified Relationship Model

``` text
User
 │
 ├── Life Areas
 │     │
 │     ├── Goals
 │     │     ├── Strategy
 │     │     ├── Milestones
 │     │     │     └── Actions
 │     │     └── Tasks
 │     │
 │     ├── Activities
 │     └── Outcomes
 │
 ├── Routines
 │     └── Routine Steps
 │
 ├── Patterns
 │     └── Pattern Occurrences
 │
 ├── Loops
 │     └── Loop Occurrences
 │
 ├── Interventions
 │     └── Experiments
 │
 └── Insights
```

------------------------------------------------------------------------

# 39. Event-Based Architecture

Activities should ideally be represented as events.

Example:

``` json
{
  "event_type": "activity.completed",
  "user_id": "user_123",
  "timestamp": "2026-09-20T19:00:00Z",
  "activity_type": "design_work",
  "duration_minutes": 45,
  "goal_id": "goal_456",
  "life_area": "career"
}
```

Events can then feed multiple systems:

``` text
Event
 ↓
Activity Store
 ↓
Analytics
 ↓
Goal Progress
 ↓
Pattern Engine
 ↓
Insight Engine
```

This architecture makes future integrations easier.

------------------------------------------------------------------------

# 40. AI Architecture

AI should sit on top of structured behavioral data.

Do not make the LLM the primary database or source of truth.

Recommended architecture:

``` text
                    USER DATA
                       ↓
                Structured Database
                       ↓
                Analytics Layer
                       ↓
              Pattern / Goal Engines
                       ↓
                Insight Candidates
                       ↓
                 LLM Reasoning
                       ↓
             Human-readable insight
                       ↓
                    User
```

The LLM should interpret structured evidence rather than inventing
patterns.

------------------------------------------------------------------------

# 41. AI Responsibilities

## Goal Analysis

Assess feasibility and identify missing information.

## Goal Decomposition

Convert goals into milestones and actions.

## Planning

Create realistic execution plans.

## Reflection

Summarize what happened.

## Pattern Explanation

Turn detected patterns into understandable language.

## Intervention Generation

Suggest possible experiments.

## Adaptive Planning

Adjust plans based on execution history.

## Conversational Interface

Allow users to ask:

> "Why am I not progressing on this goal?"

> "What keeps getting in my way?"

> "What changed this month?"

> "What should I focus on next week?"

------------------------------------------------------------------------

# 42. AI Guardrails

The system should never present speculative behavioral explanations as
facts.

Bad:

> "You procrastinate because you are afraid of failure."

Better:

> "You frequently stop this goal after difficult tasks. One possible
> explanation is that task difficulty may be contributing, but the
> current data cannot establish why. We could test whether smaller tasks
> improve continuation."

The user should be able to inspect the evidence behind major insights.

------------------------------------------------------------------------

# 43. Integrations

Long-term integrations could include:

### Productivity

-   Calendar
-   Tasks
-   project management tools

### Health

-   Apple Health
-   Google Health / supported health platforms
-   wearables

### Finance

-   bank transaction imports
-   budgeting platforms
-   CSV imports

### Work

-   GitHub
-   Figma
-   time tracking

### Digital behavior

-   screen time
-   browser/productivity data

### Journaling

-   manual reflections
-   notes

Integrations should be introduced gradually because privacy and
permissions are significant parts of the product.

------------------------------------------------------------------------

# 44. Privacy Architecture

Behavioral data is highly personal.

The system should be designed around:

-   explicit consent
-   granular integrations
-   minimal data collection
-   encryption
-   clear data ownership
-   export
-   deletion
-   transparent AI processing
-   no hidden behavioral inference
-   user control over connected data

Users should be able to see what information produced a significant
insight.

------------------------------------------------------------------------

# 45. MVP

The first version should NOT attempt to build the complete life
operating system.

The MVP should validate one core hypothesis:

> **Can structured activity data + goals + pattern detection help a user
> understand why they are or aren't progressing?**

## MVP features

### 1. User account

Basic profile and preferences.

### 2. Life Areas

Create/manage areas.

### 3. Goals

Create:

-   target
-   deadline
-   current state
-   intended strategy

### 4. Goal decomposition

Create:

-   milestones
-   actions
-   tasks

### 5. Activity logging

Fast manual logging.

### 6. Basic routines

Recurring sequences with completion tracking.

### 7. Goal progress

Show planned vs actual execution.

### 8. Pattern detection

Start with:

-   frequency
-   streaks
-   deviations
-   repeated sequences
-   timing

### 9. Loop detection

Simple rule/statistical detection.

### 10. Weekly review

Automatically generate:

-   progress summary
-   recurring patterns
-   deviations
-   suggested intervention

### 11. Experiments

Allow users to run a small intervention for a defined period.

------------------------------------------------------------------------

# 46. What NOT to build initially

Avoid:

-   dozens of integrations
-   complex social features
-   public profiles
-   gamification
-   marketplace
-   excessive journaling
-   fully autonomous AI coaching
-   advanced life graph visualization
-   financial account linking
-   health-device integrations

These can come later.

The first question is whether the core loop works.

------------------------------------------------------------------------

# 47. Suggested MVP User Journey

``` text
SIGN UP
  ↓
Select Life Areas
  ↓
Create First Goal
  ↓
Describe Intended Strategy
  ↓
System checks feasibility
  ↓
Break Goal into Milestones
  ↓
Create Actions
  ↓
Schedule Tasks / Routine
  ↓
Log Activities
  ↓
System observes execution
  ↓
Weekly Review
  ↓
Pattern detected
  ↓
User sees evidence
  ↓
Intervention suggested
  ↓
User starts experiment
  ↓
Experiment measured
  ↓
Plan adapted
```

------------------------------------------------------------------------

# 48. Example End-to-End Scenario

## Goal

Become a stronger Product Designer.

## User strategy

``` text
Study UX
Build projects
Improve portfolio
Network
Apply for roles
```

## System decomposition

``` text
Goal
│
├── UX Fundamentals
│   ├── Research
│   ├── Information Architecture
│   └── Usability
│
├── Projects
│   ├── Project 1
│   ├── Project 2
│   └── Project 3
│
├── Portfolio
│   ├── Case Study 1
│   ├── Case Study 2
│   └── Portfolio Site
│
└── Career
    ├── Networking
    ├── Applications
    └── Interview Preparation
```

## After 60 days

The system observes:

``` text
Learning:        High
Project work:    Medium
Portfolio:       Low
Applications:    Very low
```

Pattern:

> User spends substantially more time preparing than
> publishing/applying.

Loop:

``` text
Learn
 ↓
Feel underprepared
 ↓
Learn more
 ↓
Avoid publishing
 ↓
Feel underprepared
 ↺
```

Intervention:

> Publish one imperfect case-study section each week before beginning
> new learning material.

Experiment:

> 4 weeks.

The system measures whether portfolio output increases without reducing
learning quality excessively.

------------------------------------------------------------------------

# 49. Product Architecture

A practical high-level architecture:

``` text
┌─────────────────────────────────────────────┐
│                  CLIENT                     │
│                                             │
│ Web / Mobile / Desktop                      │
│                                             │
│ Dashboard                                   │
│ Goals                                       │
│ Today                                       │
│ Routines                                    │
│ Activity Log                                │
│ Timeline                                    │
│ Patterns                                    │
│ Experiments                                 │
│ Reviews                                     │
└──────────────────────┬──────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────┐
│                    API                      │
│                                             │
│ Auth                                        │
│ Goals                                       │
│ Activities                                  │
│ Routines                                    │
│ Analytics                                   │
│ Insights                                    │
│ Experiments                                 │
└──────────────────────┬──────────────────────┘
                       │
           ┌───────────┴────────────┐
           ↓                        ↓
┌──────────────────────┐  ┌───────────────────┐
│ Operational Database │  │ Event / Analytics │
│                      │  │ Store             │
│ PostgreSQL           │  │                   │
│                      │  │ Aggregations      │
└──────────┬───────────┘  └─────────┬─────────┘
           │                        │
           └────────────┬───────────┘
                        ↓
              ┌─────────────────────┐
              │ Intelligence Layer  │
              │                     │
              │ Goal Engine         │
              │ Pattern Engine      │
              │ Loop Engine         │
              │ Recommendation      │
              │ Experiment Engine   │
              └──────────┬──────────┘
                         ↓
              ┌─────────────────────┐
              │ AI / LLM Layer      │
              │                     │
              │ Explanation         │
              │ Planning            │
              │ Reasoning           │
              │ Conversation        │
              └─────────────────────┘
```

------------------------------------------------------------------------

# 50. Recommended Technical Direction

For an initial web MVP:

## Frontend

-   Next.js
-   TypeScript
-   React
-   Tailwind CSS

## Backend

Possible options:

-   Next.js API routes / server actions for an early MVP
-   or a dedicated backend if complexity grows

## Database

-   PostgreSQL

## Authentication

-   Supabase Auth
-   Clerk
-   Auth.js

## Data / backend platform

Supabase is a strong candidate for the MVP because it can provide:

-   PostgreSQL
-   authentication
-   storage
-   row-level security
-   APIs
-   realtime capabilities

## Background jobs

A queue/background worker will eventually be useful for:

-   pattern analysis
-   weekly reviews
-   scheduled insights
-   integrations
-   experiment evaluation

Possible technologies:

-   Trigger.dev
-   Inngest
-   BullMQ
-   managed queue infrastructure

## AI

Use an LLM through a structured service layer.

Do not allow direct uncontrolled database access from the model.

------------------------------------------------------------------------

# 51. Core API Concepts

Potential API resources:

``` text
/auth
/users
/life-areas
/goals
/goals/:id/strategy
/goals/:id/milestones
/actions
/tasks
/routines
/activities
/outcomes
/patterns
/loops
/interventions
/experiments
/insights
/reviews
```

Example:

``` http
POST /goals
GET /goals/:id
POST /goals/:id/milestones
POST /activities
GET /patterns
GET /goals/:id/progress
GET /goals/:id/trajectory
POST /experiments
```

------------------------------------------------------------------------

# 52. Data Processing Strategy

Do not analyze the entire user history every time.

Use layered processing.

## Real-time

-   task completion
-   goal progress
-   basic statistics

## Daily

-   activity aggregation
-   deviations
-   lightweight pattern checks

## Weekly

-   pattern analysis
-   goal health
-   loop candidates
-   review generation

## Monthly

-   trend analysis
-   cross-domain patterns
-   goal trajectory
-   strategy assessment

## Quarterly / yearly

-   long-term behavioral trends
-   major goal changes
-   recurring loops
-   life-area trajectories

------------------------------------------------------------------------

# 53. Insight Lifecycle

An insight should move through states:

``` text
Candidate
  ↓
Validated
  ↓
Presented
  ↓
User acknowledged
  ↓
Intervention proposed
  ↓
Experiment started
  ↓
Experiment completed
  ↓
Learning recorded
```

This prevents the system from repeatedly presenting the same unhelpful
insight.

------------------------------------------------------------------------

# 54. User Feedback Loop

Users should be able to respond to insights:

``` text
Insight:

"You tend to abandon goals after missed days."

User:
[Accurate]
[Partially accurate]
[Not accurate]
[Don't show this again]
```

This feedback can improve personalization.

------------------------------------------------------------------------

# 55. Important UX Principle

The system should never make the user feel like they are maintaining a
database.

Logging should be:

-   fast
-   contextual
-   optional where possible
-   forgiving
-   low friction

Potential logging methods:

### Quick log

> What did you do?

### Natural language

> "Spent 2 hours working on my portfolio."

System converts this into structured activity.

### One-tap activities

Frequently used activities.

### Task completion

Completing a task automatically generates activity evidence.

### Integrations

Automatically capture available data.

------------------------------------------------------------------------

# 56. The "Today" Experience Should Be Adaptive

The system should not generate the same static routine every day.

It should consider:

``` text
Goals
+
Deadline
+
Recent execution
+
Energy
+
Workload
+
Pattern risk
+
Previous failures
```

Then produce an adaptive day.

Example:

``` text
Today's plan

HIGH PRIORITY
30m Portfolio

MAINTENANCE
20m Exercise

OPTIONAL
30m UX learning

Why:

You have a portfolio deadline approaching,
but your recent pattern shows that adding
too many tasks reduces execution.
```

------------------------------------------------------------------------

# 57. Long-Term Product Evolution

## Phase 1

Goal + activity + basic patterns.

## Phase 2

Routines + adaptive planning + experiments.

## Phase 3

Cross-domain pattern detection.

## Phase 4

Automatic integrations.

## Phase 5

Predictive intervention.

## Phase 6

Personal behavioral model.

Eventually:

``` text
User
 ↓
Personal Behavioral Model
 ↓
Current State
 ↓
Likely Risks
 ↓
Goal Trajectory
 ↓
Recommended Actions
```

The system becomes increasingly personalized through evidence.

------------------------------------------------------------------------

# 58. Key Product Metrics

The product should not optimize primarily for:

-   daily active users
-   streak length
-   number of logged activities

Those can encourage compulsive tracking without improving outcomes.

More meaningful product metrics include:

### Goal execution rate

How often planned actions actually happen.

### Goal completion

How often meaningful goals reach their intended outcome.

### Pattern discovery

Whether users discover useful patterns.

### Intervention adoption

How often users try suggested interventions.

### Experiment completion

Whether experiments are actually completed.

### Behavioral change

Whether the targeted pattern changes after intervention.

### User-reported usefulness

Did the insight actually help?

------------------------------------------------------------------------

# 59. Core Product Hypothesis

The most important hypothesis to validate is:

> **People make better progress toward meaningful goals when they can
> see the relationship between their intentions, actual behaviors,
> recurring patterns, and outcomes, and can run small experiments to
> change those patterns.**

Everything in the MVP should support testing this hypothesis.

------------------------------------------------------------------------

# 60. Product North Star

A useful north-star concept is:

> **Help users close the gap between what they intend to do and what
> they consistently do.**

The platform should continuously answer four questions:

``` text
1. What do I want?

2. What am I actually doing?

3. What pattern explains the gap?

4. What can I change next?
```

------------------------------------------------------------------------

# 61. Final Concept

The product can be thought of as:

## A personal behavioral operating system

It combines:

``` text
GOALS
+
ROUTINES
+
TASKS
+
ACTIVITIES
+
OUTCOMES
+
PATTERNS
+
LOOPS
+
INTERVENTIONS
+
EXPERIMENTS
+
AI
```

into one continuous system.

The core differentiator is not simply tracking.

It is:

> **Observe → Understand → Intervene → Experiment → Adapt.**

The platform should help a person move from:

> "I want to change."

to:

> "This is what I am currently doing."

to:

> "This is the pattern keeping me here."

to:

> "This is where I can intervene."

to:

> "I tested a different approach."

to:

> "Here is what changed."

That is the foundation on which the rest of the product should be built.
