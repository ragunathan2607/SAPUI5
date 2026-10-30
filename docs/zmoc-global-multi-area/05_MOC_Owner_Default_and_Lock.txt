# ZMOC – MOC Owner: default and edit lock

## Requirement (agreed 30.10.2026)

| # | Rule |
|---|------|
| R1 | New MOC: the **MOC Owner** row (`ZMOC_OWN`) in People Involved is filled with the **MOC Initiator** (`ZMOC_INI`). |
| R2 | If *Reported By* (= Initiator) is changed **before the first save**, the MOC Owner follows. After the first save it never changes automatically. |
| R3 | The MOC Owner row can be changed only by a **MOC Admin** (`ZMOC_CHK_ADMIN_ROLE`) or by the logged-in user if they are an **Area Manager** (`ZMOC_AM`) of this MOC. For Global / Multiple-Area MOCs this means any manually entered Area Manager row. Everybody else gets a read-only row. |
| R4 | The existing rule in `ZENH_MOC_PREGATE_SUBACVTY` (Z04 activity, lifecycle 07 → admins only) stays as it is and keeps the last word. |
| R5 | Non-authorized users cannot remove the MOC Owner row or change it through another channel (backend check). |

Facts from the system (extracts DVJ / L25):

* `/IAM/C_ISSUETYP` ZC1, ZC2, ZC3: responsible role `ZMOC_OWN`, initiator role `ZMOC_INI`. The empty MOC Owner row is created by the standard determination `/IAM/CL_I_D_CRT_DEFAULT_PTY`.
* *Reported By* is `ROOT-INITIATOR_ID`. A change there is copied into the Initiator party by the standard determination `/IAM/CL_I_D_ROOT_UIDATA_TR_MOC`. So a determination that listens to **party** changes covers R1 and R2.
* `ZENH_MOC_PREGATE_SUBACVTY` (post-exit of `/BOFU/CL_FBI_GUIBB_LIST→GET_DATA`) already makes the MOC Owner row read-only via `/BOFU/R4` and `/BOFU/RJ`. Step 2 reuses this technique.

Order of work (baby steps): **Step 0 → Step 1 → test → Step 2 → test → Step 3 → test**.

---

## Step 0 – Helper class `ZCL_MOC_OWNER_SERVICE`

SE24 → create class `ZCL_MOC_OWNER_SERVICE`, package `ZMOC`, *Final*, *Public*.
It is a new class; no existing object is touched.

```abap
CLASS zcl_moc_owner_service DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

*&---------------------------------------------------------------------*
*& Object ID   : CRQ<new> (MOC Owner default and edit lock)             *
*& Description : Constants and authority rule for the MOC Owner row    *
*&---------------------------------------------------------------------*

  PUBLIC SECTION.
    CONSTANTS:
      gc_role_owner        TYPE /iam/party_role_cd VALUE 'ZMOC_OWN',
      gc_role_initiator    TYPE /iam/party_role_cd VALUE 'ZMOC_INI',
      gc_role_area_manager TYPE /iam/party_role_cd VALUE 'ZMOC_AM',
      gc_msgid             TYPE symsgid            VALUE 'ZMOC_MSG'.

    "! MOC admin (TVARVC ZEHS_MOC_ADMIN_ROLE) - buffered per session
    CLASS-METHODS is_admin
      RETURNING VALUE(rv_admin) TYPE abap_bool.

    "! Admin, or the logged-in user is one of the given Area Manager BPs
    CLASS-METHODS is_owner_edit_allowed
      IMPORTING it_am_partner     TYPE bu_partner_t
      RETURNING VALUE(rv_allowed) TYPE abap_bool.

  PRIVATE SECTION.
    CLASS-DATA gv_admin_known TYPE abap_bool.
    CLASS-DATA gv_is_admin    TYPE abap_bool.
ENDCLASS.



CLASS zcl_moc_owner_service IMPLEMENTATION.

  METHOD is_admin.
    DATA lv_admin TYPE abap_boolean.

    IF gv_admin_known = abap_false.
      CALL FUNCTION 'ZMOC_CHK_ADMIN_ROLE'
        EXPORTING
          im_uname = sy-uname
        IMPORTING
          ex_auth  = lv_admin.
      gv_is_admin    = lv_admin.
      gv_admin_known = abap_true.
    ENDIF.

    rv_admin = gv_is_admin.
  ENDMETHOD.


  METHOD is_owner_edit_allowed.
    DATA lt_partner      TYPE bu_partner_t.
    DATA lt_partner_user TYPE STANDARD TABLE OF buspartner_and_user.

    IF is_admin( ) = abap_true.
      rv_allowed = abap_true.
      RETURN.
    ENDIF.

    lt_partner = it_am_partner.
    DELETE lt_partner WHERE table_line IS INITIAL.
    IF lt_partner IS INITIAL.
      RETURN.
    ENDIF.
    SORT lt_partner.
    DELETE ADJACENT DUPLICATES FROM lt_partner.

    " Area Manager BP -> SAP user
    CALL FUNCTION 'BUP_PARTNER_TO_USER_CONVERT'
      TABLES
        it_partner          = lt_partner
        et_partner_and_user = lt_partner_user
      EXCEPTIONS
        no_partner_found    = 1
        OTHERS              = 2.
    IF sy-subrc <> 0.
      RETURN.
    ENDIF.

    rv_allowed = xsdbool( line_exists( lt_partner_user[ username = sy-uname ] ) ).
  ENDMETHOD.

ENDCLASS.
```

