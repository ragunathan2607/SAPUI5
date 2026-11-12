# MOC Dashboard (Power BI) – Fit-gap of OData `ZEHS_MOC_MANCHGREQ_SRV`

Source: ZMOC extract (system DVJ, 29.10.2026) – SEGW project `ZEHS_MOC_MANCHGREQ`, classes `ZCL_ZEHS_MOC_MANCHGREQ_MPC(_EXT)` / `ZCL_ZEHS_MOC_MANCHGREQ_DPC(_EXT)`, CDS `C_ChgMgmtReqWorklist` with the ZMOC extensions `ZMOC_C_ChgMgmtReqWorklist` / `ZMOC_I_ChgMgmtReqWorklist` / `ZMOC_I_ChgMgmtRequest`.

**Result in short:** the main entity set covers most of the dashboard. **Two KPIs need new data** (*Temporary MOCs Extension*, *Emergency MOCs not registered as Permanent*). Two table columns (*MOC Owner*, *Startup Approval Date*) are available only through helper entity sets that today return **in-process MOCs only**. The new KPI *Overdue within 15 days* needs **no backend change** – it is a Power BI measure on the Closure Date.

---

## 1. What the service offers

| Entity set | Content | Key fields | Notes |
|---|---|---|---|
| **`C_ChgMgmtReqWorklist`** (main) | one row per MOC; standard SAP worklist view + ZMOC extension fields | see section 2 | SADL / CDS based, server-side filter, `$select`, `$top/$skip`; DCL authorization check (`@AccessControl.authorizationCheck: #CHECK`) |
| `ChgMgmtReqMocOwnerTypeSet` | MOC Owner name (`MOCOWNER`) | `ChgMgmtReqUUID` | custom DPC: **only MOCs with status 05**; owner = party role `ZMOC_OWN` |
| `ChgMgmtReqstartupapprdateTypeSet` | Startup approval date (`Startupapprovaldate`) | `ChgMgmtReqUUID` | custom DPC: **only status 05**; date = time the *Area Manager Startup Approval* (`ZAM_SU_APP`) reached status 07, from `ZMOC_ACT_CMT_LOG` |
| `ChgMgmtReqApprovedSuTypeSet` | list of MOCs whose startup is approved | `ChgMgmtReqUUID` | only status 05; `ZAM_SU_APP` = 07 |
| `ChgMgmtReqUnderImplTypeSet` | MOCs "under implementation" | `ChgMgmtReqUUID` | only status 05; PSSR/Gate rule (`ZPG_APP` / `ZG1_APP` = 07, `ZAM_SU_APP` ≠ 07) |
| `ChgMgmtReqWaitingApprTypeSet` | MOCs "waiting for approval" | `ChgMgmtReqUUID` | only status 05; `ZPG_APP` ≠ 07 (rule with `ZPREACT`) |
| `I_ChgMgmtReqPersonInvolved` | all people involved with role | `ChgMgmtReqUUID`, role, BP | all statuses – better source for MOC Owner (role `ZMOC_OWN`) |
| Value-help sets (`C_ChgMgmtReqStatusVH`, `I_ChgMgmtReqTypeVH`, `C_ChgMgmtReqDurationVH`, `C_ChgMgmtReqImpactVH`, `C_ChgMgmtPersonInvolvedVH`, …) | code → text | code | use as dimension tables in Power BI |

The helper sets have **no navigation** to the worklist. In Power BI create relationships on **`ChgMgmtReqUUID`** (1 worklist : 0..1 helper row).

## 2. Fields of `C_ChgMgmtReqWorklist` used by the dashboard

