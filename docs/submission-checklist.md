# Submission Checklist — LifePilot (Alexa+ Hackathon 2026)

Every requirement from the official rules, mapped to where it's satisfied and what's still to do.

## A. Project & track technology

| Requirement | Status | Where / Action |
| --- | --- | --- |
| Project built with the required developer tools | ✅ Done | Four-workspace monorepo: `client`, `server`, `mcp-server`, `shared` |
| **Alexa+ track:** working **Agent Skill *or* self-hosted MCP server** over **Streamable HTTP**, spec **2025-11-25** | ✅ Done | `mcp-server/src/app.ts` — `StreamableHTTPServerTransport`, spec 2025-11-25 (Origin validation, protocol-version check). **Called at runtime** by `server/src/services/mcpClient.ts` via `StreamableHTTPClientTransport` (not just named in the README) |
| (Alternative) simulated Alexa+ experience | — | Not used; we satisfy the MCP path directly |

> The runtime-technology hook is met: the MCP SDK is **imported and actually called** in the agent
> path at runtime.

## B. Text description

| Requirement | Status | Where / Action |
| --- | --- | --- |
| Text description explaining features & functionality | ✅ Done | `docs/devpost-description.md` (also mirrored in the Devpost form) |

## C. Code repository

| Requirement | Status | Where / Action |
| --- | --- | --- |
| URL to code repository (GitHub) for judging & testing | ⚠️ To do | Create + push to GitHub — see `docs/publishing-to-github.md` |
| Repo contains all source, assets, and instructions | ✅ Done | `README.md` + `docs/setup.md`; run `npm install && npm run seed && npm run dev` |
| **Public + open-source license file** (detectable at top) | ✅ License added | `LICENSE` (MIT). After pushing, confirm it shows in the repo's **About** section |
| **OR private + shared with testers** | ⚠️ Alternative | If private, add collaborators: `chris-trag`, `knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar` and share with `testing@devpost.com` |

## D. Demonstration video

| Requirement | Status | Where / Action |
| --- | --- | --- |
| Video < 3 minutes | ✅ Done | `demo/lifepilot-demo.mp4` (48 s) |
| Shows the project functioning | ✅ Done | 10 captioned slides: login, dashboard, tasks, planner, notes, assistant, delete-confirm, insights |
| Uploaded **publicly** to YouTube or Vimeo + link on the form | ⚠️ To do | Upload `demo/lifepilot-demo.mp4`, set visibility to **Public**, paste the link into Devpost |
| No third-party trademarks / copyrighted music | ✅ Done | Video is silent; uses only original UI and audio-free captions |

> Note: for the Alexa+ MCP path there is no physical "device"; the video shows the working
> end-to-end application (the artifact the track requires) running live.

## E. Product feedback

| Requirement | Status | Where / Action |
| --- | --- | --- |
| Feedback for each tool/API/SDK (what for / worked / needs work / onboarding / build again) | ✅ Done | `docs/product-feedback.md` |

## F. Tracks & mini challenges

| Item | Status | Where / Action |
| --- | --- | --- |
| **Primary Track:** Alexa+ | ✅ Selected | Confirmed on the submission form |
| Mini Challenge: **AWS Builder** | ✅ Done | **Amazon DynamoDB** stores destructive-action confirmations (native TTL + atomic delete), used at runtime by the orchestrator. Described in `docs/product-feedback.md` §9 |
| Mini Challenge: **Open Source** | ⚠️ Not yet met | Requires a **contribution URL** to an open-source project. Not yet done — see below |

**AWS Builder detail (for the form / judges).** We use **Amazon DynamoDB** to persist
destructive-action confirmations:

- Table `lifepilot_pending_actions` — partition key `id` (String), **provisioned 25 WCU / 25 RCU**,
  TTL attribute `expiresAt` (native TTL).
- The orchestrator's `PendingActionStore` (`server/src/agent/pendingActionStore.ts`) picks the
  DynamoDB backend automatically when `AWS_REGION` is set (`PENDING_ACTION_STORE=auto`); it consumes
  a confirmation with one atomic `DeleteCommand` (`ReturnValues=ALL_OLD`).
- Credentials come from the standard AWS chain (`AWS_REGION` + `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY` in `.env`, or `~/.aws`). Table region must match `AWS_REGION`.
- Create the table via `npm run dynamo:setup -w server` or the AWS Console (see `README.md`).
- Sits inside DynamoDB's **permanent always-free** allowance (25 GB + 25 WCU/25 RCU, every account;
  provisioned capacity only).

## G. Optional (bonus up to 10%)

| Item | Status | Where / Action |
| --- | --- | --- |
| Feature Requests | ✅ Done | `docs/friction-log.md` (FR-1…FR-6) |
| Friction Log Entries | ✅ Done | `docs/friction-log.md` (FL-1…FL-6) |
| Product Feedback bonus items | ✅ Done | `docs/product-feedback.md` |

---

## Open items before you submit

1. **Push to GitHub** — follow `docs/publishing-to-github.md`; decide public (with `LICENSE`) vs.
   private (add the six collaborators).
2. **Upload the video** to YouTube/Vimeo as **Public** and paste the link on Devpost.
3. **Decide mini challenges:**
   - **AWS Builder** — ✅ satisfied via Amazon DynamoDB (`docs/product-feedback.md` §9). Ensure
     you select it on the submission form.
   - **Open Source** — requires a real contribution URL to another OSS project (e.g. a merged PR or
     issue fix). If you want to pursue this, the MCP SDK friction points (FL-1/FL-2) are good
     candidates; otherwise skip it.
4. **Double-check license visibility** — after pushing, ensure GitHub detects `LICENSE` (MIT) and
   shows it in the About section.