---

## Step 1 – Default MOC Owner = Initiator (R1, R2)

### 1a. Class `ZCL_MOC_D_DEFAULT_OWNER`

SE24 → create class `ZCL_MOC_D_DEFAULT_OWNER`, superclass `/BOBF/CL_LIB_D_SUPERCLASS`, *Final*, package `ZMOC`.
Redefine `/BOBF/IF_FRW_DETERMINATION~EXECUTE`.

```abap
CLASS zcl_moc_d_default_owner DEFINITION
  PUBLIC
  INHERITING FROM /bobf/cl_lib_d_superclass
  FINAL
  CREATE PUBLIC.

*&---------------------------------------------------------------------*
*& Object ID   : CRQ<new> (MOC Owner default and edit lock)             *
*& Description : Determination ZZ_DEFAULT_MOC_OWNER on /IAM/ISSUE PARTY*
*&  - new MOC (not saved yet): MOC Owner = MOC Initiator                *
*&  - Initiator changed before the first save: Owner follows            *
*&  - a manual change of the Owner row is never overwritten here        *
*&---------------------------------------------------------------------*

  PUBLIC SECTION.
    METHODS /bobf/if_frw_determination~execute REDEFINITION.
ENDCLASS.



CLASS zcl_moc_d_default_owner IMPLEMENTATION.

  METHOD /bobf/if_frw_determination~execute.

    DATA lt_changed  TYPE /iam/t_i_party.
    DATA lt_party    TYPE /iam/t_i_party.
    DATA lt_root     TYPE /iam/t_i_root.
    DATA lt_root_bi  TYPE /iam/t_i_root.
    DATA lt_root_key TYPE /bobf/t_frw_key.
    DATA ls_ini      TYPE /iam/s_i_party.

    CLEAR: eo_message, et_failed_key.

    " it_key = the party rows created / changed in this roundtrip
    io_read->retrieve( EXPORTING iv_node = /iam/if_i_issue_c=>sc_node-party
                                 it_key  = it_key
                       IMPORTING et_data = lt_changed ).

    " Relevant: the Initiator row, or an Owner row that is still empty.
    " An Owner row with a person was changed by hand -> leave it alone.
    DELETE lt_changed WHERE NOT ( party_role_code = zcl_moc_owner_service=>gc_role_initiator
                               OR ( party_role_code = zcl_moc_owner_service=>gc_role_owner
                                    AND bupa_uuid IS INITIAL ) ).
    IF lt_changed IS INITIAL.
      RETURN.
    ENDIF.

    lt_root_key = VALUE #( FOR ls_c IN lt_changed ( key = ls_c-root_key ) ).
    SORT lt_root_key BY key.
    DELETE ADJACENT DUPLICATES FROM lt_root_key COMPARING key.

    io_read->retrieve( EXPORTING iv_node = /iam/if_i_issue_c=>sc_node-root
                                 it_key  = lt_root_key
                       IMPORTING et_data = lt_root ).

    " Before image exists only for MOCs that were saved already
    io_read->retrieve( EXPORTING iv_node         = /iam/if_i_issue_c=>sc_node-root
                                 it_key          = lt_root_key
                                 iv_before_image = abap_true
                       IMPORTING et_data         = lt_root_bi ).

    io_read->retrieve_by_association(
      EXPORTING
        iv_node        = /iam/if_i_issue_c=>sc_node-root
        it_key         = lt_root_key
        iv_association = /iam/if_i_issue_c=>sc_association-root-party
        iv_fill_data   = abap_true
      IMPORTING
        et_data        = lt_party ).

    LOOP AT lt_root INTO DATA(ls_root).

      " /IAM/ISSUE is shared by all IAM applications - act on MOC records only
      IF ls_root-application <> /iam/if_appl_c=>sc_application-moc.
        CONTINUE.
      ENDIF.

      " R2: only until the first save
      IF line_exists( lt_root_bi[ key = ls_root-key ] ).
        CONTINUE.
      ENDIF.

      " Initiator = 'Reported By' on the header (ROOT-INITIATOR_ID).
      " Taken from the root: the Initiator row may not be synchronised yet.
      CLEAR ls_ini.
      IF ls_root-initiator_id IS NOT INITIAL.
        ls_ini-partner_id = ls_root-initiator_id.
        /iam/cl_moc_bupa_adapter=>get_instance( )->get_bupa_guid_by_id(
          EXPORTING iv_businesspartner      = ls_root-initiator_id
          IMPORTING ev_businesspartner_guid = ls_ini-bupa_uuid ).
      ENDIF.
      " Fallback: the Initiator row
      IF ls_ini-bupa_uuid IS INITIAL.
        READ TABLE lt_party INTO ls_ini
             WITH KEY parent_key      = ls_root-key
                      party_role_code = zcl_moc_owner_service=>gc_role_initiator.
      ENDIF.
      IF ls_ini-bupa_uuid IS INITIAL.
        CONTINUE.
      ENDIF.

      READ TABLE lt_party INTO DATA(ls_own)
           WITH KEY parent_key      = ls_root-key
                    party_role_code = zcl_moc_owner_service=>gc_role_owner.
      IF sy-subrc = 0.

        " Write only a real change (no endless determination loop)
        IF ls_own-bupa_uuid <> ls_ini-bupa_uuid.
          ls_own-bupa_uuid  = ls_ini-bupa_uuid.
          ls_own-partner_id = ls_ini-partner_id.
          io_modify->update(
            iv_node           = /iam/if_i_issue_c=>sc_node-party
            iv_key            = ls_own-key
            iv_root_key       = ls_root-key
            is_data           = REF #( ls_own )
            it_changed_fields = VALUE #( ( /iam/if_i_issue_c=>sc_node_attribute-party-bupa_uuid )
                                         ( /iam/if_i_issue_c=>sc_node_attribute-party-partner_id ) ) ).
        ENDIF.

      ELSE.

        " No Owner row yet: create it
        io_modify->create(
          iv_node            = /iam/if_i_issue_c=>sc_node-party
          is_data            = NEW /iam/s_i_party( party_role_code = zcl_moc_owner_service=>gc_role_owner
                                                   bupa_uuid       = ls_ini-bupa_uuid
                                                   partner_id      = ls_ini-partner_id
                                                   origin_cd       = /iam/if_appl_c=>sc_prtnr_origin-default )
          iv_assoc_key       = /iam/if_i_issue_c=>sc_association-root-party
          iv_source_node_key = /iam/if_i_issue_c=>sc_node-root
          iv_source_key      = ls_root-key
          iv_root_key        = ls_root-key ).

      ENDIF.

      CLEAR: ls_ini, ls_own.
    ENDLOOP.

  ENDMETHOD.

ENDCLASS.
```