| Dashboard field | OData property | Meaning in your MOC screens |
|---|---|---|
| MOC Number | `ChgMgmtRequest` | MOC ID (e.g. MOC-26-A1-U112-045) |
| MOC Title | `ChgMgmtReqDescriptionText` | Title |
| MOC Type | `ChgMgmtReqType` + text `T_ChgMgmtReqType` | ZC1 MOC / ZC2 Alternate / ZC3 Emergency |
| Emergency flag | `ChgMgmtReqIsEmergency` | Yes/No |
| MOC Category | `ChgMgmtReqDurationCode` + text `T_ChgMgmtReqDurationCode` | field `DURATION_CD`, relabelled *MOC Category* (Permanent / Temporary) |
| Area | `z_area_name` | ZMOC extension (Global / Multiple: combined text, see 5.4) |
| Unit | `z_unit_name` | ZMOC extension |
| MOC Status | `ChgMgmtReqStatus` + text `T_ChgMgmtReqStatus` (+ `ChgMgmtReqStatusCriticality`) | standard status |
| MOC workflow status | `z_moc_asta_des` | e.g. "Area Manager Review – In Process" |
| MOC Sub Type | `z_moc_types` | Alternate MOC sub type |
| **Closure Date** | **`ChgMgmtReqReversalDate`** | date `DATE_LOCAL_RV`, relabelled *Closure Date* |
| Estimated S/U Date | `ChgMgmtReqApprovalDate` | date `DATE_LOCAL_AP`, relabelled *Estimated S/U Date* (planned) |
| Created / Reported on | `ChgMgmtReqCreationDate`, `ChgMgmtReqReportedDate` | "Recent MOCs" sorting |
| Entered / Reported by | `ChgMgmtReqEnteredByBPName`, `ChgMgmtReqReportedByBPName` | |
| Impact | `ChgMgmtReqImpact` + text | |
| Plant / Country | `ChgMgmtReqMainPlant`, `Country` | |

## 3. Fit-gap per dashboard element

| Dashboard element | Status | How |
|---|---|---|
| **Open MOCs** | ✅ | count where `ChgMgmtReqStatus` not in the closed/rejected/cancelled codes (confirm the code list in `C_ChgMgmtReqStatusVH`) |
| **Overdue MOCs** | ✅ | Open **and** `ChgMgmtReqReversalDate` < today (DAX, section 4) |
| **Overdue within 15 days** (new) | ✅ no backend change | Open **and** today ≤ `ChgMgmtReqReversalDate` ≤ today + 15 (DAX, section 4) |
| **Temporary MOCs** | ✅ | `ChgMgmtReqDurationCode` = temporary code (confirm value in `C_ChgMgmtReqDurationVH`) |
| **Temporary MOCs Extension** | ❌ **gap** | the extension is an activity with a *Proposed Date* (`ZPROPDAT`) that moves the closure date (`ZMOC_CL_ACT_NOTIFICATION=>UPDATE_CLOSURE_DATE`). Nothing in the service shows that an extension happened → new field needed (5.1) |
| **Emergency MOCs** | ✅ | `ChgMgmtReqType` = ZC3 (or `ChgMgmtReqIsEmergency` = X) |
| **Emergency MOCs not registered as Permanent** | ❌ **gap** | the service has no link "emergency MOC → follow-up permanent MOC" and no flag for it → business rule + new field needed (5.2) |
| **MOCs by Status** | ✅ (mapping to agree) | `T_ChgMgmtReqStatus`. The buckets *In Process / Awaiting Approval / Closed / Submitted* must be mapped to status codes – or use `z_moc_asta_des` / `ChgMgmtReqWaitingApprTypeSet` for "Awaiting Approval" (decision 6.3) |
| **MOCs by Type** | ✅ | `T_ChgMgmtReqType` |
| **MOCs by Area** | ✅ (with limitation 5.4) | `z_area_name` |
| Recent MOCs – MOC Number, Type, Title, Category, Area, Unit, Status, Closure Date, Workflow status | ✅ | worklist fields (section 2) |
| Recent MOCs – **MOC Owner** | ⚠ | `ChgMgmtReqMocOwnerTypeSet` returns status 05 only → use `I_ChgMgmtReqPersonInvolved` (role `ZMOC_OWN`) + `C_ChgMgmtPersonInvolvedVH` for the name, or remove the status filter (5.3) |
| Recent MOCs – **Startup Approval Date** | ⚠ | actual date only in `ChgMgmtReqstartupapprdateTypeSet` (status 05 only). Planned date = `ChgMgmtReqApprovalDate` (Estimated S/U Date). Decide which one the dashboard shows (6.4) |
| Filters (Area, Unit, Type, Category, Status, dates) | ✅ | worklist fields |

## 4. Power BI measures (DAX)

Table name assumed: `Worklist` (= `C_ChgMgmtReqWorklist`). Replace the status codes in `IsOpen` with your closed / rejected / cancelled codes from `C_ChgMgmtReqStatusVH`.

