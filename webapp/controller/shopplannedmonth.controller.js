sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.shopplannedmonth", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.shopplannedmonth
		 */
		//	onInit: function() {
		//
		//	},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf portalnew.view.shopplannedmonth
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf portalnew.view.shopplannedmonth
		 */
		onAfterRendering: function() {
			var odata = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPP_ODATA_RA_SRV/");
			this.getView().setModel(odata);
			var data = {
				Plannedorder: [],
				Month: [{
					MonthNo: "",
					MonthName: "Select a Month from the list"
				}, {
					MonthNo: "01",
					MonthName: "January"
				}, {
					MonthNo: "02",
					MonthName: "February"
				}, {
					MonthNo: "03",
					MonthName: "March"
				}, {
					MonthNo: "04",
					MonthName: "April"
				}, {
					MonthNo: "05",
					MonthName: "May"
				}, {
					MonthNo: "06",
					MonthName: "June"
				}, {
					MonthNo: "07",
					MonthName: "July"
				}, {
					MonthNo: "08",
					MonthName: "August"

				}, {
					MonthNo: "09",
					MonthName: "September"
				}, {
					MonthNo: "10",
					MonthName: "October"
				}, {
					MonthNo: "11",
					MonthName: "November"
				}, {
					MonthNo: "12",
					MonthName: "December"
				}]
			};

			var otable = this.getView().byId("plannedordermon");
			var monthlist = this.getView().byId("MonthDropdown");

			var omodel = new sap.ui.model.json.JSONModel();
			omodel.setData(data);

			var ousermodel = this.getView().getModel("shopmodel");
			var obj = ousermodel.getData();
			var plant = obj.plant;
			var profile = obj.name;
			var name = this.getView().byId("name");
			name.setText(profile);
			var uri = "?$filter=Plant eq '" + plant + "'";

			odata.read("/plannedorderlistSet" + uri + "", {
				success: function(oData, response) {
					window.console.log(oData);
					window.console.log(response);
					for (var i = 0; i <= oData.results.length; i++) {
						data.Plannedorder.push(oData.results[i]);
					}
					otable.setModel(omodel);
					monthlist.setModel(omodel);
				}

			});

		},
		onrow: function(oEvent) {
			var obj = oEvent.oSource.getSelectedItem().getBindingContext().getObject();
			window.console.log(obj);
		
			var ordernum = obj.PlannedorderNum;
			var orderdetail = new sap.ui.model.json.JSONModel();
			var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPP_ODATA_RA_SRV/");
			this.getView().setModel(oModel);
			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment("portalnew.Frangments.plannedorder", this);
				// var aModel = new sap.ui.model.json.JSONModel(obj);
				// var aModel = new sap.ui.model.odata.ODataModel(obj);
				// this.oDialog.setModel(aModel);
				// window.console.log(aModel);
			}
			this.oDialog.setModel(orderdetail);
			oModel.read("/plannedorderdetailSet('" + ordernum + "')", {
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
		onsearch: function(oEvent) {
			var oList = this.getView().byId("plannedordermon");
			window.console.log("oList");
			window.console.log(oList);
			var oItemBinding = oList.getBinding("items");
			window.console.log("oItemBinding");
			window.console.log(oItemBinding);
			var sValue = oEvent.oSource.getValue();
			if (sValue === "" || sValue === null || sValue === undefined) {
				oItemBinding.filter([]);
				return;
			}
			window.console.log(sValue);
			// var oEmailFilter = new sap.ui.model.Filter("Zemail", sap.ui.model.FilterOperator.Contains, sValue);
			var ordernumberFilter = new sap.ui.model.Filter("PlannedorderNum", sap.ui.model.FilterOperator.Contains, sValue);

			// var oFilter = new sap.ui.model.Filter([oEmailFilter, oIdFilter], false);
			
			oItemBinding.filter(ordernumberFilter);
		},
		onChange: function(oEvent) {
			var sValue = oEvent.getParameters().selectedItem.mProperties.key;
			window.console.log(sValue);
			// window.console.log(oEvent.getParameters("Key"));

			var oList = this.getView().byId("plannedordermon");
			window.console.log("oList");
			window.console.log(oList);
			var oItemBinding = oList.getBinding("items");
			window.console.log("oItemBinding");
			window.console.log(oItemBinding);
			if (sValue === "" || sValue === null || sValue === undefined) {
				oItemBinding.filter([]);
				return;
			}
			window.console.log(sValue);
			var oMonthFilter = new sap.ui.model.Filter("PlanOpenDate", sap.ui.model.FilterOperator.Contains, "-" + sValue + "-");
			oItemBinding.filter(oMonthFilter);
		},
		onlogout2: function() {

			if (!this.oDialog) {
				this.oDialog = sap.ui.xmlfragment("portalnew.Frangments.logout", this);

			}
			this.oDialog.open();

		},

		onlogout: function() {
			var route = sap.ui.core.UIComponent.getRouterFor(this);
			route.navTo("shopfloor_login");
		},
		oncancel: function() {
				this.oDialog.close();
			},
		onhome:function(){
				history.go(-1);
		}
			/**
			 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
			 * @memberOf portalnew.view.shopplannedmonth
			 */
			//	onExit: function() {
			//
			//	}

	});

});