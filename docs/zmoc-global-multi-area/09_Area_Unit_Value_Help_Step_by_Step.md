# Manage Change Requests – Area / Unit value help (list instead of free text), step by step

For: ZMOC developer, new to CDS. System DVJ, client 120, package `ZMOC`, one workbench transport.

## What changes

| Filter field | Today | After |
|---|---|---|
| **Area(s)** (`z_area_name`) | free-text search | list of all **MOC areas** (same list as the Area dropdown in the MOC screen) |
| **Unit** (`z_unit_name`) | free-text search | list of **units**; if an Area is chosen in the filter, **only the units of that area** |

**Where the lists come from** – exactly the same rules as the MOC screen (`ZENH_MOC_ROOT_ADD_FLS_VAL`):

| List | Source |
|---|---|
| Areas | EHS location revisions of type `ZEHFND_LTY_AA`, current revision (`END_DATE = 99991231`), flagged for MOC (identifier type `ZMOC_LOC` = `X`), area code = identifier `ZLOC_ID`, name = location text in the logon language |
| Units | locations of type `ZEHFND_LTY_PL` that are **direct children** of the area in the current location hierarchy (`EHFNDD_LHR_HIER`, same rule as `CL_EHFND_LOC_HELPER=>GET_DIRECT_CHILDREN_PER_REV`) |

**How it works:** we build two small CDS **value-help views** (one list each), tell the list app's fields to use them (annotation `@Consumption.valueHelpDefinition`), and add the two views to the OData service so the app can read them.

| Step | What | Tool |
|---|---|---|
| 1 | New CDS value help `ZMOC_I_AREAVH` | Eclipse |
| 2 | New CDS value help `ZMOC_I_UNITVH` (units per area) | Eclipse |
| 3 | Connect the filter fields to the value helps (`ZMOC_C_CHGMGMTREQWORKLIST_MDE`) | Eclipse |
| 4 | Add the value helps to the OData project | SEGW |
| 5 | Clear caches | SAP GUI, browser |
| 6 | Test | Fiori app |
| 7 | Transport | SE09 |

Order matters: step 2 uses step 1; step 3 needs both active; step 4 needs steps 1–3 active.

---

## Step 1 – CDS value help `ZMOC_I_AREAVH`

1. Eclipse → right-click package **ZMOC** → **New → Other ABAP Repository Object → Core Data Services → Data Definition** → **Next**.
2. Name `ZMOC_I_AREAVH` · Description `MOC: Area Value Help` → **Next** → transport → **Next** → template **Define View** → **Finish**.
3. **Ctrl+A**, delete, paste:

```cds
@AbapCatalog.sqlViewName: 'ZMOCIAREAVH'
@AbapCatalog.compiler.compareFilter: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'MOC: Area Value Help'
@ObjectModel.dataCategory: #VALUE_HELP
@ObjectModel.representativeKey: 'AreaName'
@ObjectModel.usageType: { serviceQuality: #A, sizeCategory: #S, dataClass: #MASTER }
@Search.searchable: true
define view ZMOC_I_AreaVH
  as select distinct from ehfndd_loc_rev as rev
    inner join ehfndd_loc_idf  as moc  on  moc.parent_key  = rev.db_key
                                       and moc.type        = 'ZMOC_LOC'
                                       and moc.identifier  = 'X'
    inner join ehfndd_loc_idf  as code on  code.parent_key = rev.db_key
                                       and code.type       = 'ZLOC_ID'
    inner join ehfndd_loc_text as txt  on  txt.parent_key  = rev.db_key
                                       and txt.language    = $session.system_language
{
      @Search.defaultSearchElement: true
      @Search.fuzzinessThreshold: 0.8
      @EndUserText.label: 'Area'
  key cast( txt.text as zaname_de )            as AreaName,

      @Search.defaultSearchElement: true
      @EndUserText.label: 'Area Code'
      cast( code.identifier as abap.char( 20 ) ) as AreaCode,

      @UI.hidden: true
      rev.parent_key                             as AreaLocRootKey
}
where rev.type     = 'ZEHFND_LTY_AA'
  and rev.end_date = '99991231'
```

