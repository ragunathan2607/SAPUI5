# ZMOC – Global MOC and Multiple-Area MOC
## Step-by-Step Navigation Guide – Back End

This guide says **where** each object is built and **where exactly** each piece of code goes. The definitions and the code itself are in the build guide.

| Document | Content |
| --- | --- |
| `01_Impact_Analysis_and_Solution_Design.md` | Design; the step plan in §9 gives the step numbers used here |
| `02_Technical_Build_Guide.md` ("BG §n") | Field definitions and complete ABAP / CDS code |
| `03_Step_by_Step_Navigation_Guide.md` (this file) | Back end: transactions, menu paths, insertion points |
| `04_Front_End_Change_Guide.md` | Front end: FPM screens, area popup, People Involved hint, Fiori worklist |

Each step has the same parts:

| Part | Meaning |
| --- | --- |
| **Where** | Transaction or tool, and the menu path |
| **Do** | What to enter or click |
| **Put the code** | Method and exact position; the code is in the build guide section named |
| **Check** | How you know the step worked |

Menu and button names are those of SAP GUI on S/4HANA 2023 (SAP_BASIS 758) in English. Where a label can differ between support packages, the step says so.

---

## Before you start

| Need | Detail |
| --- | --- |
| SAP GUI | DVJ client 120, developer key, `S_DEVELOP` for package `ZMOC` |
| Eclipse with ABAP Development Tools (ADT) | Only for CDS (steps 25–26): DDL sources and metadata extensions cannot be edited in SAP GUI |
| Browser (Chrome or Edge) | FPM configuration editor – see document 04 |
| BOPF | Authorization for BOBX (BOPF enhancement workbench) and BOBT (test) |
| Test users | One MOC owner without admin role, one MOC admin (`ZMOC_CHK_ADMIN_ROLE`) |

**Build order.** Every object refers to objects built before it, so in this order each object activates on its own:

```
Dictionary (3–8) → BOPF node (9–13) → service class (14) → determination / validation code (15)
→ popup feeder (21a) → existing enhancements (16–20) → FPM configuration (document 04)
→ CDS / OData / PDF (25–28) → migration (29) → test (30) → transport (31)
```

---

## Step 0 – Transport request

**Where:** SE09 (or SE10)

**Do:**
1. *Create* (F6) → *Workbench Request*.
2. Short description: `CRQ<new> MOC Area Scope (Global / Multiple Areas)`.
3. Add a task for every developer → Save.
4. Use this request for every repository object below. If your landscape needs separate requests, create them in the order of design doc §12 and import them in that order.

TVARVC entries (step 8) are client-specific: maintain them in each system, or put them in a customizing request.

**Check:** SE09 shows the request with one task per developer.

---

## Phase 0 – Spike (plan step 2)

**Where:** BOBX, BOBT, MOC application – same navigation as steps 9–13.

**Do:**
1. In package `$TMP` create a throw-away enhancement object (for example `ZMOC_SPIKE_ENH`) with one persistent subnode under ROOT.
2. BOBT: load a test MOC, create a subnode instance, save, reload.
3. Open the same MOC in the MOC application as a non-admin user, change it and save.
4. Delete the spike: BOBX → right-click the enhancement object → *Delete*.

**Check (go / no-go):** the subnode row survives save and reload; the MOC application saves without error; no dump in ST22. No-go → fallback BG §11.

---

## Phase 1 – Dictionary (BG §1)

### Step 3a – Domain `ZMOC_SCOPE_DO`

**Where:** SE11 → radio button *Domain* → `ZMOC_SCOPE_DO` → *Create*

**Do:**
1. Short description: `MOC Area Scope`.
2. Tab *Definition*: Data Type `CHAR`, No. Characters `1`.
3. Tab *Value Range* → *Single Vals*:

   | Fix. Val. | Short Descript. |
   | --- | --- |
   | `S` | Single Area |
   | `M` | Multiple Areas |
   | `G` | Global |

4. Save (package `ZMOC`, request from step 0) → *Activate* (Ctrl+F3).

