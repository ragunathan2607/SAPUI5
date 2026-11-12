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

## 6. Decisions (client, 12.11.2026)

| # | Decision |
|---|---|
| 1 | *Overdue within 15 days* = open MOCs whose Closure Date is **in the next 15 days** |
| 2 | *Emergency MOCs not registered as Permanent* = MOC Type **Emergency (ZC3)** and MOC Category (`DURATION_CD` = `ChgMgmtReqDurationCode`) **not Permanent** – field already in the service, Power BI measure only |
| 3 | Status buckets from the standard status `ChgMgmtReqStatus` (domain values below) |
| 4 | *Startup Approval Date* = approval date of the **Area Manager Startup Approval** activity (`ZAM_SU_APP`) – for **all** MOC statuses |
| 5 | *MOCs by Area* counts **each affected area**, including the Multiple-Area table `ZMOC_D_ISS_AREA` |
| 6 | Bring **all activity headers** (incl. Pre/Post Startup groups and action items with statuses) with all ZMOC custom fields |

---

## 7. Solution and build steps

### 7.1 Status domain values (`CHGMGMTREQSTATUS`)

| Code | Text | Dashboard bucket | Open? |
|---|---|---|---|
| 01 | In Preparation | (draft) | yes – exclude if drafts must not count |
| 02 | Submitted | Submitted | yes |
| 03 | Approved | In Process | yes |
| 04 | Incomplete | In Process | yes |
| 05 | In Process | In Process | yes |
| 11 | Awaiting Approval | Awaiting Approval | yes |
| D2 | On Hold | In Process | yes |
| 08 | Closed | Closed | no |
| 06 | Not Applicable | – | no |
| D3 | Rejected | – | no |

Activity status (`CHGMGMTACTYSTATUS`): 01 Created, 02 Notified, 03 In Process, 04 Declined, 05 Blocked, 06 Rejected, 07 Approved, 08 Not Relevant, 09 Completed, D2 On Hold, D4 Change Request Rejected, D5 Not Applicable, D6 Change Request On Hold.

### 7.2 Power BI measures (final)

```DAX
IsOpen =
IF ( NOT ( Worklist[ChgMgmtReqStatus] IN { "08", "06", "D3" } ), 1, 0 )

ClosureDate = DATEVALUE ( Worklist[ChgMgmtReqReversalDate] )

Open MOCs = CALCULATE ( COUNTROWS ( Worklist ), Worklist[IsOpen] = 1 )

Overdue MOCs =
CALCULATE ( COUNTROWS ( Worklist ), Worklist[IsOpen] = 1,
            NOT ISBLANK ( Worklist[ClosureDate] ), Worklist[ClosureDate] < TODAY () )

Overdue within 15 days =
CALCULATE ( COUNTROWS ( Worklist ), Worklist[IsOpen] = 1,
            Worklist[ClosureDate] >= TODAY (), Worklist[ClosureDate] <= TODAY () + 15 )

Temporary MOCs =
CALCULATE ( COUNTROWS ( Worklist ), Worklist[T_ChgMgmtReqDurationCode] = "Temporary" )

Emergency MOCs =
CALCULATE ( COUNTROWS ( Worklist ), Worklist[ChgMgmtReqType] = "ZC3" )

Emergency MOCs not registered as Permanent =
CALCULATE ( COUNTROWS ( Worklist ), Worklist[ChgMgmtReqType] = "ZC3",
            Worklist[T_ChgMgmtReqDurationCode] <> "Permanent" )

Temporary MOCs Extension =      -- temporary MOCs with an extension activity
CALCULATE ( DISTINCTCOUNT ( Activity[ChgMgmtReqUUID] ),
            Activity[ChgMgmtActyTemplate] = "<EXTENSION TEMPLATE>",
            NOT ISBLANK ( Activity[zpropdat] ),
            Worklist[T_ChgMgmtReqDurationCode] = "Temporary" )
```

The Category texts "Permanent" / "Temporary" are used so the measures do not depend on the code values; check the exact texts in `C_ChgMgmtReqDurationVH`.

### 7.3 Startup Approval Date for all MOCs – `ZCL_ZEHS_MOC_MANCHGREQ_DPC_EXT`

Redefined method `CHGMGMTREQSTARTU_GET_ENTITYSET`: replace the body (no status filter, one select instead of a loop; latest approval if it was approved again after a rejection):

