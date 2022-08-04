sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.shopplannedyear", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.shopplannedyear
		 */
		//	onInit: function() {
		//
		//	},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf portalnew.view.shopplannedyear
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf portalnew.view.shopplannedyear
		 */
		onAfterRendering: function() {
			var odata = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZPP_ODATA_RA_SRV/");
			this.getView().setModel(odata);
			var data = {
				Plannedorder: [],
				Year: [{
					yearkey: "",
					year: "Select a Year from the list"
				}, {
					yearkey: "2010",
					year: "2010"
				}, {
					yearkey: "2011",
					year: "2011"
				}, {
					yearkey: "2012",
					year: "2012"
				}, {
					yearkey: "2013",
					year: "2013"
				}, {
					yearkey: "2014",
					year: "2014"
				}, {
					yearkey: "2015",
					year: "2015"
				}, {
					yearkey: "2016",
					year: "2016"
				}, {
					yearkey: "2017",
					year: "2017"
				}, {
					yearkey: "2018",
					year: "2018"
				}, {
					yearkey: "2019",
					year: "2019"
				}, {
					yearkey: "2020",
					year: "2020"
				}, {
					yearkey: "2021",
					year: "2021"
				}, {
					yearkey: "2022",
					year: "2022"
				}, {
					yearkey: "2023",
					year: "2023"
				}, {
					yearkey: "2024",
					year: "2024"
				}, {
					yearkey: "2025",
					year: "2025"
				}, {
					yearkey: "2026",
					year: "2026"
				}]
			};

			var otable = this.getView().byId("plannedorderlist");
			var yearlist = this.getView().byId("yearDropdown");

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
					yearlist.setModel(omodel);
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
			var oList = this.getView().byId("plannedorderlist");
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

			var oList = this.getView().byId("plannedorderlist");
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
			var oyearFilter = new sap.ui.model.Filter("PlanOpenDate", sap.ui.model.FilterOperator.Contains, +sValue + "-");
			oItemBinding.filter(oyearFilter);
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
			 * @memberOf portalnew.view.shopplannedyear
			 */
			//	onExit: function() {
			//
			//	}

	});

});