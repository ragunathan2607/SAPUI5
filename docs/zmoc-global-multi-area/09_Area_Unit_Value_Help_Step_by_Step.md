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
| 3b | Area filter also finds Multiple-Area MOCs (filter exit `ZCL_MOC_FLT_EXIT_AREA`) | SE24, Eclipse |
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

## Step 3b – Area filter also finds Multiple-Area MOCs (filter exit)

**Problem:** a Multiple-Area MOC stores all its area names in one text (`z_area_name` = "Area 1, Area 3", or "… (+n more)" when the names do not fit into 255 characters). Picking *Area 1* filters with *equal to* → such MOCs are not found. *Contains* is not reliable either ("Area 1" also matches "Area 10"; names hidden in "+n more" are missed).

**Solution:** a SAP filter exit (same technique SAP uses for the Status filter, `CL_MOC_FLT_EXIT_STATUS`). When the user filters *Area(s) = Area 1*, the exit reads all MOCs that have Area 1 from the per-area view `ZMOC_I_CHGMGMTREQAREA` and filters on exactly those MOC keys. Result: Single-Area MOCs of Area 1 **and** every Multiple-Area MOC that includes Area 1.

**Prerequisite:** CDS view `ZMOC_I_CHGMGMTREQAREA` is active (guide 07, step 1).

### 3b.1 Class `ZCL_MOC_FLT_EXIT_AREA` (SE24 or Eclipse)

SE24 → `ZCL_MOC_FLT_EXIT_AREA` → **Create** → description *MOC: SADL filter exit for Area* → package `ZMOC` → switch to **Source Code-Based** → Ctrl+A → paste:

```abap
CLASS zcl_moc_flt_exit_area DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

*&---------------------------------------------------------------------*
*& Description : SADL filter exit for z_area_name (Manage Change Requests)
*&  'Area(s) = X' returns every MOC that has area X: Single Area,
*&  Global ('Global') and Multiple-Area MOCs (table ZMOC_D_ISS_AREA)
*&  - read via CDS ZMOC_I_CHGMGMTREQAREA
*&---------------------------------------------------------------------*

  PUBLIC SECTION.
    INTERFACES if_sadl_exit_filter_transform.

ENDCLASS.



CLASS zcl_moc_flt_exit_area IMPLEMENTATION.

  METHOD if_sadl_exit_filter_transform~map_atom.

    CLEAR ro_condition.

    " Only the area field with 'equal to' (= value picked from the list)
    IF iv_element <> 'Z_AREA_NAME'
       OR iv_operator <> if_sadl_exit_filter_transform~co_operator-equals.
      RAISE EXCEPTION TYPE cx_sadl_exit_filter_not_supp.
    ENDIF.

    " All MOCs that have this area (one row per MOC and area)
    SELECT DISTINCT chgmgmtrequuid
      FROM zmoc_i_chgmgmtreqarea
      WHERE areaname = @iv_value
      INTO TABLE @DATA(lt_moc).

    DATA(lo_condfac) = cl_sadl_cond_prov_factory_pub=>create_simple_cond_factory( ).

    " No MOC has this area: keep the original filter (returns no rows)
    IF lt_moc IS INITIAL.
      ro_condition = lo_condfac->element( 'Z_AREA_NAME' )->equals( iv_value ).
      RETURN.
    ENDIF.

    " MOC key = key 1 OR key 2 OR ...
    DATA(lo_uuid) = lo_condfac->element( 'CHGMGMTREQUUID' ).
    LOOP AT lt_moc INTO DATA(ls_moc).
      IF ro_condition IS NOT BOUND.
        ro_condition = lo_uuid->equals( ls_moc-chgmgmtrequuid ).
      ELSE.
        ro_condition = ro_condition->or( lo_uuid->equals( ls_moc-chgmgmtrequuid ) ).
      ENDIF.
    ENDLOOP.

  ENDMETHOD.

ENDCLASS.
```

**Check → Activate.** If the check reports a type problem in `equals( ls_moc-chgmgmtrequuid )`, send me the message.

### 3b.2 Attach the exit to the area field (`ZMOC_C_CHGMGMTREQWORKLIST`)

1. Eclipse → **Ctrl+Shift+A** → `ZMOC_C_CHGMGMTREQWORKLIST`.
2. Put the annotation line directly above `z_area_name` (split the first field line). Result:

```cds
@AbapCatalog.sqlViewAppendName: 'ZMOC_EX_3'
@EndUserText.label: 'ZMOC_C_ChgMgmtReqWorklist'
extend view C_ChgMgmtReqWorklist with ZMOC_C_ChgMgmtReqWorklist
{
    @ObjectModel.filter.transformedBy: 'ABAP:ZCL_MOC_FLT_EXIT_AREA'
    z_area_name,
    z_unit_name,z_moc_asta_des,z_moc_types,z_moc_act_sta,
    z_moc_scope,
    cast( case z_moc_scope
            when 'M' then 'Multiple'
            when 'G' then 'Global'
            else          'Single'
          end as abap.char( 10 ) ) as z_moc_scope_txt
}
```

3. **Ctrl+S → Ctrl+F3.**

**Effect for the user:** pick *Area 1* (one or several areas) from the value help → *Go* → all MOCs with Area 1, including Multiple-Area MOCs with Area 1 among others. Operators other than *equal to* (e.g. *contains*) are not supported for this field any more – the value list is the way to filter.

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

**Multiple-Area MOCs:** with step 3b, picking *Area 1* also returns every Multiple-Area MOC that includes Area 1 (test with a MOC that has Area 1 and Area 3: it must appear for *Area 1* and for *Area 3*).

---

## Step 7 – Transport

**SE09** – the request must contain:

| Object | Type |
|---|---|
| `ZMOC_I_AREAVH` | DDLS (new) |
| `ZMOC_I_UNITVH` | DDLS (new) |
| `ZMOC_C_CHGMGMTREQWORKLIST_MDE` | DDLX |
| `ZMOC_C_CHGMGMTREQWORKLIST` (filter exit annotation) | DDLS |
| `ZCL_MOC_FLT_EXIT_AREA` | class (new) |
| `ZMOC_I_CHGMGMTREQAREA` (if not yet transported with guide 07) | DDLS |
| `ZEHS_MOC_MANCHGREQ` + generated `ZCL_ZEHS_MOC_MANCHGREQ_MPC` / `_DPC` | SEGW project + classes |

After import: cache clean-up (step 5) once in the target system.