```abap
  METHOD chgmgmtreqstartu_get_entityset.
*   All MOCs (any status): approval time of the 'Area Manager Startup
*   Approval' activity (ZAM_SU_APP) = log entry with status 07
    SELECT a~par_issue_uuid        AS chgmgmtrequuid,
           MAX( l~zcreated_time )  AS startupapprovaldate
      FROM /iam/d_act_root AS a
      INNER JOIN zmoc_act_cmt_log AS l
        ON l~zact_id = a~activity_id
      WHERE a~act_template = 'ZAM_SU_APP'
        AND l~zstatus      = '07'
      GROUP BY a~par_issue_uuid
      INTO CORRESPONDING FIELDS OF TABLE @et_entityset.

    es_response_context-inlinecount = lines( et_entityset ).
  ENDMETHOD.
```

If the syntax check reports that `ZACT_ID` and `ACTIVITY_ID` have different types, keep the join but read `activity_id` into a range first (send me the message).

Same change for the owner (method `CHGMGMTREQMOCOWN_GET_ENTITYSET`, all statuses):

```abap
  METHOD chgmgmtreqmocown_get_entityset.
*   All MOCs (any status): name of the MOC Owner (party role ZMOC_OWN)
    SELECT p~chgmgmtrequuid,
           v~personfullname AS mocowner
      FROM i_chgmgmtreqpersoninvolved AS p
      LEFT OUTER JOIN c_chgmgmtpersoninvolvedvh AS v
        ON v~businesspartner = p~businesspartner
      WHERE p~chgmgmtpersninvolvedrole = 'ZMOC_OWN'
      INTO CORRESPONDING FIELDS OF TABLE @et_entityset.

    es_response_context-inlinecount = lines( et_entityset ).
  ENDMETHOD.
```

### 7.4 One row per MOC and area – CDS `ZMOC_I_ChgMgmtReqArea`

Eclipse (ADT) → package `ZMOC` → New → Data Definition `ZMOC_I_CHGMGMTREQAREA`:

```cds
@AbapCatalog.sqlViewName: 'ZMOCIREQAREA'
@AbapCatalog.compiler.compareFilter: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'MOC: Change Request per Affected Area'
define view ZMOC_I_ChgMgmtReqArea
  as select from /iam/d_i_root
{
  key db_key                                   as ChgMgmtReqUUID,
  key cast( z_area_id   as abap.char( 20 ) )   as AreaID,
      cast( z_area_name as abap.char( 255 ) )  as AreaName,
      cast( 'S'         as abap.char( 1 ) )    as AreaScope
}
where application =  'MOC'
  and z_moc_scope <> 'M'
  and z_moc_scope <> 'G'

union all

  select from zmoc_d_iss_area as a
    inner join /iam/d_i_root  as r on r.db_key = a.parent_key
{
  key r.db_key                                 as ChgMgmtReqUUID,
  key cast( a.area_id   as abap.char( 20 ) )   as AreaID,
      cast( a.area_name as abap.char( 255 ) )  as AreaName,
      cast( 'M'         as abap.char( 1 ) )    as AreaScope
}
where r.z_moc_scope = 'M'

union all

  select from /iam/d_i_root
{
  key db_key                                   as ChgMgmtReqUUID,
  key cast( 'GLOBAL'    as abap.char( 20 ) )   as AreaID,
      cast( 'Global'    as abap.char( 255 ) )  as AreaName,
      cast( 'G'         as abap.char( 1 ) )    as AreaScope
}
where application = 'MOC'
  and z_moc_scope = 'G'
```

* Single Area MOC: one row (area of the MOC). Multiple-Area MOC: one row per selected area. Global MOC: one row *Global*.
* `ZMOC_D_ISS_AREA` / `Z_MOC_SCOPE` are the names from the Multiple-Area build (guide 02). Adjust if the table was named differently.
* *MOCs by Area* in Power BI: `DISTINCTCOUNT( Area[ChgMgmtReqUUID] )` by `Area[AreaName]`. The Worklist column `z_area_name` keeps the combined text for the table.

### 7.5 Activities with all custom fields – CDS extensions