```DAX
-- Calculated column on Worklist
IsOpen =
IF ( NOT ( Worklist[ChgMgmtReqStatus] IN { "<CLOSED>", "<REJECTED>", "<CANCELLED>" } ), 1, 0 )

ClosureDate = DATEVALUE ( Worklist[ChgMgmtReqReversalDate] )   -- date part only

-- Measures
Open MOCs =
CALCULATE ( COUNTROWS ( Worklist ), Worklist[IsOpen] = 1 )

Overdue MOCs =
CALCULATE ( COUNTROWS ( Worklist ),
            Worklist[IsOpen] = 1,
            NOT ISBLANK ( Worklist[ClosureDate] ),
            Worklist[ClosureDate] < TODAY () )

Overdue within 15 days =
CALCULATE ( COUNTROWS ( Worklist ),
            Worklist[IsOpen] = 1,
            Worklist[ClosureDate] >= TODAY (),
            Worklist[ClosureDate] <= TODAY () + 15 )

Temporary MOCs =
CALCULATE ( COUNTROWS ( Worklist ), Worklist[ChgMgmtReqDurationCode] = "<TEMPORARY CODE>" )

Emergency MOCs =
CALCULATE ( COUNTROWS ( Worklist ), Worklist[ChgMgmtReqType] = "ZC3" )
```

*Overdue within 15 days* above means **"open, closure date falls in the next 15 days"** (about to become overdue). If the client means **"overdue for up to 15 days"**, use `Worklist[ClosureDate] < TODAY()` and `Worklist[ClosureDate] >= TODAY() - 15` instead (decision 6.1).

Date handling: the OData V2 date fields arrive as `Edm.DateTime` (midnight UTC). Convert to **Date** type in Power Query (not Date/Time with time-zone conversion), otherwise a closure date can shift by one day for Saudi time (UTC+3).

## 5. Gaps and proposed backend changes

### 5.1 Temporary MOCs Extension
* **Data:** the extension activity (template to be confirmed, the one with *Proposed Date* `ZPROPDAT` handled in `UPDATE_CLOSURE_DATE`).
* **Proposal:** new custom entity set `ChgMgmtReqTempExtType` (same pattern as the existing helper sets): `ChgMgmtReqUUID`, `ExtensionCount`, `LastProposedDate`, `OriginalClosureDate` – from `/IAM/D_ACT_ROOT` (`PAR_ISSUE_UUID`, template, `ZPROPDAT`, status), **all MOC statuses**.
* **KPI:** count of temporary MOCs with `ExtensionCount` ≥ 1.

### 5.2 Emergency MOCs not registered as Permanent MOCs
* **Business rule needed first** – which of these is meant?
  1. Emergency MOC (ZC3) whose **MOC Category is still Temporary**, or
  2. Emergency MOC for which **no follow-up permanent MOC** was created (linked as related / child change request), or
  3. Emergency MOC older than *n* days without a permanent MOC.
* **Proposal:** once agreed, one boolean field `EmergencyNotPermanent` on a custom entity set (or CDS extension field) per MOC.

### 5.3 MOC Owner / Startup Approval Date – status filter
All five custom helper sets select `WHERE chgmgmtreqstatus = '05'` and read row by row (`SELECT SINGLE` in a loop).
* For the dashboard (all statuses, history) remove the status filter, or add an optional status filter from `$filter`.
* Performance: replace the loops by one join / `FOR ALL ENTRIES` select – the dashboard refresh reads all MOCs.
* Alternative for the owner without code change: `I_ChgMgmtReqPersonInvolved` filtered on role `ZMOC_OWN`.

### 5.4 Area for Global / Multiple-Area MOCs
`z_area_name` holds one text per MOC: *Global*, or for Multiple-Area MOCs the combined area names. In *MOCs by Area* a Multiple-Area MOC appears once under the combined text, not once per area. If each area must be counted, the area node `ZZ_AREA` must be exposed (new entity set `ChgMgmtReqAreaType`: `ChgMgmtReqUUID`, `AreaId`, `AreaName`).

### 5.5 Authorization and volume
* `C_ChgMgmtReqWorklist` is protected by DCL. The **Power BI technical user** needs MOC display authorization for **all** MOCs, otherwise the KPIs are incomplete.
* Use `$select` with only the dashboard fields; Gateway paging (`$top/$skip`) is supported by SADL.

## 6. Open decisions (client)

1. *Overdue within 15 days*: **due in the next 15 days** (recommended reading) or **overdue for up to 15 days**?
2. Rule for *Emergency MOCs not registered as Permanent* (5.2).
3. Mapping of the status buckets (*In Process, Awaiting Approval, Closed, Submitted*) to `ChgMgmtReqStatus` codes / workflow status.
4. *Startup Approval Date* column: actual approval date (helper set) or planned *Estimated S/U Date*?
5. *MOCs by Area*: count Multiple-Area MOCs per area (needs 5.4) or once?
6. Which activity template is the *Temporary Extension* (5.1)?