**Check:** activation log green. These three texts become the radio-button labels on the screen; translate them in SE63 if the application runs in more than one language.

### Step 3b – Data element `ZMOC_SCOPE_DE`

**Where:** SE11 → *Data type* → `ZMOC_SCOPE_DE` → *Create* → *Data Element*

**Do:**
1. Tab *Data Type*: Domain `ZMOC_SCOPE_DO`.
2. Tab *Field Label*: Short `Scope`, Medium `Area Scope`, Long `MOC Area Scope`, Heading `Area Scope`.
3. Tab *Further Characteristics*: *Change Document* ✔.
4. Save → Activate.

### Step 4 – New field in append `ZMOC_ROOT_S`

**Where:** SE11 → *Data type* → `ZMOC_ROOT_S` → *Change*

`ZMOC_ROOT_S` is an append to the extension include `/IAM/INCL_EEW_I_ROOT`. That include is part of table `/IAM/D_I_ROOT` **and** of the data structure of BOPF node ROOT of `/IAM/ISSUE`. This is why a field added here is automatically available in BOPF, in the FPM forms and in the CDS views – no further mapping is needed.

**Do:**
1. Tab *Components*: in the first empty row after `Z_MOC_ASTA_DES` enter
   Component `Z_MOC_SCOPE`, Typing Method `Types`, Component Type `ZMOC_SCOPE_DE`.
2. Activate (Ctrl+F3). The system also activates `/IAM/INCL_EEW_I_ROOT`, `/IAM/D_I_ROOT` and the dependent structures; this can take a few minutes.

**Check:**
* *Utilities → Activation Log*: no errors.
* SE14 → `/IAM/D_I_ROOT` → *Edit* → *Check → Database Object*: consistent.
* SE16N → `/IAM/D_I_ROOT`: column `Z_MOC_SCOPE` exists (blank for existing MOCs until step 29).

### Step 5 – Longer area text (`ZMOC_AREA_TXT_DO`, `ZANAME_DE`)

**Where:** SE11

**Do:**
1. Domain `ZMOC_AREA_TXT_DO` → *Create* → tab *Definition*: `CHAR`, `255` characters, *Output Characteristics* → *Lowercase* ✔ → Save → Activate.
2. *Data type* `ZANAME_DE` → *Change* → tab *Data Type*: replace domain `CHAR80` by `ZMOC_AREA_TXT_DO`; tab *Further Characteristics*: *Change Document* ✔ → Activate.
3. Confirm the popup that offers to activate the dependent objects. Do this while nobody tests MOCs in DVJ – the root table is adjusted.

**Check:**
* `ZANAME_DE` → *Where-Used List* (Ctrl+Shift+F3): only ZMOC objects and `/IAM/D_I_ROOT` (through the append).
* SE14 → `/IAM/D_I_ROOT` → *Check → Database Object*: consistent.
* Syntax check (Ctrl+F2) of `ZMOC_CL_ACT_NOTIFICATION`, `ZMOC_CL_ACTIVITY_WF_CONNECT` and function module `ZMOC_OWNER_NOTIF`: no errors.

### Step 6 – Structures of the area node

**Where:** SE11

**Do:**
1. Data element `ZMOC_AREA_CODE_DE`: tab *Data Type* → *Predefined Type* `CHAR`, length `20`; all four field labels `Area Code` → Activate.
2. *Data type* `ZMOC_S_ISS_AREA_D` → *Create* → *Structure*; components:

   | Component | Component type |
   | --- | --- |
   | `LOC_ROOT_KEY` | `EHFND_LOC_ROOT_KEY` |
   | `AREA_ID` | `ZAREADID_DE` |
   | `AREA_CODE` | `ZMOC_AREA_CODE_DE` |
   | `AREA_NAME` | `EHFND_LOC_REVISION_TEXT` |

   *Extras → Enhancement Category* → *Can Be Enhanced (Character-Type or Numeric)* → Activate.
3. Combined structure `ZMOC_S_ISS_AREA`, table type `ZMOC_T_ISS_AREA` and table `ZMOC_D_ISS_AREA`: let BOBX generate them in step 10. Create them by hand (BG §1.3) only if the wizard does not offer it.