`C_ChgMgmtActyWorklist` (standard *Manage Change Activities*) has activity, type, category, status, responsible, due date, MOC number and MOC status – but **not** the template, the parent activity and the ZMOC fields of `/IAM/D_ACT_ROOT` (`ZPREACT`, `ZPROPDAT`, `ZQUS_KEY`, `ZRISK_LINK`, `ZRISK_ID`). Three extensions, same pattern as the existing `ZMOC_*_ChgMgmtRequest/ReqWorklist` extensions:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_A1'
@EndUserText.label: 'ZMOC_I_ChgMgmtActivity'
extend view I_ChgMgmtActivity with ZMOC_I_ChgMgmtActivity
{
    zpreact, zpropdat, zqus_key, zrisk_link, zrisk_id
}
```

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_A2'
@EndUserText.label: 'ZMOC_I_ChgMgmtActyWorklist'
extend view I_ChgMgmtActyWorklist with ZMOC_I_ChgMgmtActyWorklist
{
    ChgMgmtActyTemplate, RootChgMgmtActyUUID, ChgMgmtActySortSequenceValue,
    zpreact, zpropdat, zqus_key, zrisk_link, zrisk_id
}
```

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_A3'
@EndUserText.label: 'ZMOC_C_ChgMgmtActyWorklist'
extend view C_ChgMgmtActyWorklist with ZMOC_C_ChgMgmtActyWorklist
{
    ChgMgmtActyTemplate, RootChgMgmtActyUUID, ChgMgmtActySortSequenceValue,
    zpreact, zpropdat, zqus_key, zrisk_link, zrisk_id
}
```

Activate in this order (A1, A2, A3). If the activation of A2 reports an element as unknown or ambiguous, prefix it with the data source name (`I_ChgMgmtActivity.ChgMgmtActyTemplate`, …).

Pre/Post in Power BI (table `Activity`):

| Need | Rule |
|---|---|
| Pre - Startup Action Items (group) | `ChgMgmtActyType` = Z30 |
| Post - Startup Action Items (group) | `ChgMgmtActyType` = Z31 |
| Pre-startup action items | `ChgMgmtActyType` = Z09 (parent = `RootChgMgmtActyUUID` → group) |
| Post-startup action items | `ChgMgmtActyType` = Z11 |
| Status | `ChgMgmtActyStatus` + text (7.1) |
| MOC link | `ChgMgmtReqUUID` → Worklist |

### 7.6 Expose in the OData service (SEGW)

1. **SEGW** → project `ZEHS_MOC_MANCHGREQ` → *Data Model* → *Data Source References* → *Exposures via SADL* → *CDS-Entity Exposures* → right-click → **Change**.
2. Add **`ZMOC_I_CHGMGMTREQAREA`** and **`C_CHGMGMTACTYWORKLIST`** (plus `C_CHGMGMTACTYSTATUSVH` and `C_CHGMGMTACTYTYPEVH` for the texts).
3. **Generate Runtime Objects** (keep the existing class names).
4. `/IWFND/CACHE_CLEANUP` and `/IWBEP/CACHE_CLEANUP` (also after every CDS change).
5. Test in `/IWFND/GW_CLIENT`:
   * `/sap/opu/odata/sap/ZEHS_MOC_MANCHGREQ_SRV/$metadata` – new sets `ZMOC_I_ChgMgmtReqArea`, `C_ChgMgmtActyWorklist`; worklist shows `z_*` fields, activity set shows `ChgMgmtActyTemplate`, `RootChgMgmtActyUUID`, `zpreact`, `zpropdat`, `zrisk_id`, …
   * `…/ChgMgmtReqstartupapprdateTypeSet` – returns MOCs of all statuses.

One service then feeds the whole dashboard. (Alternatively the activities can stay in `ZEHS_MOC_MANACTY_SRV`, if that service already exposes `C_ChgMgmtActyWorklist` – the CDS extensions appear there automatically after the cache clean-up.)

### 7.7 Power BI model

| Table (entity set) | Relationship |
|---|---|
| `Worklist` = `C_ChgMgmtReqWorklist` | – (fact) |
| `Area` = `ZMOC_I_ChgMgmtReqArea` | `Area[ChgMgmtReqUUID]` *→ `Worklist[ChgMgmtReqUUID]` |
| `Activity` = `C_ChgMgmtActyWorklist` | `Activity[ChgMgmtReqUUID]` *→ `Worklist[ChgMgmtReqUUID]` |
| `StartupDate` = `ChgMgmtReqstartupapprdateTypeSet` | 1:1 on `ChgMgmtReqUUID` |
| `Owner` = `ChgMgmtReqMocOwnerTypeSet` | 1:1 on `ChgMgmtReqUUID` |

Authorization: the Power BI technical user needs MOC display authorization for all MOCs and activities (DCL on both worklist views).

### 7.8 Objects and transport

| Object | Type | New / changed |
|---|---|---|
| `ZMOC_I_CHGMGMTREQAREA` | CDS view | new |
| `ZMOC_I_CHGMGMTACTIVITY`, `ZMOC_I_CHGMGMTACTYWORKLIST`, `ZMOC_C_CHGMGMTACTYWORKLIST` | CDS extensions | new |
| `ZCL_ZEHS_MOC_MANCHGREQ_DPC_EXT` | class (2 methods) | changed |
| `ZEHS_MOC_MANCHGREQ` (+ MPC/DPC regenerated) | SEGW project | changed |

All are workbench objects – no SCC1N needed.
