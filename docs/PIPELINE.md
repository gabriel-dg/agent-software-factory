# Pipeline wiring (this run)

Human-facing map of the eight-agent pipeline that produced the Monty Hall
specimen. It is an illustration, not a contract.

If anything here disagrees with [`docs/TEAM.md`](TEAM.md) (ownership) or
[`CLAUDE.md`](../CLAUDE.md) (sequence, gates, round limits), those files
win. The playbook distilled from the run is
[`docs/LESSONS.md`](LESSONS.md), not this page.

## Ownership (writes only)

Solid arrows are exclusive write. Each product file has exactly one.
skeptic and design-reviewer write nothing. Reads are in the roster table
in [`docs/TEAM.md`](TEAM.md), not drawn here. Orchestrator-owned files
(README, CLAUDE.md, this page, and the rest of that row) are also omitted;
they are not part of the specimen.

`verification/` stands for every harness file math-verifier owns, including
the route-arithmetic checks listed in TEAM.md.

```mermaid
flowchart LR
    LD["learning-designer"]:::writer
    AD["art-director"]:::writer
    SE["sim-engineer"]:::writer
    UI["ui-engineer"]:::writer
    MV["math-verifier"]:::writer
    QA["qa-walker"]:::writer
    SK["skeptic"]:::readonly
    DR["design-reviewer"]:::readonly

    SPEC["docs/SPEC.md"]:::file
    COPY["copy.json"]:::file
    TOK["tokens.css"]:::file
    DES["docs/DESIGN.md"]:::file
    SIM["sim.js"]:::file
    IDX["index.html"]:::file
    VIZ["viz.js"]:::file
    VER["verification/"]:::file
    QAW["tools/qa-walk.js"]:::file

    LD --> SPEC
    LD --> COPY
    AD --> TOK
    AD --> DES
    SE --> SIM
    UI --> IDX
    UI --> VIZ
    MV --> VER
    QA --> QAW

    classDef writer fill:#dbeafe,stroke:#1d4ed8,color:#0b2e6b
    classDef readonly fill:#f3f4f6,stroke:#6b7280,color:#111827,stroke-dasharray:4 3
    classDef file fill:#ffffff,stroke:#374151,color:#111827
```

## Sequence

Agents have no channel to each other. Every arrow is the orchestrator
routing. Numbered steps, round limits, ownership checks after every writer
(step 10), and re-triggers (step 11) are in [`CLAUDE.md`](../CLAUDE.md).
This drawing skips 10 and 11 so the happy path stays readable.

Blue writes. Dashed grey is read-only. Yellow is a gate: that agent may not
edit the files it checks. Red is a human. After a review round, the round
is not clean until **both** the claim check and qa-walker have passed.

design-reviewer findings split by where the fix lands: markup and wiring to
ui-engineer; token values, missing tokens, and anything in `DESIGN.md` to
art-director. That split is drawn. A qa-walker ledger mismatch also splits
by cause; that rule is in CLAUDE.md step 9 and is not drawn.

```mermaid
flowchart TD
    LD["1. learning-designer<br/>writes SPEC.md, copy.json"]:::writer
    LD --> HUMAN1["human approval<br/>pipeline stops here"]:::human
    HUMAN1 --> SK1["2. skeptic<br/>reads spec and copy"]:::readonly
    SK1 -->|"findings, max 1 round<br/>pre-build only"| LD

    subgraph STEP3["3. parallel, disjoint files"]
      direction LR
      SE["sim-engineer<br/>writes sim.js"]:::writer
      AD["art-director<br/>writes tokens.css, DESIGN.md"]:::writer
    end

    SK1 --> SE
    SK1 --> AD

    SE --> G1{"4. simulation check<br/>math-verifier"}:::gate
    AD --> G2{"5. contrast check<br/>math-verifier"}:::gate
    G1 -->|"FAIL, max 3"| SE
    G2 -->|"FAIL, max 3"| AD
    G1 -->|PASS| UI
    G2 -->|PASS| UI

    UI["6. ui-engineer<br/>writes index.html, viz.js"]:::writer
    UI --> G3{"7. qa-walker in browser"}:::gate
    G3 -->|"FAIL, max 3"| UI
    G3 -->|PASS| SK2
    G3 -->|PASS| DR

    subgraph STEP8["8. parallel review, read only"]
      direction LR
      SK2["skeptic<br/>judges the argument"]:::readonly
      DR["design-reviewer<br/>judges design fidelity"]:::readonly
    end

    SK2 -->|"9. copy"| LD
    DR -->|"9. markup, wiring"| UI
    DR -->|"9. tokens, DESIGN.md"| AD
    LD --> G4{"claim check<br/>math-verifier"}:::gate
    G4 -->|FAIL| LD
    G4 -->|PASS| DONE
    G3 -->|PASS| DONE
    DONE["round clean only when<br/>claim check AND qa-walker pass"]:::done

    G1 -.->|"rounds exhausted"| ESC["escalate to human"]:::human
    G2 -.->|"rounds exhausted"| ESC
    G3 -.->|"rounds exhausted"| ESC

    classDef writer fill:#dbeafe,stroke:#1d4ed8,color:#0b2e6b
    classDef readonly fill:#f3f4f6,stroke:#6b7280,color:#111827,stroke-dasharray:4 3
    classDef gate fill:#fef3c7,stroke:#b45309,color:#3b2400
    classDef human fill:#fee2e2,stroke:#b91c1c,color:#5a0f0f
    classDef done fill:#dcfce7,stroke:#15803d,color:#052e16
```