4. **Ctrl+S → Ctrl+F3** (a yellow warning about *DEFINE VIEW ENTITY* can be ignored).
5. **F8** (data preview): the list must match the Area dropdown in the MOC screen.

What the parts mean:
* `@ObjectModel.dataCategory: #VALUE_HELP` – marks the view as a value-help list.
* `@Search.searchable` / `@Search.defaultSearchElement` – the search field in the value-help popup searches area name and code.
* `select distinct from … inner join …` – the same four tables and conditions as the ABAP select in `ZENH_MOC_ROOT_ADD_FLS_VAL`.
* `$session.system_language` – logon language (like `sy-langu`).
* `key … AreaName` – the value that is copied into the filter, because the list app filters on the area **name** (`z_area_name`).

---

## Step 2 – CDS value help `ZMOC_I_UNITVH` (units per area)

1. Same as step 1: Name `ZMOC_I_UNITVH` · Description `MOC: Unit Value Help` · template **Define View**.
2. Paste:

```cds
@AbapCatalog.sqlViewName: 'ZMOCIUNITVH'
@AbapCatalog.compiler.compareFilter: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'MOC: Unit Value Help'
@ObjectModel.dataCategory: #VALUE_HELP
@ObjectModel.representativeKey: 'UnitName'
@ObjectModel.usageType: { serviceQuality: #A, sizeCategory: #S, dataClass: #MASTER }
@Search.searchable: true
define view ZMOC_I_UnitVH
  as select distinct from ehfndd_lhr_hier as hier
    inner join ehfndd_lhr_rev  as lrev on  lrev.db_key       = hier.parent_key
                                       and lrev.split_date  <= '99991231'
                                       and lrev.end_date    >= '99991231'
    inner join ZMOC_I_AreaVH   as area on  area.AreaLocRootKey = hier.par_root_ref_key
    inner join ehfndd_loc_rev  as urev on  urev.parent_key  = hier.loc_root_ref_key
                                       and urev.type        = 'ZEHFND_LTY_PL'
                                       and urev.end_date    = '99991231'
    inner join ehfndd_loc_text as utxt on  utxt.parent_key  = urev.db_key
                                       and utxt.language    = $session.system_language
{
      @Search.defaultSearchElement: true
      @EndUserText.label: 'Area'
  key area.AreaName                          as AreaName,

      @Search.defaultSearchElement: true
      @Search.fuzzinessThreshold: 0.8
      @EndUserText.label: 'Unit'
  key cast( utxt.text as zuname_de )         as UnitName
}
```

3. **Ctrl+S → Ctrl+F3 → F8.** Each row = one area + one of its units. Compare one area with the Unit dropdown of the MOC screen.

What the joins do: `EHFNDD_LHR_HIER` is the location hierarchy (parent → child). We take children (`loc_root_ref_key`) whose parent (`par_root_ref_key`) is a MOC area from step 1, in the current hierarchy revision (`split_date ≤ 99991231 ≤ end_date`), keep only children of type *Unit* (`ZEHFND_LTY_PL`), and read their names.

---

## Step 3 – Connect the filter fields (`ZMOC_C_CHGMGMTREQWORKLIST_MDE`)

1. **Ctrl+Shift+A** → `ZMOC_C_CHGMGMTREQWORKLIST_MDE` → OK.
2. In the **Area(s)** block, add the value-help line. Result:

```cds
    @UI.lineItem: [{ position: 60, label: 'Area(s)' }]
    @UI.identification: [{ position: 60, label: 'Area(s)' }]
    @UI.selectionField: [{ position: 60 }]
    @EndUserText.label: 'Area(s)'
    @Consumption.valueHelpDefinition: [{ entity: { name: 'ZMOC_I_AreaVH', element: 'AreaName' } }]
    z_area_name;
```

3. In the **Unit** block, add the value help with the link to the area. Result:

```cds
    @UI.lineItem: [{ position: 70, label: 'Unit' }]
    @UI.identification: [{ position: 70, label: 'Unit' }]
    @UI.selectionField: [{ position: 70 }]
    @EndUserText.label: 'Unit'
    @Consumption.valueHelpDefinition: [{ entity: { name: 'ZMOC_I_UnitVH', element: 'UnitName' },
                                         additionalBinding: [{ localElement: 'z_area_name',
                                                               element:      'AreaName' }] }]
    z_unit_name;
```

