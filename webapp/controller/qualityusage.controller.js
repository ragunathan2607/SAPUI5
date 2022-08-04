sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.qualityusage", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.qualityusage
		 */
		//	onInit: function() {
		//
		//	},
	onInit: function() {
		var service = "/sap/opu/odata/sap/ZYA_QM2_ODATA_SRV/";
            var oModel = new sap.ui.model.odata.ODataModel(service, true);
            //Inspection Lot
            var Resrec;
            oModel.read("/usagedecisionSet", {
                context: null,
                urlParameters: null,
                async: false,
                success: function(oData, oResponse) {
                    window.console.log(oData);
                    window.console.log(oData.results);
                    Resrec = oData.results;
                }
            });
            var ooModel = new sap.ui.model.json.JSONModel(Resrec);
            this.getView().setModel(ooModel, "UD");
			}
		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf portalnew.view.qualityusage
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf portalnew.view.qualityusage
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf portalnew.view.qualityusage
		 */
		//	onExit: function() {
		//
		//	}

	});

});