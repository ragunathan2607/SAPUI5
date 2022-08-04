sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function(Controller, MessageBox, MessageToast) {
	"use strict";

	return Controller.extend("portalnew.controller.qualitylogin", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf portalnew.view.qualitylogin
		 */
		//	onInit: function() {
		//
		//	},
	onlog: function()
		{
			var userid = this.getView().byId("userid").getValue();
			var password = this.getView().byId("pswrd").getValue();
			window.console.log(userid,password);
			
			if(userid !=""&&password!="")
			{
				window.console.log("inside if");
				var url="/sap/opu/odata/sap/ZQUALITY_ODATA_RA_SRV/";
				
				var omodel=new sap.ui.model.odata.ODataModel(url,true);
				var uri="Userid='"+userid+"',Password='"+password+"'";
				var route = sap.ui.core.UIComponent.getRouterFor(this);
				var status;
				window.console.log(uri);
				
				var jsmodel = this.getView().getModel("shopmodel");
				
				omodel.read("/qualityloginSet("+uri+")",{
					
					context: null,
					urlParameter: null,
					async: false,
					
					success: function(odata,oresponse)
					{
						     
					window.console.log(oresponse);
						window.console.log(odata);
						
						var data1 = oresponse.data;
					
						window.console.log(data1);
						// var cdata = data.Return;
						
						
						// window.console.log(cdata);
						// // if(status == "OK")
						// // {
						// // 	route.navTo("secondpage");
						// // 	sap.m.MessageToast.show("welcome to portal");
						// // }
							var userdata = {
							plant:data1.MessageV1,
							id:data1.Userid,
							name:data1.MessageV2
						};
						
						jsmodel.setData(userdata);
						
						
						window.console.log(odata.Message);
						
						if(odata.Message === 'success')
						{
							route.navTo("qualitydashboard");
							sap.m.MessageToast.show("welcome to portal");
						}
						else if(data1.Message === 'ivalid email or password')
						{
							sap.m.MessageToast.show("invalid email or password");
						}
					},
					
					error: function(error)
					{
						window.console.log(error);
							sap.m.MessageToast.show("Something went wrong");
					}
					
				});
				}
				else
				{
					sap.m.MessageBox.alert("enter all fields");
				}
			},
			onnav: function() {
			var route = sap.ui.core.UIComponent.getRouterFor(this);
			route.navTo("landingpage");
		},
		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf portalnew.view.qualitylogin
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf portalnew.view.qualitylogin
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf portalnew.view.qualitylogin
		 */
		//	onExit: function() {
		//
		//	}

	});

});