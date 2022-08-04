sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function(Controller, MessageBox, MessageToast) {
	"use strict";

	return Controller.extend("portalnew.controller.loginpage", {
		onnav: function() {
			var route = sap.ui.core.UIComponent.getRouterFor(this);
			route.navTo("landingpage");
		},

		onlog: function() {
			var empid = this.getView().byId("empid").getValue();
			var password = this.getView().byId("pswrd").getValue();

			if (empid !== "" && password !== "") {

				var url = "/sap/opu/odata/sap/ZPM_ODATA_RA_SRV/";

				var omodel = new sap.ui.model.odata.ODataModel(url, true);
				var uri = "Userid='" + empid + "',Password='" + password + "'";
				var route = sap.ui.core.UIComponent.getRouterFor(this);

				var jsmodel = this.getView().getModel("plantmodel");

				omodel.read("/loginSet(" + uri + ")", {

					context: null,
					urlParameter: null,
					async: false,

					success: function(odata, oresponse) {

						var data1 = oresponse.data;

						var userdata = {
							plant: data1.MessageV1,
							id: data1.Userid,
							name: data1.MessageV2
						};

						jsmodel.setData(userdata);

						if (odata.Message === 'success') {
							route.navTo("secondpage");
							sap.m.MessageToast.show("welcome to portal");
						} else if (data1.Message === "ivalid email or password") {
							sap.m.MessageToast.show("Invalid Email or Password");
						}
					},

					error: function(error) {
						window.console.log(error);
						sap.m.MessageToast.show("Something went wrong");
					}

				});
			} else {
				sap.m.MessageBox.alert("Enter all Fields");
			}
		},
		onclear: function() {
			var empid = this.getView().byId("empid").setValue("");
			var pass = this.byId("pswrd").setValue("");
		},

	});

});