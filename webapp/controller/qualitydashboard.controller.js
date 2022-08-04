sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.qualitydashboard", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.qualitydashboard
		 */
		//	onInit: function() {
		//
		//	},
oninspect: function()
{
		var route = sap.ui.core.UIComponent.getRouterFor(this);
	route.navTo("inspectionlot");
},
	onlogout2: function() {

			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment("portalnew.Frangments.logout", this);

			}
			this.oDialog.open();

		},

		onlogout: function() {
			var route = sap.ui.core.UIComponent.getRouterFor(this);
			route.navTo("qualitylogin");
		},
		oncancel: function() {
			this.oDialog.close();
		},
		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf portalnew.view.qualitydashboard
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf portalnew.view.qualitydashboard
		 */
			onAfterRendering: function() {
			var ousermodel = this.getView().getModel("shopmodel");
			var obj = ousermodel.getData();

			var profile = obj.name;
			var name = this.getView().byId("name");
			name.setText(profile);
			},
				onuser: function(){
			var userdata = this.getView().getModel("shopmodel");
			
			if(!this.oDialoguser){
					this.oDialoguser = sap.ui.xmlfragment("portalnew.Frangments.Userdetails", this);
			}
			this.oDialoguser.setModel(userdata);
			this.oDialoguser.open();
			
		},
		oncloseuser: function()
		{
				this.oDialoguser.close();
		},
		onusage: function(){
			var route3 = sap.ui.core.UIComponent.getRouterFor(this);
	route3.navTo("qualityusage");
		}

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf portalnew.view.qualitydashboard
		 */
		//	onExit: function() {
		//
		//	}

	});

});