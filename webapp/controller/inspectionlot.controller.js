sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.inspectionlot", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.inspectionlot
		 */
		//	onInit: function() {
		//
		//	},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf portalnew.view.inspectionlot
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf portalnew.view.inspectionlot
		 */
		onAfterRendering: function() {
			var odata = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZQUALITY_ODATA_RA_SRV/");
			this.getView().setModel(odata);
			var data = {
				inspection: []
			};

			var otable = this.getView().byId("inspectiontable");

			var omodel = new sap.ui.model.json.JSONModel();
			omodel.setData(data);

			var ousermodel = this.getView().getModel("shopmodel");
			var obj = ousermodel.getData();
			var plant = obj.plant;
			var profile = obj.name;
			var name = this.getView().byId("name");
			name.setText(profile);
			var uri = "?$filter=Plant eq '" + plant + "'";

			odata.read("/inspectionlotlistSet" + uri + "", {
				success: function(oData, response) {
					window.console.log(oData);
					window.console.log(response);
					for (var i = 0; i <= oData.results.length; i++) {
						data.inspection.push(oData.results[i]);
					}
					otable.setModel(omodel);

				}

			});
		},
		onrow: function(oEvent) {

			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var obj = oEvent.oSource.getSelectedItem().getBindingContext().getObject();
			window.console.log(obj);
			window.console.log(obj.Insplot);
			var insplot = obj.Insplot;
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZQUALITY_ODATA_RA_SRV/");
			var oInsplotDetail = this.getView().getModel("insdetailmodel");
			var oInsplotOperation = this.getView().getModel("insopertmodel");

			oModel.read("/inspectdetailSet('" + insplot + "')", {
				success: function(oData, response) {
					window.console.log("detail oData", oData);
					window.console.log("detail response", response);
					oInsplotDetail.setData(oData);
				},
				error: function(err) {
					window.console.log("error");
					sap.m.MessageToast.show("Something Went Wrong");
				}
			});
			oModel.read("/inspect_oplistSet('" + insplot + "')", {
				success: function(oData, response) {
					window.console.log("operation oData", oData);
					window.console.log("operation response", response);
					oInsplotOperation.setData(oData);
				},
				error: function(err) {
					window.console.log("error");
					sap.m.MessageToast.show("Something Went Wrong");
				}
			});
			window.console.log("oInsplotDetail:", oInsplotDetail);
			window.console.log("oInsplotOperation:", oInsplotOperation);

			oRouter.navTo("inspectiondetails");
		},
		onhome: function(){
			var route3 = sap.ui.core.UIComponent.getRouterFor(this);
	route3.navTo("qualitydashboard");
		}

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf portalnew.view.inspectionlot
		 */
		//	onExit: function() {
		//
		//	}

	});

});