# Area Scope (Single / Multiple / Global) – CDS changes, step by step

For: ZMOC developer, first time with CDS. System DVJ, client 120, package `ZMOC`, one workbench transport.

## Why these changes are needed

The Area Scope project added the field **`Z_MOC_SCOPE`** (S = Single, M = Multiple, G = Global) to the MOC header and the Multiple-Area table **`ZMOC_D_ISS_AREA`**. The CDS views were never adjusted. These CDS views feed **two** services:

| Service | Used by | Gets the new fields how |
|---|---|---|
| SAP standard **`EHS_MOC_MANCHGREQ_SRV`** | Fiori app *Manage Change Requests* | automatically after the cache clean-up (SADL reads the CDS view) |
| Your Z service **`ZEHS_MOC_BIDASHBOARD_SRV`** (SEGW project `ZEHS_MOC_MANCHGREQ`) | Power BI | cache clean-up; regenerate the SEGW project if the fields do not appear |

Checked in the DVJ extract of 12.11.2026:

| Object | Today | Missing |
|---|---|---|
| `ZMOC_I_CHGMGMTREQUEST` (extension of SAP view `I_ChgMgmtRequest`) | `z_area_name, z_unit_name, z_moc_asta_des, z_moc_types, z_moc_act_sta` | `z_moc_scope` |
| `ZMOC_I_CHGMGMTREQWORKLIST` (extension of `I_ChgMgmtReqWorklist`) | same 5 fields | `z_moc_scope` |
| `ZMOC_C_CHGMGMTREQWORKLIST` (extension of `C_ChgMgmtReqWorklist`) | same 5 fields | `z_moc_scope` + readable text |
| `ZMOC_C_CHGMGMTREQWORKLIST_MDE` (list columns / filters) | column *Area* | column + filter *Area Scope*, column *Area* renamed *Area(s)* |
| `Z_AREA_NAME` length | already CHAR 255 | – (done) |

**How the three extensions hang together** (this is why the order matters):

```
/IAM/D_I_ROOT (table, has Z_MOC_SCOPE)
   └─ I_ChgMgmtRequest       + extension ZMOC_I_CHGMGMTREQUEST       (step 1)
        └─ I_ChgMgmtReqWorklist + extension ZMOC_I_CHGMGMTREQWORKLIST (step 2)
             └─ C_ChgMgmtReqWorklist + extension ZMOC_C_CHGMGMTREQWORKLIST (step 3)
                  └─ annotations ZMOC_C_CHGMGMTREQWORKLIST_MDE            (step 4)
                       └─ OData EHS_MOC_MANCHGREQ_SRV (Fiori app) and
                          ZEHS_MOC_BIDASHBOARD_SRV (Power BI)            (steps 5–6)
```

Each level can only pass on a field that the level below already has. So: step 1 → 2 → 3 → 4, never in another order.

**Order:**

| Step | What | Tool |
|---|---|---|
| 0 | Eclipse ready | Eclipse |
| 1 | Add `z_moc_scope` to `ZMOC_I_CHGMGMTREQUEST` | Eclipse |
| 2 | Add `z_moc_scope` to `ZMOC_I_CHGMGMTREQWORKLIST` | Eclipse |
| 3 | Add `z_moc_scope` + text to `ZMOC_C_CHGMGMTREQWORKLIST` | Eclipse |
| 4 | List column / filter *Area Scope* in `ZMOC_C_CHGMGMTREQWORKLIST_MDE` | Eclipse |
| 5 | Regenerate the OData project, clear caches | SEGW, SAP GUI |
| 6 | Test (Fiori list + Gateway client) | browser, `/IWFND/GW_CLIENT` |
| 7 | Transport | SE09 |

You **edit existing objects** – nothing new is created in steps 1–4.

---

## Step 0 – Eclipse ready

Same as guide 07, step 0: Eclipse → perspective **ABAP** → DVJ project (client 120) → package `ZMOC` in *Favorite Packages*.

**How to open an existing CDS object:** press **Ctrl+Shift+A** (*Open ABAP Development Object*) → type the name → select it → **OK**.

Shortcuts: **Ctrl+S** save · **Ctrl+F2** check · **Ctrl+F3** activate · **F8** data preview.

When you change the first object, Eclipse asks for a **transport** – choose your request; the following objects go into the same one.

