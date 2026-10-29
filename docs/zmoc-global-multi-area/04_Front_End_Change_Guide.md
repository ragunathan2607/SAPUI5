# ZMOC – Global MOC and Multiple-Area MOC
## Front-End Change Guide

This guide covers every change on the screens: the MOC form, the area popup, the People Involved hint and the Fiori worklist. It continues `03_Step_by_Step_Navigation_Guide.md` (back end); step numbers are those of the plan in design doc §9, code references ("BG §n") point to `02_Technical_Build_Guide.md`.

The MOC change request screen is an FPM application (Web Dynpro ABAP). Its screens are **configurations**, changed in the FPM configuration editor in the browser – no SAPUI5 code is involved. The only Fiori (SAPUI5) part is the worklist, and it reads its columns and filters from CDS annotations.

---

## What the user will see

| Place | Today | After the change |
| --- | --- | --- |
| *Basic Information and Dates* → group *General* | Area Name, Unit Name | New **Area Scope** radio buttons: *Single Area* (default) / *Multiple Areas* / *Global* |
| Single Area | Area and Unit as today, Area Manager derived | unchanged |
| Multiple Areas | – | Area and Unit hidden; **Affected Areas** text with button **Select Areas…** (in display mode **View Areas**) |
| Global | – | Area and Unit hidden; e-mails show *Global* / *Global* |
| Popup | – | **Select Affected Areas**: list with checkboxes, *Select All*, *Deselect All*, OK, Cancel |
| People Involved | "\*\* For Non-Operational Areas, Select the Area Manager Manually" | Hint also names Global and Multiple-Area MOCs |
| Fiori worklist | Area column | New column and filter **Area Scope**; Area column label **Area(s)** |

## Objects

| Step | Screen object | Kind | How it is changed |
| --- | --- | --- | --- |
| 21 | `ZMOC_L_AREA_PICKER` | New list configuration (component `FPM_LIST_UIBB_ATS`, feeder `ZCL_MOC_AREA_PICKER_FDR`) | Created new – customer namespace, no enhancement |
| 22 | `/MOC/OVP_CHANGE_REQUEST` | Overview page of the MOC (component `FPM_OVP_COMPONENT`) | Existing configuration enhancement `ZENH_MOC_OVP_OVRALL_CQ` |
| 23 | `/MOC/F_ISS_ROOT_OBJECT_INFO` | Form *Basic Information and Dates* (feeder `/MOC/CL_UIFDR_ROOT_OBJ_INF_FRM`) | Existing configuration enhancement `ZENH_MOC_ADDITIONAL_FIELDS` |
| 24 | People Involved hint | Title / explanation in the OVP or the list | Where the text is found (step 24) |
| 25 | Fiori worklist | CDS metadata extension (back end) + caches | Document 03 step 25, then the cache steps here |

Do the steps in this order: the dialog box (22) contains the list (21), and the button in the form (23) opens the dialog box.

**Prerequisites (document 03):** steps 4 (field `Z_MOC_SCOPE`), 14 (`ZCL_MOC_SCOPE_SERVICE`), 17 (post-exits with the actions `ZSCOPE` and `ZAREA_SEL`), 19 (refresh after OK) and 21a (`ZCL_MOC_AREA_PICKER_FDR`) are active.

---

## A. Working with the FPM configuration editor

### A1 – Open the editor

Use any of these:

1. **SE80 – by name:** SE80 → *Edit Object* (Shift+F5) → tab *Web Dynpro* → *Component Configuration* → enter the configuration name → *Display* → button **Start Configurator**. The browser opens the editor.
2. **SE80 – by component:** *Repository Browser* → *Web Dynpro Comp./Intf.* → component (for example `FPM_OVP_COMPONENT`) → folder *Component Configurations* → the configuration → **Start Configurator**.
3. **Browser URL:**
   `https://<host>:<port>/sap/bc/webdynpro/sap/configure_component?sap-client=120&sap-language=EN&CONFIG_ID=<configuration>`
4. **From the running MOC application** (handy to find out which configuration holds an element): start the application with the URL parameter `sap-config-mode=X`; FPM then offers entries to configure the page and each UIBB (the labels vary by release).

### A2 – Rules for SAP configurations

* `/MOC/…` configurations belong to SAP. They are changed through a **configuration enhancement**, which keeps the SAP configuration untouched (no modification).
* Every configuration in this guide **already has** an enhancement of your team. Always continue in it:

  | Configuration | Enhancement implementation to use |
  | --- | --- |
  | `/MOC/OVP_CHANGE_REQUEST` | `ZENH_MOC_OVP_OVRALL_CQ` |
  | `/MOC/F_ISS_ROOT_OBJECT_INFO` | `ZENH_MOC_ADDITIONAL_FIELDS` |
  | `/MOC/L_ISS_PARTY_PEOPLE_INVOLVED` | `ZENH_MOC_ISS_PARTY_PEOPLE_INVO` |