### 1b. Register the determination (BOBX)

1. **BOBX** → enhancement object `ZMOC_ISSUE_ENH` → *Change* mode.
2. Node **PARTY** (standard node, shown in the enhancement tree) → **Determinations** → right-click → **Create Determination**.
   * Name `ZZ_DEFAULT_MOC_OWNER`, description *MOC Owner = Initiator (new MOC)*
   * Class `ZCL_MOC_D_DEFAULT_OWNER`
   * Category *Derive dependent data immediately after modification*
3. Tab **Trigger Conditions**: `PARTY` – **Create**, **Update**; `ROOT~INITIATOR_PARTY` – **Create**, **Update** (so a change of *Reported By* on the header also starts the determination).
   Tab **Determination Dependency**: leave empty (standard determinations are not offered there; do not tick `ZZ_SET_SCOPE_DATA`).
4. Tab **Evaluation Timepoints**: *After Modify*.
5. Tab **Request Nodes** (if shown): `PARTY`, `ROOT`.
6. Check → Save (package `ZMOC`, same transport as `ZMOC_ISSUE_ENH`) → Activate. Then **Generate constants interface** again.

### 1c. Test Step 1

| # | Action | Expected |
|---|--------|----------|
| 1 | Create a new MOC (any type ZC1 / ZC2 / ZC3) | People Involved: MOC Owner = same BP / name / department as MOC Initiator |
| 2 | Change *Reported By* to another BP (do not save) | MOC Initiator **and** MOC Owner switch to the new BP |
| 3 | Save, then change *Reported By* again | Initiator changes, **MOC Owner stays** |
| 4 | Open an existing (old) MOC | Nothing changes |
| 5 | Choose Area / Area Scope / areas | Area Manager handling unchanged, no dump |

