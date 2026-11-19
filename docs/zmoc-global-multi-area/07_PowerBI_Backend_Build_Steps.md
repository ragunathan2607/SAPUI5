# MOC Dashboard – Backend build, step by step (CDS + OData)

For: ZMOC developer, first time with CDS. System DVJ, client 120, package `ZMOC`, one workbench transport for everything.
Names checked against the DVJ extract of 12.11.2026 (`ZMOC_D_ISS_AREA`, `/IAM/D_I_ROOT-Z_MOC_SCOPE` = S/M/G, `ZMOC_ACT_CMT_LOG`, `/IAM/D_ACT_ROOT` Z-fields).

**Which service:** Power BI uses **your Z service** = SEGW project `ZEHS_MOC_MANCHGREQ` (backend service `ZEHS_MOC_MANCHGREQ_SRV`), published in Gateway under the name **`ZEHS_MOC_BIDASHBOARD_SRV`** → URL `/sap/opu/odata/sap/ZEHS_MOC_BIDASHBOARD_SRV/`. It is **not** the service of the Fiori app *Manage Change Requests* (that one is SAP's standard `EHS_MOC_MANCHGREQ_SRV`, see guide 09).

**Order (do not change it):**

| Step | What | Tool |
|---|---|---|
| 0 | Prepare Eclipse (ADT) | Eclipse |
| 1 | CDS view: one row per MOC and area | Eclipse |
| 2 | CDS extension 1 of 3: activity custom fields | Eclipse |
| 3 | CDS extension 2 of 3 | Eclipse |
| 4 | CDS extension 3 of 3 | Eclipse |
| 5 | Two ABAP methods: Startup Approval Date and MOC Owner for all MOCs | SE24 |
| 6 | Add the new CDS views to the OData project | SEGW |
| 7 | Clear the Gateway caches | SAP GUI |
| 8 | Test the service | `/IWFND/GW_CLIENT` |
| 9 | Release the transport | SE09 |

Why this order: the OData project (step 6) can only see CDS views that are already **active** (steps 1–4). Steps 2 → 3 → 4 must be in this order because each extension uses the field added by the one before.

---

## Step 0 – Prepare Eclipse (ADT)

CDS views are created in **Eclipse with ABAP Development Tools (ADT)**, not in SAP GUI.

1. Open Eclipse → menu **Window → Perspective → Open Perspective → ABAP**.
2. If DVJ is not there yet: **File → New → ABAP Project** → choose DVJ from the SAP Logon list → client **120**, your user → **Finish**.
3. In the **Project Explorer** (left), open your DVJ project → **Favorite Packages** → right-click → **Add Package** → `ZMOC` → OK.

Shortcuts you will use: **Ctrl+S** save · **Ctrl+F2** check · **Ctrl+F3** activate · **F8** data preview (shows the rows the view returns).

---

## Step 1 – CDS view `ZMOC_I_CHGMGMTREQAREA` (one row per MOC and area)

**What it does:** Single Area MOC → 1 row with its area. Multiple-Area MOC → 1 row per area from `ZMOC_D_ISS_AREA`. Global MOC → 1 row "Global". Power BI uses it for *MOCs by Area*.

1. Project Explorer → right-click package **ZMOC** → **New → Other ABAP Repository Object**.
2. Type `data definition` in the filter → select **Core Data Services → Data Definition** → **Next**.
3. Fill:
   * Name: `ZMOC_I_CHGMGMTREQAREA`
   * Description: `MOC: Change Request per Affected Area`
   * → **Next** → choose your **transport** → **Next**.
4. Template list: choose **Define View** → **Finish**.
5. An editor opens with template text. **Select all (Ctrl+A) and delete it**, then paste:

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

6. **Ctrl+S** (save) → **Ctrl+F3** (activate).
   * A yellow **warning** like *"use DEFINE VIEW ENTITY instead"* is fine – ignore it.
   * A red **error**: send me a screenshot.
7. Test: with the cursor in the editor press **F8** (Data Preview). You see rows with `ChgMgmtReqUUID`, `AreaID`, `AreaName`, `AreaScope`. A Multiple-Area MOC must appear **once per area**.

Line-by-line meaning (for your notes):
* `@AbapCatalog.sqlViewName` – name of the database view SAP generates (max. 16 characters).
* `define view … as select from /iam/d_i_root` – read the MOC header table.
* `key` – the fields that make a row unique.
* `cast( … as abap.char(…) )` – all three parts of a `union all` must have exactly the same field types, so we convert them.
* `union all` – stick the rows of the three `select`s together (Single + Multiple + Global).

---

## Step 2 – CDS extension `ZMOC_I_CHGMGMTACTIVITY` (activity custom fields)

**What it does:** adds your ZMOC fields of `/IAM/D_ACT_ROOT` to SAP's activity view `I_ChgMgmtActivity`. An *extension* changes nothing in SAP's view; it only appends fields – the same way your existing `ZMOC_I_CHGMGMTREQUEST` appends `z_area_name` etc. to the MOC view.

1. Right-click **ZMOC** → **New → Other ABAP Repository Object → Core Data Services → Data Definition** → **Next**.
2. Name: `ZMOC_I_CHGMGMTACTIVITY` · Description: `MOC: CDS: I_ChgMgmtActivity` · **Next** → transport → **Next**.
3. Template: **Extend View** → **Finish**.
4. Ctrl+A, delete, paste:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_A1'
@EndUserText.label: 'ZMOC_I_ChgMgmtActivity'
extend view I_ChgMgmtActivity with ZMOC_I_ChgMgmtActivity
{
    zpreact, zpropdat, zqus_key, zrisk_link, zrisk_id
}
```

5. **Ctrl+S → Ctrl+F3.**

| Field | Meaning |
|---|---|
| `zpreact` | Pre Gate Activity (YES/NO) |
| `zpropdat` | Proposed Date (temporary extension) |
| `zqus_key` | linked questionnaire action |
| `zrisk_link`, `zrisk_id` | linked Risk Assessment |

(`ZDUMMY_SAVE_TS` is technical and deliberately not included.)

---

## Step 3 – CDS extension `ZMOC_I_CHGMGMTACTYWORKLIST`

**What it does:** passes the fields up one level to `I_ChgMgmtActyWorklist`, plus three SAP fields we need for Pre/Post: activity **template**, **parent activity** and sort order.

1. Same as step 2, Name: `ZMOC_I_CHGMGMTACTYWORKLIST` · Description: `MOC: CDS: I_ChgMgmtActyWorklist` · template **Extend View**.
2. Paste:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_A2'
@EndUserText.label: 'ZMOC_I_ChgMgmtActyWorklist'
extend view I_ChgMgmtActyWorklist with ZMOC_I_ChgMgmtActyWorklist
{
    ChgMgmtActyTemplate, RootChgMgmtActyUUID, ChgMgmtActySortSequenceValue,
    zpreact, zpropdat, zqus_key, zrisk_link, zrisk_id
}
```

3. **Ctrl+S → Ctrl+F3.**
   * If you get *"… is unknown"* or *"… is not unique"*: write the data source name in front of each field, e.g. `I_ChgMgmtActivity.ChgMgmtActyTemplate, I_ChgMgmtActivity.zpreact, …` and activate again. If it still fails, send a screenshot.

---

## Step 4 – CDS extension `ZMOC_C_CHGMGMTACTYWORKLIST`

**What it does:** passes the fields up to the top view `C_ChgMgmtActyWorklist` – the view the OData service reads.

1. Same as step 2, Name: `ZMOC_C_CHGMGMTACTYWORKLIST` · Description: `MOC: CDS: C_ChgMgmtActyWorklist` · template **Extend View**.
2. Paste:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_A3'
@EndUserText.label: 'ZMOC_C_ChgMgmtActyWorklist'
extend view C_ChgMgmtActyWorklist with ZMOC_C_ChgMgmtActyWorklist
{
    ChgMgmtActyTemplate, RootChgMgmtActyUUID, ChgMgmtActySortSequenceValue,
    zpreact, zpropdat, zqus_key, zrisk_link, zrisk_id
}
```

3. **Ctrl+S → Ctrl+F3.**
4. Test: open SAP's view – press **Ctrl+Shift+A** (Open ABAP Development Object) → `C_CHGMGMTACTYWORKLIST` → OK → **F8**. Scroll right: the new columns `ChgMgmtActyTemplate`, `RootChgMgmtActyUUID`, `zpreact`, `zpropdat`, `zrisk_id` … must be there with values.

---

## Step 5 – ABAP: Startup Approval Date and MOC Owner for all MOCs (SE24)

Today both entity sets return only MOCs with status 05. After this step: all statuses, one database read instead of a loop.

1. **SE24** → `ZCL_ZEHS_MOC_MANCHGREQ_DPC_EXT` → **Change**.
2. Tab **Methods** → double-click **`CHGMGMTREQSTARTU_GET_ENTITYSET`**.
3. Select everything between `METHOD …` and `ENDMETHOD.` and replace with:

```abap
  METHOD chgmgmtreqstartu_get_entityset.
*   All MOCs (any status): approval time of the 'Area Manager Startup
*   Approval' activity (ZAM_SU_APP) = comment-log entry with status 07.
*   Latest one wins (re-approval after a rejection).
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

4. Back to the method list → double-click **`CHGMGMTREQMOCOWN_GET_ENTITYSET`** → replace the body with:

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

5. **Check (Ctrl+F2) → Activate (Ctrl+F3).**

Types are checked against your system: `ZMOC_ACT_CMT_LOG-ZACT_ID` and `/IAM/D_ACT_ROOT-ACTIVITY_ID` are both `/IAM/ACTIVITY_ID`; `ZCREATED_TIME` (DEC 15) fits the OData field `STARTUPAPPROVALDATE` (`TIMESTAMP`).

---

## Step 6 – Add the new views to the OData project (SEGW)

The project already references `C_ChgMgmtReqWorklist`, so *Reference → Data Source* stays greyed out. New views are added as **associations of the worklist** and ticked in the exposure screen.

**6a. Associations in the worklist extension (Eclipse)** – `ZMOC_C_CHGMGMTREQWORKLIST`:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_3'
@EndUserText.label: 'ZMOC_C_ChgMgmtReqWorklist'
extend view C_ChgMgmtReqWorklist with ZMOC_C_ChgMgmtReqWorklist
  association [0..*] to ZMOC_I_ChgMgmtReqArea as _ZZArea
    on $projection.ChgMgmtReqUUID = _ZZArea.ChgMgmtReqUUID
  association [0..*] to C_ChgMgmtActyWorklist as _ZZActivity
    on $projection.ChgMgmtReqUUID = _ZZActivity.ChgMgmtReqUUID
{
    z_area_name,z_unit_name,z_moc_asta_des,z_moc_types,z_moc_act_sta,
    z_moc_scope,
    cast( case z_moc_scope
            when 'M' then 'Multiple'
            when 'G' then 'Global'
            else          'Single'
          end as abap.char( 10 ) ) as z_moc_scope_txt,
    _ZZArea,
    _ZZActivity
}
```

Ctrl+S → Ctrl+F3. Check: `C_CHGMGMTREQWORKLIST` → F8 → right-click a row → *Follow Association* lists `_ZZArea` and `_ZZActivity`.

**6b. Tick them (SEGW)**

1. `/IWFND/CACHE_CLEANUP` and `/IWBEP/CACHE_CLEANUP` (so SEGW reads the new view).
2. **SEGW** → `ZEHS_MOC_MANCHGREQ` → **Ctrl+F1** (status bar *Edit mode*).
3. *Data Model → Data Source References → Exposures via SADL* → right-click **CDS-Entity Exposures** → **Display** (in edit mode this screen is editable).
4. Column **Selected**: tick **`_ZZArea`** + `ZMOC_I_ChgMgmtReqArea` and **`_ZZActivity`** + `C_ChgMgmtActyWorklist`. Expand `C_ChgMgmtActyWorklist` and tick its text associations for status and type (e.g. `_ChgMgmtActyStatusText`, `_ChgMgmtActyTypeText`).
   (Button *Add CDS-Entity* on the same screen can add a view that is not an association.)
5. **Save** → **Generate Runtime Objects** → keep the class names → transport.

---

## Step 7 – Clear the Gateway caches

Run both, each with the default selection (F8):

1. **`/IWFND/CACHE_CLEANUP`** – tick *Cleanup Cache for all Models* → F8.
2. **`/IWBEP/CACHE_CLEANUP`** → F8.

Do this again after **every** later CDS or SEGW change, otherwise the service shows the old field list.

---

## Step 8 – Test the service (`/IWFND/GW_CLIENT`)

Method **GET**, one URL after the other → **Execute**. HTTP status must be **200**.

| # | Request URI | Expect |
|---|---|---|
| 1 | `/sap/opu/odata/sap/ZEHS_MOC_BIDASHBOARD_SRV/$metadata` | entity sets `ZMOC_I_ChgMgmtReqArea` and `C_ChgMgmtActyWorklist`; the activity type lists `ChgMgmtActyTemplate`, `RootChgMgmtActyUUID`, `zpreact`, `zpropdat`, `zrisk_id` … |
| 2 | `/sap/opu/odata/sap/ZEHS_MOC_BIDASHBOARD_SRV/ZMOC_I_ChgMgmtReqArea?$top=20` | rows per MOC and area; Multiple-Area MOCs several times |
| 3 | `/sap/opu/odata/sap/ZEHS_MOC_BIDASHBOARD_SRV/C_ChgMgmtActyWorklist?$top=20` | activities with the new fields |
| 4 | `/sap/opu/odata/sap/ZEHS_MOC_BIDASHBOARD_SRV/ChgMgmtReqstartupapprdateTypeSet` | MOCs of **all** statuses with a date |
| 5 | `/sap/opu/odata/sap/ZEHS_MOC_BIDASHBOARD_SRV/ChgMgmtReqMocOwnerTypeSet` | owner names for all MOCs |
| 6 | `/sap/opu/odata/sap/ZEHS_MOC_BIDASHBOARD_SRV/C_ChgMgmtReqWorklist?$top=5&$format=json` | unchanged, still works |

Use the entity set names exactly as `$metadata` shows them (if you renamed in step 6.7, use the new name).

If a call returns **403** or no rows although data exists: the user has no MOC display authorization – the same applies later to the Power BI technical user.

---

## Step 9 – Transport

**SE09** → your request must contain:

| Object | Type |
|---|---|
| `ZMOC_I_CHGMGMTREQAREA` | DDLS (CDS view) |
| `ZMOC_I_CHGMGMTACTIVITY`, `ZMOC_I_CHGMGMTACTYWORKLIST`, `ZMOC_C_CHGMGMTACTYWORKLIST` | DDLS (CDS extensions) |
| `ZCL_ZEHS_MOC_MANCHGREQ_DPC_EXT` | class |
| `ZEHS_MOC_MANCHGREQ` + regenerated `ZCL_ZEHS_MOC_MANCHGREQ_MPC` / `_DPC` | SEGW project + classes |

All workbench (cross-client) – no SCC1N. In the target system run the two cache clean-ups (step 7) once after import.

---

## After the build – hand-over to Power BI

The Power BI team gets: entity sets, relationships (all on `ChgMgmtReqUUID`) and DAX measures from document **06**, section 7. Still to give them: the template name of the **temporary extension** activity (placeholder in the *Temporary MOCs Extension* measure).