### Step 7 – Messages 031–036

**Where:** SE91 → Message Class `ZMOC_MSG` → radio button *Messages* → *Change*

**Do:** add numbers `031` to `036` with the texts of BG §1.4, tick *Self-Explanatory* for each → Save (request from step 0).

**Check:** 000–030 unchanged (030 is the last number used today); 031–036 new.

### Step 8 – TVARVC variable `ZMOC_BT_TEAM_GLOBAL`

**Where:** STVARV → tab *Selection Options*

**Do:**
1. *Create* → Name `ZMOC_BT_TEAM_GLOBAL`, description `BT team CC for Global MOCs`.
2. Click the *Multiple selection* arrow → tab *Select Single Values* → one e-mail address per row → *Copy* (F8) → Save.
3. Leave *Include changed entries in transport request* unticked when the addresses differ per system, and maintain the variable in QA and PRD after the import.

The value field (`TVARVC-LOW`) holds 45 characters. Use a distribution list or a shorter alias for a longer address.

**Check:** SE16N → `TVARVC`, `NAME = ZMOC_BT_TEAM_GLOBAL`: one row per address, `TYPE = S`, `SIGN = I`, `OPTI = EQ`.

---

## Phase 2 – BOPF enhancement (BG §2)

### Step 9 – Enhancement object `ZMOC_ISSUE_ENH`

**Where:** BOBX

**Do:**
1. In the tree *Business Objects* find `/IAM/ISSUE`.
2. Right-click `/IAM/ISSUE` → *Create Enhancement*.
3. Enhancement object `ZMOC_ISSUE_ENH`, description `MOC – Area Scope`, constants interface `ZIF_MOC_ISSUE_X_C` → continue → package `ZMOC`, request from step 0.

If `/IAM/ISSUE` already has an enhancement object of your company, ask its owner first – a second one is possible but harder to maintain.

**Check:** `ZMOC_ISSUE_ENH` appears under `/IAM/ISSUE` and opens in change mode.

### Step 10 – Subnode `ZZ_AREA`

**Where:** BOBX → `ZMOC_ISSUE_ENH` → *Node Elements* → `ROOT`

**Do:**
1. Right-click `ROOT` → *Create Subnode* (persistent node).
2. Wizard:

   | Field | Value |
   | --- | --- |
   | Node name | `ZZ_AREA` |
   | Description | `Affected areas (Multiple-Area MOC)` |
   | Persistent (data) structure | `ZMOC_S_ISS_AREA_D` (step 6) |
   | Combined structure | `ZMOC_S_ISS_AREA` (let the wizard generate it) |
   | Combined table type | `ZMOC_T_ISS_AREA` (generate) |
   | Database table | `ZMOC_D_ISS_AREA` (generate) |

3. Keep the defaults for the data access class (`/BOBF/CL_DAC_TABLE`) and the lock (inherited from ROOT). The wizard also creates the composition association ROOT → `ZZ_AREA`.
4. Secondary index: SE11 → `ZMOC_D_ISS_AREA` → *Change* → *Indexes…* → *Create Index* `Z01` → fields `MANDT`, `PARENT_KEY` → *Index on all database systems* → Activate.
5. SE11 → `ZMOC_D_ISS_AREA`: tab *Delivery and Maintenance* → delivery class `A`, Data Browser *Display/Maintenance Allowed with Restrictions*; *Technical Settings* → data class `APPL1`, size category `0`, *Buffering not allowed*.

**Check:** table active with `MANDT`, `DB_KEY`, `PARENT_KEY`, `ROOT_KEY` and the four area fields; SE14 → `ZMOC_D_ISS_AREA` → *Indexes*: `Z01` exists on the database.

### Step 11 – Determination `ZZ_SET_SCOPE_DATA`

**Where:** BOBX → `ZMOC_ISSUE_ENH` → `ROOT` → *Determinations*

