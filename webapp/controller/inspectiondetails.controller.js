sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.inspectiondetails", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.inspectiondetails
		 */
		//	onInit: function() {
		//
		//	},
		onSelectTab: function() {

			var selectedtab = this.getView().byId("InspectionDetailTabHeader");
			var tab = selectedtab.mProperties.selectedKey;

			window.console.log(tab);
			if (tab === "detail") {
				this.onEnableTabData();
				this.getView().byId("insplotdetailsection").setVisible(true);
			} else if (tab === "operation") {
				this.onEnableTabData();
				this.getView().byId("insplotoperationsection").setVisible(true);
			} else if (tab === "result") {
				this.onEnableTabData();
				this.getView().byId("resultrecordssection").setVisible(true);
			}
		},
		onEnableTabData: function() {
			this.getView().byId("insplotdetailsection").setVisible(false);
			this.getView().byId("insplotoperationsection").setVisible(false);
			this.getView().byId("resultrecordssection").setVisible(false);
		},
			onnav: function() {
			var route = sap.ui.core.UIComponent.getRouterFor(this);
			route.navTo("inspectionlot");
		},
		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf portalnew.view.inspectiondetails
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf portalnew.view.inspectiondetails
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf portalnew.view.inspectiondetails
		 */
		//	onExit: function() {
		//
		//	}

	});

});