4. **Ctrl+S → Ctrl+F3.**

Meaning:
* `entity: { name: …, element: … }` – which list to show and which of its columns is copied into the field.
* `additionalBinding … localElement: 'z_area_name', element: 'AreaName'` – "filter the unit list with the Area already chosen in the filter bar". This is what makes the units depend on the area.

If the activation says the annotation is **not allowed in a metadata extension**: remove the two `@Consumption.valueHelpDefinition` lines here and put them instead directly above `z_area_name` and `z_unit_name` in the CDS extension `ZMOC_C_CHGMGMTREQWORKLIST` (same text), then activate that one.

---

## Step 4 – Add the value helps to the OData project (SEGW)

The app can only open a value help that is part of its OData service.

1. **SEGW** → open `ZEHS_MOC_MANCHGREQ` → **Change** mode.
2. Right-click **Data Model** → **Reference** → **Data Source** → type **CDS Business Entity** → `ZMOC_I_AREAVH` → **Next** → **Finish**.
3. Repeat for `ZMOC_I_UNITVH`.
4. **Generate Runtime Objects** → keep the class names → OK → transport.

(If you are also doing guide 07, add its views in the same session and generate once.)

---

## Step 5 – Clear caches

1. `/IWFND/CACHE_CLEANUP` (tick *all models*) → F8.
2. `/IWBEP/CACHE_CLEANUP` → F8.
3. Browser: close the Fiori launchpad, clear the browser cache (or open a private window).

---

## Step 6 – Test

**Gateway client** (`/IWFND/GW_CLIENT`, GET):

| # | Request URI | Expect |
|---|---|---|
| 1 | `/sap/opu/odata/sap/ZEHS_MOC_MANCHGREQ_SRV/ZMOC_I_AreaVH` | list of areas |
| 2 | `/sap/opu/odata/sap/ZEHS_MOC_MANCHGREQ_SRV/ZMOC_I_UnitVH?$filter=AreaName eq 'Area 1'` | units of Area 1 only (use a real area name) |
| 3 | `/sap/opu/odata/sap/ZEHS_MOC_MANCHGREQ_SRV/$metadata` | the two new entity sets; in the annotations a `ValueList` for `z_area_name` and `z_unit_name` |

**Fiori app *Manage Change Requests*:**

| # | Action | Expect |
|---|---|---|
| 1 | Filter **Area(s)** → value-help icon (small square) | popup with the list of areas, search field on top |
| 2 | Pick an area → **Go** | MOCs of that area |
| 3 | With that area in the filter, open **Unit** value help | only the units of that area |
| 4 | Clear the Area filter, open Unit value help | all units, with their area in a second column |

If the field still shows only the free-text search: the saved user variant keeps the old field settings → choose variant *Standard*, or remove and re-add the field via *Adapt Filters*.

**Note for Multiple-Area MOCs:** `z_area_name` holds all area names of such a MOC (e.g. "Area 1, Area 3"). Picking *Area 1* from the list filters with **equal to**, so Multiple-Area MOCs that include Area 1 are not shown. To find them as well, use the operator **contains** in the Area filter (*Define Conditions* tab of the value-help popup → *contains* → *Area 1*). Exact per-area filtering would need the per-area view from guide 07 – tell me if that is required.

---

## Step 7 – Transport

**SE09** – the request must contain:

| Object | Type |
|---|---|
| `ZMOC_I_AREAVH` | DDLS (new) |
| `ZMOC_I_UNITVH` | DDLS (new) |
| `ZMOC_C_CHGMGMTREQWORKLIST_MDE` (or `ZMOC_C_CHGMGMTREQWORKLIST`, see step 3) | DDLX / DDLS |
| `ZEHS_MOC_MANCHGREQ` + generated `ZCL_ZEHS_MOC_MANCHGREQ_MPC` / `_DPC` | SEGW project + classes |

After import: cache clean-up (step 5) once in the target system.