**Do:**
1. Right-click *Determinations* → *Create Determination*.
2. Name `ZZ_SET_SCOPE_DATA`, description `Area Scope: default, display texts, area rows`.
3. Implementing class `ZCL_MOC_D_SCOPE_DATA` – let the wizard create it; it may stay empty until step 15.
4. Pattern: *Derive dependent data immediately after modification*.
5. Trigger conditions: `ROOT` – Create, Update; `ZZ_AREA` – Create, Update, Delete.
6. Evaluation time point: *After Modify*.
7. If the wizard asks for the nodes the determination writes: `ROOT`, `ZZ_AREA`, `PARTY` (it removes automatically derived Area Manager / Site Shift Manager rows when the scope changes).

**Check:** the determination is listed under ROOT with its class.

### Step 12 – Optional (decision Q6): validation `ZZ_CHECK_SCOPE_LOCK`

**Where:** BOBX → `ZMOC_ISSUE_ENH` → `ROOT` → *Validations* → right-click → *Create Validation*

**Do:**
1. Name `ZZ_CHECK_SCOPE_LOCK`, class `ZCL_MOC_V_SCOPE_LOCK` (generate), category *Consistency Validation*.
2. Triggers: `ROOT` – Update; `ZZ_AREA` – Create, Update, Delete.
3. `ROOT` → *Consistency Groups* → create a group, add `ZZ_CHECK_SCOPE_LOCK`, and set it so that a failed check prevents saving.

Without a consistency group a consistency validation only shows its message and the save still happens. If your BOBX release offers no consistency group for an enhancement object, skip this step – the UI lock of step 17 (part e) still applies.

### Step 13 – Activate and test

**Where:** BOBX → `ZMOC_ISSUE_ENH`

**Do:**
1. *Check* (Ctrl+F2) → *Activate* (Ctrl+F3). Activation generates `ZIF_MOC_ISSUE_X_C`.
2. SE24 → `ZIF_MOC_ISSUE_X_C`: `SC_NODE-ZZ_AREA` and `SC_ASSOCIATION-ROOT-ZZ_AREA` exist. If the generated names differ, adjust the code where the build guide marks `<generated>`.
3. The full BOBT test needs the determination code – run it at the end of step 15.

---

## Phase 3 – New classes (BG §3, §4, §7.1)

Create the classes in SE24 or in ADT:

* **SE24:** enter the name → *Create* → *Class* → description, instantiation *Public*, *Final* ✔, *Usual ABAP Class* → Save. Then toolbar button *Source Code-Based*, select all, paste the code from the build guide, *Activate*.
* **ADT:** right-click package `ZMOC` → *New* → *ABAP Class* → name and description → request → *Finish*. Paste into tab *Global Class*, test classes into tab *Test Classes*, Ctrl+F3.

### Step 14 – `ZCL_MOC_SCOPE_SERVICE` (BG §3)

**Where:** SE24 → `ZCL_MOC_SCOPE_SERVICE` → *Create*

**Do:**
1. Description `MOC Area Scope rules`, public, final.
2. Source code: BG §3.1 (definition) followed by BG §3.2 (implementation) → Activate.
3. Test class: SE24 *Goto → Local Test Classes* (ADT: tab *Test Classes*) → paste BG §3.3 → Activate.
4. Run the tests: SE24 *Class → Unit Test* (ADT: Ctrl+Shift+F10).

**Check:** all tests green; ATC (ADT Ctrl+Shift+F2, or SE80 → right-click the class → *Check → ABAP Test Cockpit (ATC)*) without priority 1 or 2 findings.

### Step 15 – `ZCL_MOC_D_SCOPE_DATA` and `ZCL_MOC_V_SCOPE_LOCK` (BG §4)

**Where:** SE24 → `ZCL_MOC_D_SCOPE_DATA` (created by BOBX in step 11) → *Change*

**Do:** *Source Code-Based* → replace the whole generated source with BG §4.1 → Activate. If step 12 was done: same for `ZCL_MOC_V_SCOPE_LOCK` with BG §4.2.

