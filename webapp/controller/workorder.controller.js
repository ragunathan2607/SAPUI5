sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.workorder", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.workorder
		 */
		//	onInit: function() {
		//
		//	},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf portalnew.view.workorder
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf portalnew.view.workorder
		 */
		onAfterRendering: function() {

			var odata = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPM_ODATA_RA_SRV/");
			this.getView().setModel(odata);
			var data = {
				workorder: []
			};

			var otable = this.getView().byId("workordertable");

			var omodel = new sap.ui.model.json.JSONModel();
			omodel.setData(data);

			var ousermodel = this.getView().getModel("plantmodel");
			var obj = ousermodel.getData();
			var plant = obj.plant;
			var profile = obj.name;
			var name = this.getView().byId("name");
			name.setText(profile);
			var uri = "?$filter=Plant eq '" + plant + "'";

			odata.read("/worklistSet" + uri + "", {
				success: function(oData, response) {

					for (var i = 0; i <= oData.results.length; i++) {
						data.workorder.push(oData.results[i]);
					}
					otable.setModel(omodel);

				}

			});

		},
		onsearch: function(oEvent) {
			var oList = this.getView().byId("workordertable");

			var oItemBinding = oList.getBinding("items");

			var sValue = oEvent.oSource.getValue();
			if (sValue === "" || sValue === null || sValue === undefined) {
				oItemBinding.filter([]);
				return;
			}

			// var oEmailFilter = new sap.ui.model.Filter("Zemail", sap.ui.model.FilterOperator.Contains, sValue);
			var oWorkorderFilter = new sap.ui.model.Filter("Orderid", sap.ui.model.FilterOperator.Contains, sValue);

			// var oFilter = new sap.ui.model.Filter([oEmailFilter, oIdFilter], false);

			oItemBinding.filter(oWorkorderFilter);
		},

		onrow: function(oEvent) {
			var obj = oEvent.oSource.getSelectedItem().getBindingContext().getObject();

			var orderid = obj.Orderid;
			var orderdetail = new sap.ui.model.json.JSONModel();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPM_ODATA_RA_SRV/");
			this.getView().setModel(oModel);
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment("portalnew.Frangments.workorder", this);
				// var aModel = new sap.ui.model.json.JSONModel(obj);
				// var aModel = new sap.ui.model.odata.ODataModel(obj);
				// this.oDialog.setModel(aModel);
				// window.console.log(aModel);
			}
			this.oDialog.setModel(orderdetail);
			oModel.read("/WorkdetailSet('" + orderid + "')", {
				success: function(oData, response) {

					orderdetail.setData(oData);

				},
				error: function(err) {

					sap.m.MessageToast.show("Something Went Wrong");
				}
			});
			// this.oDialog.getModel().setData(obj);
			this.oDialog.open();
		},

		onclose: function() {
			this.oDialog.close();
		},

		onlogout2: function() {
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment("portalnew.Frangments.logout", this);

			}
			this.oDialog.open();
		},
		onlogout: function() {
			var route = sap.ui.core.UIComponent.getRouterFor(this);
			route.navTo("loginpage");
		},
		oncancel: function() {
			this.oDialog.close();
		},
		// onhome: function(){
		// 	history.go(-1);
		// }
		onhome: function() {

				history.go(-1);
			}
			/**
			 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
			 * @memberOf portalnew.view.workorder
			 */
			//	onExit: function() {
			//
			//	}

	});

});