If test 2 fails (Owner does not follow): set a break-point in the determination. If it is not reached when *Reported By* changes, also add trigger `ROOT – Update` in 1b and send the screenshot of the debugger – we then read the Initiator from the root.

---

## Step 2 – Lock the MOC Owner row in the UI (R3, R4)

Object: enhancement `ZENH_MOC_PREGATE_SUBACVTY`, include `ZENH_MOC_PREGATE_SUBACVTY=====EIMP`, method `ipo_zenh_moc_pregate_subacvty~get_data`.

Navigation: SE80 → *Enhancement Implementation* `ZENH_MOC_PREGATE_SUBACVTY` → class `/BOFU/CL_FBI_GUIBB_LIST` → method `GET_DATA` → *Post-exit* → **Change**.

**Where to insert:** directly **before** this existing comment block (do not change it):

```abap
*---------------------------------------------------------------------*
* Control Business Partner editability for MOC Owner
* Applicable only for Z04 Activity in Status 07
```

Because the new block runs first, the existing Z04 / status 07 rule still overrides it (R4).

**Insert:**

```abap
*---------------------------------------------------------------------*
* <BOI> CRQ<new> MOC Owner row editable only for MOC admins and for
* the Area Manager(s) of this MOC (rows ZMOC_AM = logged-in user).
* Runs before the Z04 / status 07 block below, which keeps the last word.
*---------------------------------------------------------------------*
    DATA lwt_own_am_partner TYPE bu_partner_t.
    DATA lwv_own_readonly   TYPE abap_bool.

    FIELD-SYMBOLS: <lft_own_data> TYPE STANDARD TABLE,
                   <lfs_own_row>  TYPE any,
                   <lfs_own_role> TYPE any,
                   <lfs_own_bp>   TYPE any,
                   <lfs_own_r4>   TYPE any,
                   <lfs_own_rj>   TYPE any.

    IF core_object->ms_uibb_key-config_id = '/MOC/L_ISS_PARTY_PEOPLE_INVOLVED'.

      ASSIGN ct_data TO <lft_own_data>.
      IF <lft_own_data> IS ASSIGNED.

        " 1. Area Manager BPs on the screen (auto-filled or entered manually)
        CLEAR lwt_own_am_partner.
        LOOP AT <lft_own_data> ASSIGNING <lfs_own_row>.
          UNASSIGN: <lfs_own_role>, <lfs_own_bp>.
          ASSIGN COMPONENT 'PARTY_ROLE_CODE' OF STRUCTURE <lfs_own_row> TO <lfs_own_role>.
          ASSIGN COMPONENT 'PARTNER_ID'      OF STRUCTURE <lfs_own_row> TO <lfs_own_bp>.
          IF <lfs_own_role> IS ASSIGNED AND <lfs_own_bp> IS ASSIGNED
             AND <lfs_own_role> = zcl_moc_owner_service=>gc_role_area_manager
             AND <lfs_own_bp> IS NOT INITIAL.
            APPEND <lfs_own_bp> TO lwt_own_am_partner.
          ENDIF.
        ENDLOOP.

        lwv_own_readonly = xsdbool(
          zcl_moc_owner_service=>is_owner_edit_allowed( lwt_own_am_partner ) = abap_false ).

        " 2. Set the read-only properties of the MOC Owner row
        LOOP AT <lft_own_data> ASSIGNING <lfs_own_row>.
          UNASSIGN: <lfs_own_role>, <lfs_own_r4>, <lfs_own_rj>.
          ASSIGN COMPONENT 'PARTY_ROLE_CODE' OF STRUCTURE <lfs_own_row> TO <lfs_own_role>.
          IF <lfs_own_role> IS NOT ASSIGNED
             OR <lfs_own_role> <> zcl_moc_owner_service=>gc_role_owner.
            CONTINUE.
          ENDIF.
          ASSIGN COMPONENT '/BOFU/R4' OF STRUCTURE <lfs_own_row> TO <lfs_own_r4>.
          ASSIGN COMPONENT '/BOFU/RJ' OF STRUCTURE <lfs_own_row> TO <lfs_own_rj>.
          IF <lfs_own_r4> IS ASSIGNED AND <lfs_own_r4> <> lwv_own_readonly.
            <lfs_own_r4>    = lwv_own_readonly.
            ev_data_changed = abap_true.
          ENDIF.
          IF <lfs_own_rj> IS ASSIGNED AND <lfs_own_rj> <> lwv_own_readonly.
            <lfs_own_rj>    = lwv_own_readonly.
            ev_data_changed = abap_true.
          ENDIF.
        ENDLOOP.

      ENDIF.
    ENDIF.
* <EOI> CRQ<new>
```