* In the editor click **Enhance** (in some releases under *Additional Functions*) → choose the implementation from the table → continue. If the editor only offers to create a new implementation, stop and check that you opened the right configuration.
* Never use *Delete Enhancement* – it removes all custom changes of that screen.
* *Save* asks for the transport request of step 0 (document 03).

The editor has a **preview** in the middle, the **schema** (list of groups, elements, columns or pages) with its own toolbar, an **attributes** panel for the selected element, and a **repositories** panel with the field catalog of the feeder. Elements can be added with the schema toolbar or by dragging a field from the repository onto the preview.

### A3 – See the result

The application reads its configuration when it starts. After *Save*, close the MOC tab and start the application again; if the browser still shows the old page, reload with Ctrl+F5.

---

## Step 21 – List configuration `ZMOC_L_AREA_PICKER` (new)

**Where:** SE80 → *Repository Browser* → *Web Dynpro Comp./Intf.* → `FPM_LIST_UIBB_ATS` → right-click → *Create/Change Configuration*

**Do:**
1. Configuration ID `ZMOC_L_AREA_PICKER` → *New* → description `MOC – select affected areas`, package `ZMOC`, transport request.
2. Popup *Feeder Class*: `ZCL_MOC_AREA_PICKER_FDR` → *Edit Parameters* (the feeder has none) → *OK*.
3. *Column Schema* → *Add Column* → select `SELECTED`, `AREA_CODE`, `AREA_NAME`, `AREA_ID` (not `LOC_ROOT_KEY`) → *OK*.
4. Column attributes:

   | Column | Display type | Header |
   | --- | --- | --- |
   | `SELECTED` | Checkbox | Select |
   | `AREA_CODE` | Text View | Area Code |
   | `AREA_NAME` | Text View | Area Name |
   | `AREA_ID` | Text View | Location ID |

   The headers are also delivered by the feeder; enter them here only to change them.
5. List attributes (*List ATS* settings):
   * *Selection Mode*: no selection – the checkbox column is the selection.
   * *Visible rows*: `12`, scrolling.
   * Sorting and the filter row are optional; the feeder already lists the selected areas first, then by name.
6. *Toolbar Schema* → *Add Toolbar Element* → *Button*:
   * FPM Event ID `ZAREA_SEL_ALL`, text *Select All*
   * second button: FPM Event ID `ZAREA_SEL_NONE`, text *Deselect All*
7. *Save*.

**Check:** the preview shows the four columns and the two buttons (the rows appear only at runtime).

---

## Step 22 – Dialog box `ZMOC_AREA_SEL` in `/MOC/OVP_CHANGE_REQUEST`

**Where:** SE80 → `FPM_OVP_COMPONENT` → *Component Configurations* → `/MOC/OVP_CHANGE_REQUEST` → *Start Configurator* → *Enhance* → `ZENH_MOC_OVP_OVRALL_CQ`

**Do:**
1. Open the existing dialog box **`PAGE_20`** (*Switch Action*, built by your team) in the page navigation of the editor and look at its attributes. The new dialog box is built the same way.
2. Add a page of type **Dialog Box** (page navigation → *Add Page*):
   * Page ID `ZMOC_AREA_SEL` – exactly this value; it must match `ZCL_MOC_AREA_PICKER_FDR=>GC_DIALOG_ID`.
   * Title `Select Affected Areas`.
3. Dialog buttons: **OK** and **Cancel**, as in `PAGE_20`. The feeder saves the selection only on OK, and `AFTER_PROCESS_EVENT` refreshes the form after OK (document 03 step 19).
4. Size: if the page offers width and height, enter 680 × 520 px (the code passes the same values when it opens the dialog).
5. In the new page: *Add Section* → *Add UIBB*:
   * Component `FPM_LIST_UIBB_ATS`
   * Window name `LIST_WINDOW`
   * Configuration ID `ZMOC_L_AREA_PICKER`
   * no UIBB title (the dialog box has one)
6. *Save*.

**Check:** the page navigation lists `ZMOC_AREA_SEL`; `PAGE_20` and the SAP dialog boxes (`LEAD_OBJ_DETAILS`, `P_LONGTEXT`, …) are unchanged.

---

## Step 23 – Form `/MOC/F_ISS_ROOT_OBJECT_INFO` (enhancement `ZENH_MOC_ADDITIONAL_FIELDS`)

**Where:** SE80 → *Edit Object* → *Web Dynpro* → *Component Configuration* `/MOC/F_ISS_ROOT_OBJECT_INFO` → *Start Configurator* → *Enhance* → `ZENH_MOC_ADDITIONAL_FIELDS`