**Check (BOBT, BG §2 step 6):** BOBT → business object `/IAM/ISSUE` → load a test MOC → node `ZZ_AREA`: add two rows → node ROOT: set `Z_MOC_SCOPE = M` → `Z_AREA_NAME` shows both names, `Z_UNIT_NAME` shows `N/A` → *Save* → reload the MOC: rows and texts are still there.

### Step 21a – `ZCL_MOC_AREA_PICKER_FDR` (BG §7.1)

**Where:** SE24 → `ZCL_MOC_AREA_PICKER_FDR` → *Create*

**Do:** public, final → paste BG §7.1 → Activate. The FPM list configuration that uses this feeder is created in document 04, step 21.

**Check:** tab *Interfaces* shows `IF_FPM_GUIBB` and `IF_FPM_GUIBB_LIST`; syntax check green.

---

## Phase 4 – Existing enhancement implementations (BG §5, §6)

### How to open a class enhancement implementation (steps 16–19)

**Route A – SE80 (recommended)**
1. SE80 → *Repository Browser* → *Package* `ZMOC` → *Enhancements* → *Enhancement Implementations* → double-click the implementation, for example `ZENH_MOC_ROOT_ADD_FLS_VAL`.
2. *Display ↔ Change* (Ctrl+F1).
3. Tab *Enhancement Implementation Elements* → double-click the enhanced class → the Class Builder opens in enhancement mode.

**Route B – SE24**
1. SE24 → enhanced class (table below) → *Display*.
2. *Class → Enhance* (or the toolbar button *Enhance*) → in the popup choose the **existing** implementation. Never create a second implementation for the same change.

**In enhancement mode**
* Tab *Methods*, column *Post-Exit*: the button opens the post-method `IPO_<implementation>~<method>`. Change only the code between `METHOD` and `ENDMETHOD`; leave the generated comment block at the top as it is.
* Tab *Attributes*: your own attributes are the editable rows at the end.
* Ctrl+F3 activates the whole enhancement implementation.

| Enhancement implementation | Enhanced class | What you change |
| --- | --- | --- |
| `ZENH_MOC_UPDT_ROOT_ZFLDS1` | `/IAM/CL_I_D_ROOT_UIDATA_TR_MOC` | post-exit `EXECUTE` |
| `ZENH_MOC_ROOT_ADD_FLS_VAL` | `/MOC/CL_UIFDR_ROOT_OBJ_INF_FRM` | 2 attributes; post-exits `GET_DEFINITION`, `GET_DATA`, `PROCESS_EVENT` |
| `ZENH_MOC_PARTY_DESC_VALID` | `/IAM/CL_I_V_CHECK_DESCRIPTION` | post-exit `EXECUTE` |
| `ZENH_MOC_CHANGE_REQUEST` | `/MOC/CL_CHANGE_REQUEST_APPCC` | post-exits `SAVE`, `AFTER_PROCESS_EVENT` |

The SAP classes themselves are not changed – no modification, no access key.

Before you change a post-exit, keep the current version: *Utilities → Versions → Generate Version* (or rely on the version created at release of the last request).

### Step 16 – `ZENH_MOC_UPDT_ROOT_ZFLDS1` (BG §5.1)

**Put the code:** post-exit `EXECUTE` → Ctrl+F `LOOP AT lwt_root REFERENCE INTO lwr_root.` → insert BG §5.1 as the **first statement inside the loop**, before `CLEAR: lwt_changed_fields.`

**Check:** a Single-Area MOC still gets area/unit ID and name filled when you pick area and unit; Global and Multiple keep the texts set by the determination.

### Step 17 – `ZENH_MOC_ROOT_ADD_FLS_VAL` (BG §5.2)