Before activating, check in the list configuration `/MOC/L_ISS_PARTY_PEOPLE_INVOLVED` (FLUID → column *Person Responsible* and column *Role* → attribute *Read-Only*) that the read-only references are `/BOFU/R4` and `/BOFU/RJ`. These are the names the existing Z04 block uses. If the Role column uses another `/BOFU/R*` field, add one more `ASSIGN COMPONENT` for it in the same way.

### Test Step 2

| # | User | Expected on MOC Owner row (edit mode) |
|---|------|---------------------------------------|
| 1 | Normal user, not Area Manager | Person Responsible and Role read-only |
| 2 | User who is the auto-filled Area Manager of the chosen area | editable |
| 3 | Global / Multiple MOC: user enters themself in an Area Manager row, press Enter | MOC Owner row becomes editable |
| 4 | MOC admin | editable |
| 5 | Existing MOC with Z04 activity in lifecycle 07 | unchanged behaviour: admins only |

---

## Step 3 – Backend check (R5)

The UI lock does not cover the **Remove** button (FPM enables it for the whole table) or other channels such as the Fiori app (`ChgMgmtReqMocOwnerTypeSet`).

### 3a. Message `ZMOC_MSG` 037

SE91 → message class `ZMOC_MSG` → number **037**:
*Only a MOC administrator or the Area Manager can change or remove the MOC Owner*

### 3b. Class `ZCL_MOC_V_OWNER_LOCK`

SE24 → class `ZCL_MOC_V_OWNER_LOCK`, superclass `/BOBF/CL_LIB_V_SUPERCLASS`, *Final*, package `ZMOC`. Redefine `/BOBF/IF_FRW_VALIDATION~EXECUTE`.