The feeder `/MOC/CL_UIFDR_ROOT_OBJ_INF_FRM` is an FBI feeder on node ROOT of `/IAM/ISSUE`. Its field catalog holds every ROOT field, including the append `ZMOC_ROOT_S`, so `Z_MOC_SCOPE` is available as soon as document 03 step 4 is active. The events `ZSCOPE` and `ZAREA_SEL` come from the post-exit `GET_DEFINITION` (document 03 step 17 b).

The editor header shows whether the form is a *Form* (`FPM_FORM_UIBB`) or a *Form GL2* (`FPM_FORM_UIBB_GL2`). The steps are the same; only positioning differs: in *Form* the order in the schema decides (move up / down or drag in the preview), in *Form GL2* you set row and column.

**Do:**
1. Select group **General** (the group with *Area Name* and *Unit Name*).
2. **Area Scope** – *Add Element* (or drag `Z_MOC_SCOPE` from the field catalog onto the group):

   | Attribute | Value |
   | --- | --- |
   | Display type | Radio Button Group |
   | Label | Area Scope |
   | Column count / Columns | 3 (the three options in one line) |
   | FPM Event ID (on select) | `ZSCOPE` |
   | Visibility | Visible |
   | Mandatory, read-only | leave empty – set at runtime |
   | Position | first element of the group, above *Area Name* |

   The three option texts come from domain `ZMOC_SCOPE_DO`; nothing to maintain here. Do not add `Z_MOC_SCOPE` to the "blank entry" dropdown list in `GET_DEFINITION` – a radio-button group needs no blank option.
3. **Area Name / Unit Name** (`Z_AREK_KEY`, `Z_UNIT_KEY`): no change. Keep their events `ZAREA` / `ZUNIT` and keep them visible in the configuration – the feeder hides them for Multiple and Global.
4. **Affected Areas** (`Z_AREA_NAME`): first check whether the form already contains this field (the enhancement has a text *Area Name1* that may belong to it). Reuse it if it exists; otherwise add it.

   | Attribute | Value |
   | --- | --- |
   | Display type | Text View |
   | Label | Affected Areas |
   | Wrapping | on, if offered |
   | Visibility | Visible (the feeder shows it only for Multiple) |
   | Position | after *Unit Name* |

5. **Button "Select Areas…"** – the standard *Details* button of the same form is the model: it is bound to action `DISPLAY_LEAD_OBJ_DETAILS` and opens a dialog box in the same way. Select it in the schema to see which element type your release uses, then add a new element of that type:

   | Attribute | Value |
   | --- | --- |
   | FPM Event ID / action | `ZAREA_SEL` |
   | Text | leave empty – the feeder shows *Select Areas…* in edit mode and *View Areas* in display mode |
   | Position | right of *Affected Areas* (*Form*: melting group with `Z_AREA_NAME`; *Form GL2*: same row, next column) |

   The button must be bound to `ZAREA_SEL`: the feeder shows and hides it through this action ID.
6. *Save*.

---

## Step 24 – People Involved hint text

**New text** (BG §7.5): *"\*\* For Global / Multiple-Area MOCs and Non-Operational Areas, select the Area Manager manually (and the Site Shift Manager for Emergency MOCs raised after office hours)."*

The current text is not in the ZMOC extract – the text tables of `ZENH_MOC_OVP_OVRALL_CQ` and `ZENH_MOC_ISS_PARTY_PEOPLE_INVO` do not contain it. Find it first, in this order:

1. **OVP:** editor of `/MOC/OVP_CHANGE_REQUEST` (enhancement `ZENH_MOC_OVP_OVRALL_CQ`) → main page → the section with UIBB `/MOC/L_ISS_PARTY_PEOPLE_INVOLVED` → attributes *Title* / *Explanation* of the UIBB or the section.
2. **List:** editor of `/MOC/L_ISS_PARTY_PEOPLE_INVOLVED` (enhancement `ZENH_MOC_ISS_PARTY_PEOPLE_INVO`) → general settings / explanation.
3. **Customizing layer:** if neither shows the text, it was entered as client-specific customizing. Open
   `https://<host>:<port>/sap/bc/webdynpro/sap/customize_component?sap-client=120&CONFIG_ID=/MOC/OVP_CHANGE_REQUEST`
   (then the same for `/MOC/L_ISS_PARTY_PEOPLE_INVOLVED`) and change it there; this asks for a customizing request.
4. **OTR alias:** if the attribute shows an alias such as `ZMOC/…` instead of the text, change the text with SOTR_EDIT.

**Check:** open a MOC – the new hint appears above People Involved.

---

## Step 25 – Fiori worklist

The back-end part (CDS extensions, metadata extension, SEGW, OData caches) is document 03 step 25. Then:

1. Transaction `/UI2/INVALIDATE_GLOBAL_CACHES` → untick *Test Mode* if the screen shows it → Execute (launchpad caches).
2. Browser: reload with Ctrl+F5 or use a private window.
3. Open the worklist → filter bar → *Adapt Filters*: **Area Scope** is offered (`@UI.selectionField`).
4. Table → *Settings* (gear icon) → *Columns*: **Area Scope** (`@UI.lineItem`, position 55). The standard view shows it; views that users saved earlier keep their own column list until they add it.
5. Public views: the owner opens the view, adds column and filter, saves it again.
6. Only if the worklist is a custom Fiori elements project with a local annotation file (`webapp/annotations/annotation.xml`) that redefines `UI.LineItem` or `UI.SelectionFields`: the local file wins – add the two fields there as well, deploy the app (SAP Business Application Studio deploy, or report `/UI5/UI5_REPOSITORY_LOAD`) and run `/UI5/APP_INDEX_CALCULATE` for it.

The `webapp` folder of this Git repository (app ID `portalnew`, the EHSM portal) is not the MOC worklist and needs no change.

---

## Front-end test

| # | Action | Expected result |
| --- | --- | --- |
| 1 | Create a MOC | *Single Area* preselected; Area and Unit as today |
| 2 | Choose Area and Unit | Area Managers derived as today; number `MOC-26-<area>-<unit>-NNN` at first save |
| 3 | Switch to *Multiple Areas* | Area and Unit disappear; *Affected Areas* and *Select Areas…* appear; the chosen area is kept; derived Area Manager / Site Shift Manager rows removed; info message 036 |
| 4 | *Select Areas…* | Popup lists the MOC-relevant areas; the kept area is ticked |
| 5 | Tick only one area → OK | Error 032; popup stays open |
| 6 | Tick three areas → OK | Popup closes; *Affected Areas* shows the three names, sorted |
| 7 | Save | Number `MOC-26-MULTIPLE-NNN` |
| 8 | New MOC → *Global* → save | Area, Unit, *Affected Areas* hidden; number `MOC-26-GLOBAL-NNN` |
| 9 | Submit without Area Manager | Error 031 |
| 10 | Add Area Manager in People Involved → submit | Submission works; mails show *Global* / *Global* or the area names / *N/A* |
| 11 | Display mode | Button *View Areas*; popup read-only with the selected areas only; *Select All* / *Deselect All* disabled |
| 12 | Submitted MOC, non-admin user | Area Scope read-only |
| 13 | Worklist | Column and filter *Area Scope*; *Area(s)* shows the list for Multiple |

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `Z_MOC_SCOPE` missing in the field catalog | Append not active (document 03 step 4), or the editor was opened before activation – close and reopen it. SE11 → `/IAM/INCL_EEW_I_ROOT` must show the field. |
| `ZSCOPE` / `ZAREA_SEL` not offered as events | Post-exit `GET_DEFINITION` not active (document 03 step 17 b). You can also type the ID. |
| Radio buttons without texts | Domain `ZMOC_SCOPE_DO` has no fixed values, or the field is typed with another data element. For other logon languages translate the domain texts in SE63. |
| Choosing a scope has no effect until Save | FPM Event ID `ZSCOPE` missing on the radio-button group. |
| Button visible for Single and Global | The button is not bound to action `ZAREA_SEL`. |
| Button does nothing | Dialog page ID is not `ZMOC_AREA_SEL`, or post-exit `PROCESS_EVENT` is not active. |
| Popup list is empty | No MOC-relevant areas in the location master (`ZMOC_LOC`); the Area dropdown is empty as well in this case. |
| OK closes the popup with fewer than two areas | The dialog box has no *OK* button (for example only *Close*), or the list UIBB uses another configuration or feeder. |
| Form shows old areas after OK | Change in `AFTER_PROCESS_EVENT` missing (document 03 step 19). |
| Old screen after transport | Restart the application, run `/UI2/INVALIDATE_GLOBAL_CACHES`, clear the browser cache; check that the objects below are in the transport. |

**Transport entries of the front-end steps** (SE09 → request → *Objects*):

| Step | Entry |
| --- | --- |
| 21 | `R3TR WDCC ZMOC_L_AREA_PICKER` |
| 22 | `R3TR ENHO ZENH_MOC_OVP_OVRALL_CQ` |
| 23 | `R3TR ENHO ZENH_MOC_ADDITIONAL_FIELDS` |
| 24 | `R3TR ENHO ZENH_MOC_ISS_PARTY_PEOPLE_INVO`, or a customizing request if the text was in the customizing layer |
| 25 | CDS objects (`R3TR DDLS`, `R3TR DDLX`) – document 03 step 25 |