| Part | Exact place |
| --- | --- |
| a | Tab *Attributes* → two new rows: `ZZ_MOC_ISSUE_KEY` – *Instance Attribute* – *Private* – *Type* – `/BOBF/CONF_KEY`; `ZZ_MOC_AREA_EDITABLE` – *Instance Attribute* – *Private* – *Type* – `ABAP_BOOL`. Save. |
| b | Post-exit `GET_DEFINITION` → Ctrl+F `ZMOC_STYPE` → after `APPEND lws_action_line TO et_action_definition.` of that action → paste BG §5.2 b. |
| c | Post-exit `GET_DATA` → the line `IF core_object->ms_uibb_key-config_id = lc_conf_id.` right after the declarations → paste BG §5.2 c directly below it. |
| d | Same method → find the comment `Begin of code to place Areamanager details in the People involved table` → the line below it, `IF io_event->mv_event_id = 'ZAREA'.`, is replaced by BG §5.2 d. Do **not** change the other check `IF io_event->mv_event_id = 'ZAREA' OR` (it fills the Unit dropdown). |
| e | Same method, end: after the custom-status block (it reads `z_moc_asta_des` and ends with `ENDIF..`) and before the last `ENDIF.` (which closes the configuration-ID check) → paste BG §5.2 e. |
| f | Post-exit `PROCESS_EVENT` (empty today) → paste the body of BG §5.2 f between `METHOD` and `ENDMETHOD`, below the generated comment block. |

Activate (Ctrl+F3) once all parts are in – the implementation activates as one object. It needs `ZCL_MOC_SCOPE_SERVICE` and `ZCL_MOC_AREA_PICKER_FDR` to be active.

The attributes of part a are private components of the enhanced class. The post-exits read them as `core_object->zz_moc_…` because the generated local class is a local friend of the enhanced class – the same way `ZENH_MOC_FLDS_VISIB_VALD` uses `core_object->gv_old_closure_date`.

**Check:** syntax check green. The new actions `ZSCOPE` and `ZAREA_SEL` are offered as events in the FPM editor (document 04, step 23).

### Step 18 – `ZENH_MOC_PARTY_DESC_VALID` (BG §5.3)

**Put the code:**
1. Post-exit `EXECUTE` → declaration part at the top → add the two `DATA` lines of BG §5.3.
2. Ctrl+F `Custom mandatory field check` → select from that comment down to the end of the `--- Z_UNIT_KEY check ---` block (the block that raises message 001) → replace it with the block of BG §5.3. The `DURATION_CD`, `Z_MOC_TYPES`, description and justification checks stay unchanged.

**Check:** Single-Area MOC without area → message 000 as today; Global MOC without Area Manager → message 031 at submit.

### Step 19 – `ZENH_MOC_CHANGE_REQUEST` (BG §5.4)

**Put the code:**
1. Post-exit `SAVE` → replace everything between the generated comment block and `ENDMETHOD` with BG §5.4 (keep your header block and add the history line).
2. Post-exit `AFTER_PROCESS_EVENT` → Ctrl+F `gws_refresh_pending` → extend the `IF` and the reset lines as shown in BG §5.4 (lines marked `CRQ<new>`).

**Check:** first save gives `MOC-26-GLOBAL-NNN`, `MOC-26-MULTIPLE-NNN` or `MOC-26-<area>-<unit>-NNN`; after OK in the area popup the form shows the new area list.

### Step 20 – `ZMOC_CL_ACT_NOTIFICATION` (BG §6)

**Where:** SE24 → `ZMOC_CL_ACT_NOTIFICATION` → *Change* (own class, not an enhancement)

**Put the code:** methods `SEND_NOTIFICATION` and `SEND_NOTIF_INBOX` → Ctrl+F `SELECT SINGLE z_arek_key` → replace this `SELECT` and the following `IF sy-subrc = 0. … ENDIF.` by the one line of BG §6 → Activate.

**Check:** *Where-Used List* of the private method `GET_BT_TEAM_CC` shows no caller any more – delete it or leave it with a comment.

---

## Phase 5 – User interface

See `04_Front_End_Change_Guide.md`: steps 21 (popup list), 22 (dialog box), 23 (root form), 24 (People Involved hint) and the Fiori part of step 25.

---

## Phase 6 – Reporting and output (BG §8)

### Step 25 – CDS extensions, metadata extension, OData service

**Where:** Eclipse ADT, project for DVJ client 120