---

## Step 1 – `ZMOC_I_CHGMGMTREQUEST`

1. **Ctrl+Shift+A** → `ZMOC_I_CHGMGMTREQUEST` → OK.
2. You see:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_1'
@EndUserText.label: 'ZMOC_I_CHGMGMTREQUEST'
extend view I_ChgMgmtRequest with ZMOC_I_ChgMgmtRequest
{
    z_area_name,z_unit_name,z_moc_asta_des,z_moc_types,z_moc_act_sta
}
```

3. Change only the field line – add `, z_moc_scope` at the end. Result:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_1'
@EndUserText.label: 'ZMOC_I_CHGMGMTREQUEST'
extend view I_ChgMgmtRequest with ZMOC_I_ChgMgmtRequest
{
    z_area_name,z_unit_name,z_moc_asta_des,z_moc_types,z_moc_act_sta,
    z_moc_scope
}
```

4. **Ctrl+S → Ctrl+F3.**
5. Test: **Ctrl+Shift+A** → `I_CHGMGMTREQUEST` → OK → **F8**. Scroll right: column `z_moc_scope` with S / M / G (blank for old MOCs created before the scope project).

Do **not** touch the comment block `/*+[internal] … */` that may appear below the source – Eclipse maintains it itself.

---

## Step 2 – `ZMOC_I_CHGMGMTREQWORKLIST`

1. **Ctrl+Shift+A** → `ZMOC_I_CHGMGMTREQWORKLIST` → OK.
2. Change the field line in the same way. Result:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_2'
@EndUserText.label: 'ZMOC_I_ChgMgmtReqWorklist'
extend view I_ChgMgmtReqWorklist with ZMOC_I_ChgMgmtReqWorklist
{
    z_area_name,z_unit_name,z_moc_asta_des,z_moc_types,z_moc_act_sta,
    z_moc_scope
}
```

3. **Ctrl+S → Ctrl+F3.**
   * Error *"z_moc_scope is unknown"* → step 1 is not active yet. Activate step 1 first, then this one.

---

## Step 3 – `ZMOC_C_CHGMGMTREQWORKLIST` (field + readable text)

The list app should show **Single / Multiple / Global**, not S / M / G. We add the code and a second field with the text, built by a `case` (old MOCs with a blank scope count as *Single*, the same rule the ABAP code uses).

1. **Ctrl+Shift+A** → `ZMOC_C_CHGMGMTREQWORKLIST` → OK.
2. Replace the source (everything except a `/*+[internal] … */` block) with:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_3'
@EndUserText.label: 'ZMOC_C_ChgMgmtReqWorklist'
extend view C_ChgMgmtReqWorklist with ZMOC_C_ChgMgmtReqWorklist
{
    z_area_name,z_unit_name,z_moc_asta_des,z_moc_types,z_moc_act_sta,
    z_moc_scope,
    cast( case z_moc_scope
            when 'M' then 'Multiple'
            when 'G' then 'Global'
            else          'Single'
          end as abap.char( 10 ) ) as z_moc_scope_txt
}
```

3. **Ctrl+S → Ctrl+F3.**
4. Test: **Ctrl+Shift+A** → `C_CHGMGMTREQWORKLIST` → **F8** → columns `z_moc_scope` and `z_moc_scope_txt`; for a Multiple-Area MOC `z_area_name` shows all area names.

What the new lines mean:
* `case … when … then … else … end` – like ABAP `CASE`: picks the text for each code.
* `cast( … as abap.char( 10 ) )` – gives the result a fixed type (10 characters).
* `as z_moc_scope_txt` – the name of the new field.

---

## Step 4 – `ZMOC_C_CHGMGMTREQWORKLIST_MDE` (columns and filters of the list app)

A *metadata extension* (MDE) only contains UI annotations: which column, which label, which filter field.

1. **Ctrl+Shift+A** → `ZMOC_C_CHGMGMTREQWORKLIST_MDE` → OK.
2. Find the existing *Area* block:

```cds
    @UI.lineItem: [{ position: 60, label: 'Area' }]
    @UI.identification: [{ position: 60, label: 'Area' }]
    @UI.selectionField: [{ position: 60 }]
    @EndUserText.label: 'Area'
    z_area_name;
```

