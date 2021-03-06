Google = new function(){

	var UNPAID = 0;
	var PAID = 2;

	var result = null;
	var ind = -1;
	var parent = null;
	var tests = null;
	var challan = null;
	var chalind = -1;
	var cList = null;
	var isPay = false;

	this.setClassList = function(data){
		cList = data;

		var text = "";
		for(var i=0; i<cList.length; i++)
			text += "<option>" + cList[i].TITLE + "</option>";
		$("#cList").html(text);
	}

	this.displayResult = function(data){

		//clear previous result from user screen
		$("#search-result-tab").html("");

		//store search result locally
		result = data;

		if(data.length==0){

			this.displayMessageBox("No record found!");
			return;
		}

		var text = "<tr><th>INDEX</th><th class='hide'>REG #</th><th>NAME</th><th>CLASS</th>"
				 + "<th>SECTION</th><th>PARENT'S NAME</th><th>PHONE #</th><th>AMOUNT</th>"
				 + "<th class='hide'>VIEW</th><th class='hide'>RESULT</th><th class='hide'>FEE</th></tr>";
		for(var i=0; i<data.length; i++){
			text += "<tr>";
			text += "<td class='center'><span>" + (i+1) + "</span></td>";
			text += "<td class='hide'><span>" + data[i].REG_NO + "</span></td>";
			text += "<td><span>" + data[i].NAME + "</span></td>";
			var isClass = false;
			for(var j=0; j<cList.length; j++){
				if(cList[j].ID==data[i].CLASS){
					text += "<td><span>" + cList[j].TITLE + "</span></td>";
					isClass = true;
					break;
				}
			}
			if(isClass==false)
				text += "<td><span></span></td>";
			text += "<td class='center'><span>" + data[i].SECTION + "</span></td>";
			text += "<td><span>" + data[i].PARENT + "</span></td>";
			text += "<td><span>" + data[i].PHONE + "</span></td>";
			text += "<td><span>" + data[i].TUITION + "/-</span></td>";
			text += "<td class='hide'>" + "<input class='table-btn detail-btn-class' type='button' value='Info'/>" + "</td>";
			text += "<td class='hide'>" + "<input class='table-btn result-btn-class' type='button' value='Result'/>" + "</td>";
			text += "<td class='hide'>" + "<input class='table-btn fee-btn-class' type='button' value='Fee'/>" + "</td>";
			text += "</tr>";
		}

		$("#search-result-tab").html(text);

		$(".detail-btn-class").each(function(){
			$(this).click(function(){
				ind = $(this).closest('tr').index() - 1;
				var id = result[ind].P_ID;
				$.ajax({
					url: '/student_detail',
					type: "get",
					data : { pid: id},
					success: function(response){
						if(response.code==200){
							parent = response.data[0];
							$("#student-name").val(result[ind].NAME);
							if(result[ind].DOB==null)
								$("#student-dob").val("");
							else
								$("#student-dob").val(toInputFormat(new Date(result[ind].DOB)));
							$("#student-reg").val(result[ind].REG_NO);

							$("#student-class").val("");
							for(var j=0; j<cList.length; j++){
								if(cList[j].ID==result[ind].CLASS){
									$("#student-class").val(cList[j].TITLE);
								}
							}
							
							$("#student-section").val(result[ind].SECTION);
							$("#parent-name").val(parent.NAME);
							$("#parent-cnic").val(parent.CNIC);
							$("#student-phone").val(parent.PHONE);
							$("#student-address").val(parent.ADDRESS);
							$("#student-tuition").val(result[ind].TUITION);
							$("#student-transport").val(result[ind].TRANSPORT);
							$("#student-div").show();
						}
						else{
							alert("404");
						}
					}
				});
			});
		});

		$(".result-btn-class").each(function(){

			$(this).click(function(){
				ind = $(this).closest('tr').index() - 1;
				getResult();
			});
		});

		$(".fee-btn-class").each(function(){

			$(this).click(function(){
				ind = $(this).closest('tr').index() - 1;
				getFeeHistory();
			});
		});
	}

	var getResult = function(){
		$.ajax({
			url: "/student_result",
			type: "get",
			data : { id: result[ind].ID},
			success: function(response){
				if(response.code==200){
					console.log(response.data);
					displayTests(response.data);
				}
				else{
					alert("404");
				}
			}
		});
	}

	var displayTests = function(data){


		tests = data;

		if(data.length==0){
			Google.displayMessageBox("No result found!");
			return;
		}

		var sub = [];
		var ass = [];

		for(var i=0; i<tests.length; i++){

			var found = false;
			for(var j=0; j<sub.length; j++){
				if(sub[j]==tests[i].NAME){
					found = true;
					break;
				}
			}
			if(!found){
				sub.push(tests[i].NAME);
			}

			found = false;
			for(var j=0; j<ass.length; j++){
				if(ass[j]==tests[i].TYPE){
					found = true;
					break;
				}
			}
			if(!found){
				ass.push(tests[i].TYPE);
			}
		}

		var cols = ["SUBJECT"];
		var assum = [];
		var assob = [];
		for(var i=0; i<ass.length; i++){
			cols.push(ass[i]);
			assum.push(0);
			assob.push(0);
		}
		cols.push("TOTAL");
		cols.push("PERCENTAGE");

		var text = "<table id='student-result-tab'>";
		text += "<tr>";
		for(var i=0; i<cols.length; i++)
			text += "<th>" + cols[i] + "</th>";
		text += "</tr>";

		for(var i=0; i<sub.length; i++){
			text += "<tr>";

			text += "<td>" + sub[i] + "</td>";

			var sum = 0;
			var total = 0;
			for(var j=0; j<ass.length; j++){

				text += "<td class='center'>";

				for(var k=0; k<tests.length; k++){
					if(tests[k].NAME==sub[i] && tests[k].TYPE==ass[j]){

						text += tests[k].OBTAINED + "/" + tests[k].TOTAL_MARKS;
						sum += tests[k].OBTAINED;
						assob[j] += tests[k].OBTAINED;
						total += tests[k].TOTAL_MARKS;
						assum[j] += tests[k].TOTAL_MARKS;
						break;
					}
				}

				text += "</td>";
			}

			text += "<td class='center'>"+ sum + "/" + total + "</td>";
			text += "<td class='center'>"+ ((sum*100)/total).toFixed(2) +"</td>";

			text += "</tr>";
		}

		text += "<tr>";

		text += "<td>TOTAL:-</td>";
		var cumtotal = 0;
		var cumobt = 0;
		for(var i=0; i<assum.length; i++){

			text += "<td class='center'>" + assob[i] + "/" + assum[i] + "</td>";
			cumtotal += assum[i];
			cumobt += assob[i];
		}

		text += "<td class='center'>"+cumobt+"/"+cumtotal+"</td>";
		text += "<td class='center'>"+((cumobt*100)/cumtotal).toFixed(2)+"</td>";

		text += "</tr>";

		text += "</table>";

		$("#student-result-div").html(text);
		$("#student-result-container").show();
	}

	var getFeeHistory = function(){
		$.ajax({
			url: "/student_fee_history",
			type: "get",
			data : { id: result[ind].ID},
			success: function(response){
				if(response.code==200){
					// console.log(response.data);
					displayChallans(response.data);
				}
				else{
					alert("404");
					Google.displayMessageBox("Could not retrieve fee history!");
				}
			}
		});
	}

	this.editStudentInfo = function(){

		$(".editable").each(function(){
			$(this).prop("readonly",false);
		});


		$("#edit-std-btn").unbind("click");
		$("#edit-std-btn").val("Save Changes");
		$("#del-std-btn").show();
		$("#del-std-btn").click(function(){

				if (confirm('Do you want to delete this student?')) {

					var object = {};
					object['STD_ID'] = result[ind].ID;
					$.ajax({
						url: "/delete_student_info",
						type: "post",
						data : object,
						success: function(response){
							if(response.code==200){
								// console.log(response.data);
								// alert("200");
								Google.displayMessageBox("Student is successfully deleted");
								$("#student-div").hide();
								$("#search-result-tab").html("");
							}
							else{
								Google.displayMessageBox("Could not delete student record");
							}
						}
					});
				}
				else
					return false;
		});
		$("#edit-std-btn").click(function(){

			var object = {};
			object['STD_ID'] = result[ind].ID;
			object['NAME'] = $("#student-name").val();
			object['DOB'] = $("#student-dob").val();
			object['REG_NO'] = $("#student-reg").val();
			var temp = $("#student-class").val().trim().toUpperCase();
			for(var i=0; i<cList.length; i++){
				if(cList[i].TITLE==temp){
					object['CLASS'] = cList[i].ID;
					break;
				}
			}
			// object['CLASS'] = $("#student-class").val();
			object['SECTION'] = $("#student-section").val();
			object['P_ID'] = parent.ID;
			object['PARENT'] = $("#parent-name").val();
			object['CNIC'] = $("#parent-cnic").val();
			object['PHONE'] = $("#student-phone").val();
			object['ADDRESS'] = $("#student-address").val();
			object['TUITION'] = $("#student-tuition").val();
			object['TRANSPORT'] = $("#student-transport").val();

			$.ajax({
				url: "/update_student_info",
				type: "post",
				data : object,
				success: function(response){
					if(response.code==200){
						// console.log(response.data);
						// alert("200");
						Google.displayMessageBox("Student information successfully updated");
					}
					else{
						Google.displayMessageBox("Could not update student info");
					}
				}
			});

			$(".editable").each(function(){
				$(this).prop("readonly",true);
			});


			$("#edit-std-btn").unbind("click");
			$("#edit-std-btn").val("Update Student Info");
			$("#edit-std-btn").click(Google.editStudentInfo);
		});
	}

	var displayChallans = function(data){
		challan = data;


		var text = "<tr><th>INDEX</th><th>FOR</th><th>AMOUNT DUE</th><th>DUE DATE</th><th>STATUS</th><th>VIEW</th></tr>";

		for(var i=0; i<data.length; i++){


			var status = "PAID";
			if(data[i].STATUS==0)
				status = "UNPAID";

			text += "<tr>";

			text += "<td>" + (i+1) + "</td>";
			// text += "<td>" + formatD(data[i].ST_MON)+" to "+ formatD(data[i].END_MON) + "</td>";
			text += "<td>" + convertToMonthRange(data[i]) + "</td>";
			text += "<td>" + totalFee(data[i]) + "</td>";
			text += "<td>" + formatD(data[i].DUE_DATE) + "</td>";
			text += "<td>" + status + "</td>";
			text += "<td>" + "<input class='view-result-class' type='button' value='View'/>" + "</td>";

			text += "</tr>";
		}

		if(data.length==0)
			Google.displayMessageBox("No previous record exists!");
		else
			$("#student-fee-tab").html(text);
		$("#student-fee-div").show();

		$(".view-result-class").each(function(){
			$(this).click(function(){
				chalind = $(this).closest('tr').index() - 1;
				// alert("index : "+chalind);
				displayDetailChallan();
			});
		});

		if(isPay){
			isPay = false;
			displayDetailChallan();
		}
	}

	var formatD = function(date){
		return new Date(date).toLocaleDateString();
	}

	var convertToMonthRange = function(data){

		var st = new Date(data.ST_MON).getMonth();
		var end = new Date(data.END_MON).getMonth();
		var monthNames = ["January", "February", "March", "April", "May", "June",
		  "July", "August", "September", "October", "November", "December"
		];

		if(st==end)
			return monthNames[st];
		else
			return monthNames[st] + "-" +  monthNames[end];
	}

	var totalFee = function(data){
		var due = 0;
		if(data.ADMISSION_FEE)
			due += data.ADMISSION_FEE;
		if(data.TUTION_FEE)
			due += data.TUTION_FEE;
		if(data.SECURITY)
			due += data.SECURITY;
		if(data.ANNUAL_FEE)
			due += data.ANNUAL_FEE;
		if(data.PROCESS_FEE)
			due += data.PROCESS_FEE;
		if(data.TRANSPORT)
			due += data.TRANSPORT;

		return due;
	}

	var displayDetailChallan = function(){

		$("#std-name-chal").html(result[ind].NAME);
		for(var j=0; j<cList.length; j++){
			if(cList[j].ID==result[ind].CLASS){
				$("#std-clas-chal").html(cList[j].TITLE);
			}
		}

		var fee = challan[chalind];
		$("#fee-for").html(convertToMonthRange(fee));
		$("#admission").html(toNone(fee.ADMISSION_FEE));
		$("#tution").html(toNone(fee.TUTION_FEE));
		$("#security").html(toNone(fee.SECURITY));
		$("#annual").html(toNone(fee.ANNUAL_FEE));
		$("#process").html(toNone(fee.PROCESS_FEE));
		$("#transport").html(toNone(fee.TRANSPORT));

		var money = 0;
		if(fee.STATUS==UNPAID)
			money = calculateFine(fee);
		var world = money;
		if(money==null || money==0)
			world = "None";
		$("#fine").html(world);

		var hello = totalFee(fee);
		if(money>0)
			hello += money;
		$("#amount-due").html(hello);

		$("#issue-date").html(formatD(fee.ISSUE_DATE));
		$("#due-date").html(formatD(fee.DUE_DATE));
		$("#pay-date").html(formatD(fee.PAY_DATE));
		$("#amount-paid").html(fee.AMOUNT_PAID);

		$("#invoice-id").val(fee.ID);
		$("#enter-date").val(getToday());

		var status;
		if(fee.STATUS==UNPAID){
			status = "UNPAID";
			$(".paid-rows").each(function(){
				$(this).hide();
			});

			$(".due-rows").each(function(){
				$(this).show();
			});

			$("#print-btn").hide();
		}
		else{
			status="PAID";
			$(".paid-rows").each(function(){
				$(this).show();
			});

			$(".due-rows").each(function(){
				$(this).hide();
			});

			$("#print-btn").show();
		}
		$("#status").html(status);

		$("#student-challan-div").show();
	}

	var toNone = function(number){

		if(isNaN(number) || number==undefined || number==null || number==0)
			return "None";
		return number;
	}

	var calculateFine = function(data){

		if(new Date() < new Date(data.DUE_DATE))
			return 0;
		var diff =  Math.floor(( Date.parse(new Date()) - Date.parse(data.DUE_DATE) ) / 86400000);
		return diff*10;
	}

	var getToday = function(){

		var date = new Date();
		return toInputFormat(date);
	}

	var toInputFormat = function(date){

		var day = date.getDate();
		var month = date.getMonth() + 1;
		var year = date.getFullYear();

		if (month < 10) month = "0" + month;
		if (day < 10) day = "0" + day;

		var today = year + "-" + month + "-" + day;
		return today;
	}

	this.paymentSuccess = function(){
		Google.displayMessageBox("Bill payed successfully");
		isPay = true;
		getFeeHistory();
	}

	this.showNewChallanForm = function(){
		$("#new-challan-div").show();
		$("#new-challan-student").val(result[ind].ID);
	}

	this.displayMessageBox = function(msg){

		$("#user-message").html(msg);
		$("#messagebox").show();
	}

	this.challanSuccess = function(){

		Google.displayMessageBox("New Challan Issued");
		getFeeHistory();
		$("#new-challan-div").hide();
	}
}