```abap
CLASS zcl_moc_v_owner_lock DEFINITION
  PUBLIC
  INHERITING FROM /bobf/cl_lib_v_superclass
  FINAL
  CREATE PUBLIC.

*&---------------------------------------------------------------------*
*& Object ID   : CRQ<new> (MOC Owner default and edit lock)             *
*& Description : Validation ZZ_CHECK_MOC_OWNER on /IAM/ISSUE PARTY      *
*&  Only a MOC admin or an Area Manager of the MOC may change or remove *
*&  the MOC Owner (ZMOC_OWN) of a saved MOC                             *
*&---------------------------------------------------------------------*

  PUBLIC SECTION.
    METHODS /bobf/if_frw_validation~execute REDEFINITION.
ENDCLASS.



CLASS zcl_moc_v_owner_lock IMPLEMENTATION.

  METHOD /bobf/if_frw_validation~execute.

    DATA lt_now      TYPE /iam/t_i_party.
    DATA lt_before   TYPE /iam/t_i_party.
    DATA lt_party    TYPE /iam/t_i_party.
    DATA lt_root_key TYPE /bobf/t_frw_key.

    CLEAR: eo_message, et_failed_key.

    " Current data (empty for deleted rows) and last saved data
    io_read->retrieve( EXPORTING iv_node = /iam/if_i_issue_c=>sc_node-party
                                 it_key  = it_key
                       IMPORTING et_data = lt_now ).
    io_read->retrieve( EXPORTING iv_node         = /iam/if_i_issue_c=>sc_node-party
                                 it_key          = it_key
                                 iv_before_image = abap_true
                       IMPORTING et_data         = lt_before ).

    " Only saved MOC Owner rows are protected; a new MOC is handled by Step 1/2
    DELETE lt_before WHERE party_role_code <> zcl_moc_owner_service=>gc_role_owner.
    IF lt_before IS INITIAL.
      RETURN.
    ENDIF.

    lt_root_key = VALUE #( FOR ls_b IN lt_before ( key = ls_b-root_key ) ).
    SORT lt_root_key BY key.
    DELETE ADJACENT DUPLICATES FROM lt_root_key COMPARING key.

    io_read->retrieve_by_association(
      EXPORTING
        iv_node        = /iam/if_i_issue_c=>sc_node-root
        it_key         = lt_root_key
        iv_association = /iam/if_i_issue_c=>sc_association-root-party
        iv_fill_data   = abap_true
      IMPORTING
        et_data        = lt_party ).

    LOOP AT lt_before INTO DATA(ls_before).

      " Unchanged (same person, same role) -> fine
      READ TABLE lt_now INTO DATA(ls_now) WITH KEY key = ls_before-key.
      IF sy-subrc = 0
         AND ls_now-bupa_uuid       = ls_before-bupa_uuid
         AND ls_now-party_role_code = ls_before-party_role_code.
        CONTINUE.
      ENDIF.

      " Changed or removed: admin or Area Manager of this MOC?
      DATA(lt_am_partner) = VALUE bu_partner_t(
        FOR ls_p IN lt_party
        WHERE ( root_key = ls_before-root_key
            AND party_role_code = zcl_moc_owner_service=>gc_role_area_manager )
        ( ls_p-partner_id ) ).

      IF zcl_moc_owner_service=>is_owner_edit_allowed( lt_am_partner ) = abap_true.
        CONTINUE.
      ENDIF.

      IF eo_message IS NOT BOUND.
        eo_message = /bobf/cl_frw_factory=>get_message( ).
      ENDIF.
      eo_message->add_message(
        is_msg  = VALUE #( msgty = 'E'
                           msgid = zcl_moc_owner_service=>gc_msgid
                           msgno = '037' )
        iv_node = /iam/if_i_issue_c=>sc_node-party
        iv_key  = ls_before-key ).
      APPEND VALUE #( key = ls_before-key ) TO et_failed_key.

      CLEAR ls_now.
    ENDLOOP.

  ENDMETHOD.

ENDCLASS.
```

### 3c. Register the validation (BOBX)

1. `ZMOC_ISSUE_ENH` → node **PARTY** → **Validations** → **Create Validation**.
   * Name `ZZ_CHECK_MOC_OWNER`, class `ZCL_MOC_V_OWNER_LOCK`
   * Category *Consistency check*
2. Trigger conditions: `PARTY` – **Update**, **Delete**.
3. Assign it to the same consistency group as `ZZ_CHECK_SCOPE_LOCK`, so a failed check stops the save.
4. Check → Save → Activate → regenerate the constants interface.

### Test Step 3

| # | Action | Expected |
|---|--------|----------|
| 1 | Normal user: saved MOC → select MOC Owner row → Remove → Save | Error 037, save rejected |
| 2 | Area Manager of the MOC: same as test 1 | Allowed |
| 3 | Admin: change MOC Owner → Save | Allowed |
| 4 | Normal user: new MOC, save first time | No error (Owner = Initiator from Step 1) |
| 5 | Normal user: change something else (description, dates) → Save | No error |

---

## Objects and transport

| Object | Type | New / changed |
|--------|------|---------------|
| `ZCL_MOC_OWNER_SERVICE` | Class | new |
| `ZCL_MOC_D_DEFAULT_OWNER` | Class | new |
| `ZCL_MOC_V_OWNER_LOCK` | Class | new |
| `ZMOC_ISSUE_ENH` | BOPF enhancement | changed (+ determination, + validation on PARTY) |
| `ZENH_MOC_PREGATE_SUBACVTY` | Enhancement implementation | changed (one inserted block) |
| `ZMOC_MSG` 037 | Message | new |

All are workbench objects (cross-client): no SCC1N is needed between clients 120 and 130.
