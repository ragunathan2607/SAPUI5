sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.EHSMincident", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.EHSMincident
		 */
		//	onInit: function() {
		//
		//	},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf portalnew.view.EHSMincident
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf portalnew.view.EHSMincident
		 */
			onAfterRendering: function() {
					var odata = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZEHSM_ODATA_RA_SRV/");
			this.getView().setModel(odata);
			var data = {
				Incident: []
			
			};

			var otable = this.getView().byId("incidenttable");
		

			var omodel = new sap.ui.model.json.JSONModel();
			omodel.setData(data);

			var ousermodel = this.getView().getModel("shopmodel");
			var obj = ousermodel.getData();
			var plant = obj.plant;
			var profile = obj.name;
			var name = this.getView().byId("name");
			name.setText(profile);
			var uri = "?$filter=Plant eq '" + plant + "'";

			odata.read("/incidentlistSet" + uri + "", {
				success: function(oData, response) {
					window.console.log(oData);
					window.console.log(response);
					for (var i = 0; i <= oData.results.length; i++) {
						data.Incident.push(oData.results[i]);
					}
					otable.setModel(omodel);
				
				},
					error: function(err) {
					window.console.log("error");
					sap.m.MessageToast.show("Something Went Wrong");
				}

			});

		},
		onrow: function(oEvent) {
			var obj = oEvent.oSource.getSelectedItem().getBindingContext().getObject();
			window.console.log(obj);
		
			var Recnum = obj.Recn;
			var orderdetail = new sap.ui.model.json.JSONModel();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZEHSM_ODATA_RA_SRV/");
			this.getView().setModel(oModel);
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment("portalnew.Frangments.Incident", this);
				// var aModel = new sap.ui.model.json.JSONModel(obj);
				// var aModel = new sap.ui.model.odata.ODataModel(obj);
				// this.oDialog.setModel(aModel);
				// window.console.log(aModel);
			}
			this.oDialog.setModel(orderdetail);
			oModel.read("/incidentdetailSet('" + Recnum  + "')", {
				success: function(oData, response) {
					window.console.log("oData", oData);
					window.console.log("response", response);
					orderdetail.setData(oData);
					window.console.log(orderdetail);
				},
				error: function(err) {
					window.console.log("error");
					sap.m.MessageToast.show("Something Went Wrong");
				}
			});
			// this.oDialog.getModel().setData(obj);
			this.oDialog.open();
		},
		
		onclose: function()
		{
			this.oDialog.close();
		},
			onhome:function(){
				history.go(-1);
		}
		
			

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf portalnew.view.EHSMincident
		 */
		//	onExit: function() {
		//
		//	}

	});

});