3. Replace this block with the following (new *Area Scope* at position 55 + *Area* renamed to *Area(s)*, because a Multiple-Area MOC shows several names):

```cds
    @UI.lineItem: [{ position: 55, label: 'Area Scope' }]
    @UI.identification: [{ position: 55, label: 'Area Scope' }]
    @UI.selectionField: [{ position: 55 }]
    @EndUserText.label: 'Area Scope'
    z_moc_scope_txt;

    @UI.hidden: true
    z_moc_scope;

    @UI.lineItem: [{ position: 60, label: 'Area(s)' }]
    @UI.identification: [{ position: 60, label: 'Area(s)' }]
    @UI.selectionField: [{ position: 60 }]
    @EndUserText.label: 'Area(s)'
    z_area_name;
```

4. Leave everything else in the file unchanged → **Ctrl+S → Ctrl+F3.**

Meaning: `@UI.lineItem` = column in the result list (position = order), `@UI.selectionField` = field in the filter bar, `@UI.identification` = field on the object header, `@EndUserText.label` = label, `@UI.hidden: true` = not shown (the code S/M/G is kept only for technical use).

---

## Step 5 – OData service: regenerate and clear caches

1. **`/IWFND/CACHE_CLEANUP`** – tick *Cleanup Cache for all Models* → F8.
2. **`/IWBEP/CACHE_CLEANUP`** → F8.
3. Only for the Power BI service, if `z_moc_scope` is missing in its `$metadata` after 1–2: **SEGW** → project `ZEHS_MOC_MANCHGREQ` → **Change** → **Generate Runtime Objects** → keep the class names → transport. (Never regenerate or change SAP's standard project `EHS_MOC_MANCHGREQ`.)

If you do the Power BI build (guide 07) in the same transport, do its SEGW step first and generate once for both.

---

## Step 6 – Test

**Gateway client** (`/IWFND/GW_CLIENT`, method GET):

| # | Request URI | Expect |
|---|---|---|
| 1 | `/sap/opu/odata/sap/EHS_MOC_MANCHGREQ_SRV/$metadata` (Fiori app service; same test with `ZEHS_MOC_BIDASHBOARD_SRV` for Power BI) | properties `z_moc_scope`, `z_moc_scope_txt` in `C_ChgMgmtReqWorklistType` |
| 2 | `/sap/opu/odata/sap/EHS_MOC_MANCHGREQ_SRV/C_ChgMgmtReqWorklist?$select=ChgMgmtRequest,z_moc_scope,z_moc_scope_txt,z_area_name&$top=20` | Single / Multiple / Global per MOC |
| 3 | `…/C_ChgMgmtReqWorklist?$filter=z_moc_scope_txt eq 'Multiple'&$top=20` | only Multiple-Area MOCs |

**Fiori app *Manage Change Requests*:**
1. Open the app (log off/on or clear the browser cache first).
2. Filter bar shows **Area Scope**; the list shows columns **Area Scope** and **Area(s)**.
   * If the columns do not appear: the user has a saved personal view (variant). Gear icon ⚙ (*Settings*) above the table → tick **Area Scope** → OK, or choose the *Standard* variant.
3. Filter *Area Scope = Multiple* → only Multiple-Area MOCs; their *Area(s)* column lists all areas.

---

## Step 7 – Transport

**SE09** → the request must contain:

| Object | Type |
|---|---|
| `ZMOC_I_CHGMGMTREQUEST` | DDLS |
| `ZMOC_I_CHGMGMTREQWORKLIST` | DDLS |
| `ZMOC_C_CHGMGMTREQWORKLIST` | DDLS |
| `ZMOC_C_CHGMGMTREQWORKLIST_MDE` | DDLX |
| `ZEHS_MOC_MANCHGREQ` + `ZCL_ZEHS_MOC_MANCHGREQ_MPC` / `_DPC` (only if regenerated in step 5.3) | SEGW project + generated classes |

After import run the two cache clean-ups once (step 5.1, 5.2).

---

## Related (not part of this guide)

* **One row per MOC and area** for reporting (`ZMOC_I_CHGMGMTREQAREA`, uses `ZMOC_D_ISS_AREA`) → guide **07**, step 1.
* **Power BI dashboard** measures and model → guide **06**, section 7.