**Do:**
1. Ctrl+Shift+A (*Open ABAP Development Object*) → `ZMOC_I_CHGMGMTREQUEST` → add `z_moc_scope` to the element list (BG §8.1) → Ctrl+S → Ctrl+F3.
2. Same for `ZMOC_I_CHGMGMTREQWORKLIST`, then `ZMOC_C_CHGMGMTREQWORKLIST` – in this order, because each view reads the field from the one below.
3. Ctrl+Shift+A → `ZMOC_C_CHGMGMTREQWORKLIST_MDE` → add the two blocks of BG §8.2 → activate.
4. SEGW → project `ZEHS_MOC_MANCHGREQ` → *Generate Runtime Objects*. The service is SADL-based (the MPC implements `IF_SADL_GW_MODEL_EXPOSURE_DATA`); regenerating does no harm and makes sure the generated types contain the new element.
5. `/IWBEP/CACHE_CLEANUP` → *Cleanup Cache for all Models* ✔ → Execute; then `/IWFND/CACHE_CLEANUP` → same.

**Check:**
* ADT → right-click `ZMOC_C_CHGMGMTREQWORKLIST` → *Open With → Data Preview*: column `Z_MOC_SCOPE`.
* `/IWFND/GW_CLIENT` → `GET /sap/opu/odata/sap/ZEHS_MOC_MANCHGREQ_SRV/$metadata` → property for `z_moc_scope` in entity type `C_ChgMgmtReqWorklistType`.

### Step 26 – Optional view `ZMOC_I_ChgMgmtReqArea` (BG §8.3)

**Where:** ADT → right-click package `ZMOC` → *New → Other ABAP Repository Object → Core Data Services → Data Definition*

**Do:** name `ZMOC_I_CHGMGMTREQAREA`, template *Define View Entity* → replace the template with BG §8.3 → activate.

### Step 27 – PDF form `ZMOC_CHANGE_REQUEST_FORM` (BG §8.4)

**Where:** SFP → *Form* `ZMOC_CHANGE_REQUEST_FORM` → *Change* → tab *Layout* (Adobe LiveCycle Designer must be installed on the PC)

**Do:**
1. Select the area text field.
2. Palette *Object* → tab *Field*: *Allow Multiple Lines* ✔.
3. Palette *Layout*: height *Expand to fit* ✔ (*Window → Layout* if the palette is hidden).
4. Optional: drag `Z_MOC_SCOPE` from the *Data View* onto the layout.
5. Save → Activate.

**Check:** print preview of a Multiple-Area MOC shows all area names; Global shows `Global`.

### Step 28 – ZRISK and BI dashboard

**Where:** SE11 / SEGW

**Do:**
1. SE11 → `ZMOC_ROOT_S` → put the cursor on `Z_AREK_KEY` → *Where-Used List*; repeat for `Z_AREA_NAME`. Look at hits outside ZMOC (for example the risk-assessment app).
2. SEGW → project of `ZEHS_MOC_BIDASHBOARD_SRV` → data model: if a chart groups by area, base it on `ZMOC_I_ChgMgmtReqArea` (step 26).

---

## Phase 7 – Data (BG §9)

### Step 29 – Report `ZMOC_SCOPE_MIGRATE`

**Where:** SE38 → `ZMOC_SCOPE_MIGRATE` → *Create*

**Do:**
1. Title `MOC Area Scope – one-time migration`, type *Executable Program*, status *Customer Production Program* → Save (package `ZMOC`, request).
2. Paste BG §9 → Activate.
3. F8 with *Test run* ✔ → note the number → F8 without *Test run*.
4. After each import (QA, PRD, client 120) run it again – in SE38 or as a one-time background job (SM36).

**Check:** SE16N → `/IAM/D_I_ROOT` with `APPLICATION` = MOC and `Z_MOC_SCOPE` = blank → no entries.

---

## Phase 8 – Test (step 30)