$(function(){

	$.ajax({
		url: "/get_classlist",
		type: "get",
		success: function(response){
			if(response.code==200){
				Google.setClassList(response.data);
			}
			else{
				alert("404");
			}
		}
	});

	$('#form').submit(function(){

		// var pkt = {};
		// pkt.name = $("#search-student-by-name");
		// if(pkt.name.length==0)
		// 	pkt.name = null;
		// pkt.reg_no = $("#search-student-by-reg");
		// if(pkt.reg_no.length==0)
		// 	pkt.reg_no = null;
		// pkt.class = $("#search-student-by-class");
		// if(pkt.class.length==0)
		// 	pkt.class = null;
		// pkt.section = $("#search-student-by-section");
		// if(pkt.section.length==0)
		// 	pkt.section = null;

		$.ajax({
			url: $('#form').attr('action'),
			type: "post",
			data : $('#form').serialize(),
			success: function(response){
				if(response.code==200){
					console.log(response.data);
					Google.setClassList(response.class);
					Google.displayResult(response.data);
				}
				else{
					alert("404");
				}
			}
		});
		return false;
	});

	$("#edit-std-btn").click(Google.editStudentInfo);

	$("#issue-challan").click(Google.showNewChallanForm);

	$('#new-challan-form').submit(function(){
		$.ajax({
			url: $('#new-challan-form').attr('action'),
			type: "post",
			data : $('#new-challan-form').serialize(),
			success: function(response){
				if(response.code==200){
					// console.log(response.data);
					Google.challanSuccess();
				}
				else{
					Google.displayMessageBox("Failed to issue new challan");
				}
			}
		});
		return false;
	});

	$('#payment-form').submit(function(){
		$.ajax({
			url: $('#payment-form').attr('action'),
			type: "post",
			data : $('#payment-form').serialize(),
			success: function(response){
				if(response.code==200){
					// console.log(response.data);
					Google.paymentSuccess();
				}
				else{
					Google.displayMessageBox("Failed to pay!");
				}
			}
		});
		return false;
	});

	$("#print-btn").click(function(){
		window.print();
	});

	$("#hide-student-div").click(function(){
		$("#student-div").hide();
	});

	$("#hide-result-div").click(function(){
		$("#student-result-container").hide();
	});

	$("#hide-fee-div").click(function(){
		$("#student-fee-div").hide();
	});

	$("#hide-challan-div").click(function(){
		$("#student-challan-div").hide();
	});

	$("#hide-new-challan-div").click(function(){
		$("#new-challan-div").hide();
	});

	$("#hide-message-box").click(function(){
		$("#messagebox").hide();
	});
});