sap.ui.define([
	"sap/ui/core/mvc/Controller",

], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.secondpage", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.secondpage
		 */
		// onInit: function() {

		// },

		onnotify: function() {

			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPM_ODATA_RA_SRV/");
			this.getView().setModel(oModel, "az");
			var oData = this.getView().getModel("az");
			var data = {
				notification: []
			};

			var oModel = new sap.ui.model.json.JSONModel();

			var oTable = this.getView().byId("notificationtable");

			var oUserModel = this.getView().getModel("plantmodel");

			var obj = oUserModel.getData();
			var plant = obj.plant;

			var uri = "?$filter=Plangroup eq '010' and Planplant eq '" + plant + "' and NotificationDate eq datetime'2022-01-01T00:00:00'";

			oData.read("/notifylistSet" + uri + "", {
				success: function(oData, response) {

					for (var i = 0; i < oData.results.length; i++) {
						data.notification.push(oData.results[i]);
					}
					oModel.setData(data);
					oTable.setModel(oModel);

				},
				error: function(err) {

					sap.m.MessageToast.show("Something Went Wrong");
				}
			});
		},

		onsearch: function(oEvent) {
			var oList = this.getView().byId("notificationtable");

			var oItemBinding = oList.getBinding("items");

			var sValue = oEvent.oSource.getValue();
			if (sValue === "" || sValue === null || sValue === undefined) {
				oItemBinding.filter([]);
				return;
			}

			var oWorkorderFilter = new sap.ui.model.Filter("Notificat", sap.ui.model.FilterOperator.Contains, sValue);

			oItemBinding.filter(oWorkorderFilter);
		},

		onwrkorder: function() {
			var route = sap.ui.core.UIComponent.getRouterFor(this);
			route.navTo("workorder");
		},

		onrow: function(oEvent) {
			var obj = oEvent.oSource.getSelectedItem().getBindingContext().getObject();
			var notifyno = obj.Notificat;

			var notifydetail = new sap.ui.model.json.JSONModel();

			var odata = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPM_ODATA_RA_SRV/");
			this.getView().setModel(odata);

			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment("portalnew.Frangments.notification", this);

			}
			this.oDialog.setModel(notifydetail);
			odata.read("/notifydetailSet('" + notifyno + "')", {
				success: function(odata, oresponse) {
					notifydetail.setData(odata);
				},

				error: function(err) {
					sap.m.MessageToast.show("Something Went Wrong");
				}

			});
			this.oDialog.open();
		},
		onclose: function() {
			this.oDialog.close();
		},

		onFilterSelect: function(oEvent) {
			var filter = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPM_ODATA_RA_SRV/");
			this.getView().setModel(filter);
			var oBinding = this.byId("notificationtable").getBinding("items"),
				sKey = oEvent.getParameter("key");

			var afilter = [];
			if (sKey === 'Ok') {

				var onotifyFilter = new sap.ui.model.Filter("SStatus", sap.ui.model.FilterOperator.Contains, "OSNO");

			}

			if (sKey === 'notok') {

				var onotifyFilter = new sap.ui.model.Filter("SStatus", sap.ui.model.FilterOperator.Contains, "NOPR ORAS");
			}

			oBinding.filter(onotifyFilter);
		},

		onAfterRendering: function() {
			var onamemodel = new sap.ui.model.json.JSONModel();
			var oUser = this.getView().getModel("plantmodel");
			var obj = oUser.getData();
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

		onhome: function() {
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment("portalnew.Frangments.logout", this);

			}
			this.oDialog.open();

		},
		onlog5: function() {
			var route = sap.ui.core.UIComponent.getRouterFor(this);
			route.navTo("loginpage");

		},
		oncancel: function() {
			this.oDialog.close();
		}

	});

});