| Test | Where |
| --- | --- |
| ABAP Unit | SE24 / ADT → `ZCL_MOC_SCOPE_SERVICE` → Ctrl+Shift+F10 |
| ATC | ADT → right-click package `ZMOC` → *Run As → ABAP Test Cockpit* (or transaction ATC) |
| BOPF | BOBT – BG §2 step 6 and the checklist BG §10 |
| User interface | Test cases T01–T33 (design doc §11) in the MOC application |
| Workflow | SBWP / SWIA: approval work items of `WS99500122` show the area and unit texts |
| E-mails | SOST: body shows `Global`/`Global` or the area names / `N/A`; CC holds the BT team |
| Dumps | ST22: none for the test users |

---

## Phase 9 – Transport and go-live (step 31)

**Where:** SE09, STMS

**Do:**
1. SE09 → release the tasks, then the request (*Release Directly*, F9).
2. STMS → import into QA → test → import into PRD. With several requests, keep the order of design doc §12.
3. After each import (QA and PRD):
   1. STVARV: maintain `ZMOC_BT_TEAM_GLOBAL` (step 8).
   2. SE38: `ZMOC_SCOPE_MIGRATE` (step 29).
   3. `/IWBEP/CACHE_CLEANUP`, `/IWFND/CACHE_CLEANUP` and the Fiori cache steps of document 04 (step 25).
   4. Smoke test: one Single, one Multiple and one Global MOC up to submission.

---

## Where each piece of code goes – quick reference

| Build guide | Object | Method / place | Step |
| --- | --- | --- | --- |
| §1.1–1.5 | DDIC, `ZMOC_MSG`, TVARVC | SE11, SE91, STVARV | 3–8 |
| §2 | `ZMOC_ISSUE_ENH` | BOBX: node `ZZ_AREA`, determination, validation | 9–13 |
| §3.1–3.2 | `ZCL_MOC_SCOPE_SERVICE` | whole class source | 14 |
| §3.3 | `ZCL_MOC_SCOPE_SERVICE` | local test class | 14 |
| §4.1 | `ZCL_MOC_D_SCOPE_DATA` | whole class source | 15 |
| §4.2 | `ZCL_MOC_V_SCOPE_LOCK` | whole class source | 15 |
| §5.1 | `ZENH_MOC_UPDT_ROOT_ZFLDS1` | `EXECUTE`: first statement in `LOOP AT lwt_root` | 16 |
| §5.2 a | `ZENH_MOC_ROOT_ADD_FLS_VAL` | tab *Attributes* | 17 |
| §5.2 b | `ZENH_MOC_ROOT_ADD_FLS_VAL` | `GET_DEFINITION`: after action `ZMOC_STYPE` | 17 |
| §5.2 c | `ZENH_MOC_ROOT_ADD_FLS_VAL` | `GET_DATA`: below `IF … config_id = lc_conf_id.` | 17 |
| §5.2 d | `ZENH_MOC_ROOT_ADD_FLS_VAL` | `GET_DATA`: Area Manager block, `IF … = 'ZAREA'.` | 17 |
| §5.2 e | `ZENH_MOC_ROOT_ADD_FLS_VAL` | `GET_DATA`: before the last `ENDIF.` | 17 |
| §5.2 f | `ZENH_MOC_ROOT_ADD_FLS_VAL` | `PROCESS_EVENT`: whole body | 17 |
| §5.3 | `ZENH_MOC_PARTY_DESC_VALID` | `EXECUTE`: declarations + area/unit block | 18 |
| §5.4 | `ZENH_MOC_CHANGE_REQUEST` | `SAVE` body; `AFTER_PROCESS_EVENT` refresh `IF` | 19 |
| §6 | `ZMOC_CL_ACT_NOTIFICATION` | `SEND_NOTIFICATION`, `SEND_NOTIF_INBOX` | 20 |
| §7.1 | `ZCL_MOC_AREA_PICKER_FDR` | whole class source | 21a |
| §7.2–7.5 | FPM configurations | FPM editor – document 04 | 21–24 |
| §8.1–8.3 | CDS | ADT | 25–26 |
| §8.4 | `ZMOC_CHANGE_REQUEST_FORM` | SFP layout | 27 |
| §9 | `ZMOC_SCOPE_MIGRATE` | whole report | 29 |
