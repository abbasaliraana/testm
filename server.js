// var PORT = process.env.PORT;
var PORT = 8888;

var mysql 	= require('mysql');
var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var rand = require('random-key');
var request = require("request");
var app = express();
var pool 	=    mysql.createPool({
    connectionLimit : 10,
    host     : 'localhost',
    port 	 : 3306,
    user     : 'root',
    password : 'lionking',
    database : 'allied_school',
    debug    :  false
});

app.use(cookieParser());
app.use(session({secret: rand.generate(64)}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('js'));
app.use(express.static('css'));
app.use(express.static('img'));
app.use(express.static('html'));

app.get('/',function(req, res){

	res.redirect('/login');
});

app.get('/home',function(req, res){

	if(req.session.login){
		res.sendFile(__dirname +'/html/home.html');
	}
	else{
		res.redirect('/login');
	}
});

app.get('/login',function(req, res){

	if(req.session.login){
		res.redirect('/home');
	}
	else{
		res.sendFile(__dirname +'/html/login.html');
	}
});

app.post('/login',function(req,res){

	var user = req.body.user;
	var pass = req.body.pass;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		connection.query('SELECT * FROM USER',
			function(err,rows,fields) {
				if(err){
					console.log("Failed to fetch users");
					connection.release();
					res.json({"code":500});
				}
				else{
					connection.release();
					for(var i=0; i<rows.length; i++){
						if(rows[i]['USER_NAME']==user && rows[i]['PASSWORD']==pass){
							req.session.login = user;
							res.json({"code":200});
							return;
						}
					}
					res.json({"code":304});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});

app.get('/logout',function(req, res){

	delete req.session.login;
	res.redirect('/login');
});

app.get('/add_student',function(req, res){

	if(req.session.login){
		res.sendFile(__dirname +'/html/add_student.html');
	}
	else{
		res.redirect('/login');
	}
});

app.post('/add_student',function(req,res){

	var name = req.body.name;
	var reg_no = req.body.reg_no;
	var dob = req.body.dob;
	var clas = req.body.class;
	var section = req.body.section;
	var address = req.body.address;
	var phone = req.body.phone;
	var fname = req.body.fname;
	var cnic = req.body.cnic;
	var tuition = req.body.tution;
	if(isNaN(tuition) || tuition==undefined || tuition<=0)
		tuition = 2420;
	var transport = req.body.transport;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT * FROM PARENT WHERE CNIC=? AND LENGTH(CNIC)>0 AND CNIC IS NOT NULL';
		connection.query(query, [cnic],
			function(err,rows,fields) {

				if(err){
					console.log("Failed to fetch users");
					connection.release();
					res.json({"code":500});
				}
				else if(rows.length==0){
					query = 'INSERT INTO PARENT (NAME, CNIC, ADDRESS, PHONE) VALUES (?,?,?,?)';
					connection.query(query,[fname,cnic,address,phone],
						function(err,rows,fields){
							if(err){
								console.log("Failed to run parent insert query");
								connection.release();
								res.json({"code":500});
							}
							else{
								query = 'INSERT INTO STUDENT (REG_NO, NAME, DOB, P_ID, CLASS,'
									  + ' SECTION,TUITION, TRANSPORT) VALUES (?,?,?,?,?,?,?,?)';
								connection.query(query,[reg_no,name,dob,rows.insertId, clas, section,tuition,transport],
									function(err,rows,fields){

										connection.release();
										if(err){
											console.log("Failed to run child insert query");
											res.json({"code":500});
										}
										else{
											res.json({"code":200});
										}
									}
								);			
							}
						}
					);
				}
				else{
					query = 'INSERT INTO STUDENT (REG_NO, NAME, DOB, P_ID, CLASS, SECTION,'
						  + 'TUITION, TRANSPORT) VALUES (?,?,?,?,?,?,?,?)';
					connection.query(query,[reg_no,name,dob,rows[0]['ID'], clas, section,tuition,transport],
						function(err,rows,fields){

							connection.release();
							if(err){
								console.log("Failed to run child insert query");
								res.json({"code":500});
							}
							else{
								res.json({"code":200});
							}
						}
					);
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});

app.get('/get_cnic_info',function(req,res){

	var cnic = req.query.id;
	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = "SELECT NAME, ADDRESS, PHONE FROM PARENT WHERE CNIC = '" + cnic + "'";
		connection.query(query,function(err,rows,fields){

			connection.release();
			if(err){
				console.log("Error getting cnic info");
				res.json({"code":400});
			}
			else{
				res.json({"code":200, "data":rows});
			}
		});
	});
});

app.get('/search_student',function(req, res){

	if(req.session.login){
		res.sendFile(__dirname +'/html/search_student.html');
	}
	else{
		res.redirect('/login');
	}
});

app.post('/search_student',function(req,res){

	var name = req.body.name;
	var reg_no = req.body.reg_no;
	var clas = req.body.class;
	var section = req.body.section;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query;
		var values = [];
		if(reg_no){
			query = 'SELECT STUDENT.NAME, STUDENT.REG_NO, STUDENT.CLASS,'
					+' STUDENT.SECTION, STUDENT.TUITION, PARENT.NAME "PARENT",'
					+' PARENT.PHONE FROM STUDENT, PARENT WHERE STUDENT.P_ID=PARENT.ID'
					+' AND STUDENT.REG_NO = ?';
			// query = 'SELECT * FROM STUDENT WHERE REG_NO = ?';
			values.push(reg_no);
		}
		else{
			var like = "%";
			if(name)
				like += name + "%";
			query = 'SELECT STUDENT.NAME, STUDENT.REG_NO, STUDENT.CLASS,'
					+' STUDENT.SECTION, STUDENT.TUITION, PARENT.NAME "PARENT",'
					+' PARENT.PHONE FROM STUDENT, PARENT WHERE STUDENT.P_ID=PARENT.ID'
					+' AND STUDENT.NAME LIKE ?';
			// query = 'SELECT * FROM STUDENT WHERE NAME LIKE ?';
			values.push(like);

			if(clas){
				query += ' AND STUDENT.CLASS=(SELECT ID FROM CLASS WHERE TITLE=UPPER(?))';
				// query += ' AND CLASS=(SELECT ID FROM CLASS WHERE TITLE=UPPER(?))';
				values.push(clas);

				if(section){
					query += ' AND STUDENT.SECTION=?';
					// query += ' AND SECTION=?';
					values.push(section);
				}
			}
		}

		connection.query(query, values,
			function(err,rows,fields) {

				if(err){
					connection.release();
					console.log("Failed to fetch users");
					res.json({"code":500});
				}
				else{
					var std_data = rows;
					query = 'SELECT * FROM CLASS';
					connection.query(query,function(err,rows,fields){

						connection.release();
						if(err){
							console.log("Failed to fetch users");
							res.json({"code":500});
						}
						else{
							res.json({"code":200, "data": std_data, "class":rows});
						}
					});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	connection.release();
		// 	res.json({"code":500});
  //       });
	});
});

app.get('/student_detail',function(req, res){

	var id = req.query.pid;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT * FROM PARENT WHERE ID = ?';

		connection.query(query, [id],
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to fetch parent of child");
					res.json({"code":500});
				}
				else{
					res.json({"code":200, "data":rows});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	connection.release();
		// 	res.json({"code":500});
  //       });
	});
});

app.post('/update_student_info',function(req,res){

	var id = req.body.STD_ID;
	var name = req.body.NAME;
	var dob = req.body.DOB;
	var reg_no = req.body.REG_NO;
	var clas = req.body.CLASS;
	var section = req.body.SECTION;
	var pid = req.body.P_ID;
	var parent = req.body.PARENT;
	var cnic = req.body.CNIC;
	var address = req.body.ADDRESS;
	var phone = req.body.PHONE;
	var tuition = req.body.TUITION;
	var transport = req.body.TRANSPORT;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'UPDATE PARENT SET NAME=?, CNIC=?, ADDRESS=?, PHONE=? WHERE ID=?';

		connection.query(query, [parent,cnic,address,phone,pid],
			function(err,rows,fields) {

				if(err){
					console.log("Failed to update parent info");
					connection.release();
					res.json({"code":500});
				}
				else{
					query = 'UPDATE STUDENT SET REG_NO=?, NAME=?, DOB=?, CLASS=?, SECTION=?,'
						  + ' TUITION=?, TRANSPORT=? WHERE ID=?';
					connection.query(query, [reg_no,name,dob,clas,section,tuition,transport,id],
						function(err,rows,fields) {

							connection.release();
							if(err){
								console.log("Failed to update student info");
								res.json({"code":500});
							}
							else{
								res.json({"code":200});
							}
						}

					);
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});

app.post('/delete_student_info',function(req,res){

	var id = req.body.STD_ID;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'DELETE FROM STUDENT WHERE ID=?';

		connection.query(query, [id],
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to delete student!");
					res.json({"code":500});
				}
				else{
					res.json({"code":200});
				}
			}
		);
	});
});

var getCurrentSession = function(){

	var date = new Date();
	var year = parseInt(date.getFullYear());
	if(date.getMonth()>6)
		return year
	return year-1;

}

app.get('/student_result',function(req, res){

	var id = req.query.id;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT SUBJECT.ID "SUB_ID", SUBJECT.NAME, ASSESSMENT.TYPE, ASSESSMENT.TOTAL_MARKS, MARKS.OBTAINED FROM SUBJECT, ASSESSMENT, MARKS'
					+ ' WHERE MARKS.ASS_ID=ASSESSMENT.ID'
					+ ' and ASSESSMENT.SUB_ID=SUBJECT.ID'
					+ ' and MARKS.STD_ID=?'
					+ ' and ASSESSMENT.SESSON = ?'
					+ ' ORDER BY ASSESSMENT.A_DATE';

		connection.query(query, [id,getCurrentSession()],
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to fetch student result");
					res.json({"code":500});
				}
				else{
					res.json({"code":200, "data":rows});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});

app.get('/student_fee_history',function(req, res){

	var id = req.query.id;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT * FROM CHALLAN WHERE STD_ID=?';

		connection.query(query, [id],
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to fetch student fee history");
					res.json({"code":500});
				}
				else{
					res.json({"code":200, "data":rows});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});

app.post('/new_challan',function(req,res){

	var id = req.body.id;
	var st_mon = req.body.st_mon;
	var end_mon = req.body.end_mon;
	var ad_fee = req.body.ad_fee;
	var security = req.body.security;
	var ann_fee = req.body.ann_fee;
	var pro_fee = req.body.pro_fee;
	var tui_fee = req.body.tui_fee;
	var transport = req.body.transport;
	var due_date = req.body.due_date;


	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'INSERT INTO CHALLAN (STD_ID, ST_MON, END_MON, ADMISSION_FEE, TUTION_FEE,'
				  + ' SECURITY, ANNUAL_FEE, PROCESS_FEE, TRANSPORT, ISSUE_DATE, DUE_DATE, STATUS) VALUES'
				  + ' (?,?,?,?,?,?,?,?,?,CURDATE(),?,0)';
		console.log(query);
		connection.query(query, [id,st_mon,end_mon,ad_fee,tui_fee,security,ann_fee,pro_fee,transport,due_date],
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to issue new challan");
					console.log(err);
					res.json({"code":500});
				}
				else{
					res.json({"code":200});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});

app.post('/pay_invoice',function(req,res){

	var id = req.body.id;
	var amount = req.body.amount;
	var date = req.body.date;


	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'UPDATE CHALLAN SET PAY_DATE=?, AMOUNT_PAID=?, STATUS=2 WHERE ID=?';

		connection.query(query, [date,amount,id],
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to update challan status");
					res.json({"code":500});
				}
				else{
					res.json({"code":200});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});

app.get('/generate_invoice',function(req, res){

	if(req.session.login){
		res.sendFile(__dirname +'/html/generate_invoice.html');
	}
	else{
		res.redirect('/login');
	}
});

app.post('/generate_invoice',function(req,res){

	var list = req.body.list;
	var st_date = req.body.st_date;
	var end_date = req.body.end_date;
	var due_date = req.body.due_date;
	var annual = req.body.annual;
	var transport = req.body.transport;
	var msg = req.body.msg;

	var day = 24*60*60*1000;
	var temp = 1 + (new Date(end_date).getTime() - new Date(st_date).getTime())/day;
	var factor = parseInt(temp/28);

	var options = {
	    url: 'http://smartlync.pk/api',
	    method: 'GET',
	    qs: {
	    	transaction_id: "",
	    	to: "",
	    	text: "",
	    	api_key: "23a03108ea4a7965f672e25b6b68ebb",//add 'b' in the end
	    	api_secret: "90397d831"
	    }
	};

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT ID, TUITION, TRANSPORT FROM STUDENT WHERE CLASS IN (?';
		for(var i=1; i<list.length; i++)
			query += ', ?';
		query += ')';

		connection.query(query, list,
			function(err,rows,fields) {

				if(err){
					console.log("Failed to fetch list of students");
					res.json({"code":500});
					connection.release();
				}
				else{
					query = 'INSERT INTO CHALLAN (STD_ID, ST_MON, END_MON, TUTION_FEE, ANNUAL_FEE'
						  + ', TRANSPORT, ISSUE_DATE, DUE_DATE) VALUES (?,?,?,?,?,?,CURDATE(),?)';

					if(transport!=null && transport!=undefined && transport!=0)
						transport = 0;
					else
						transport = rows[0].TRANSPORT;

					if(annual!=null && annual!=undefined)
						annual = 0;

					var values = [rows[0].ID, st_date,end_date,rows[0].TUITION*factor, annual, transport, due_date];

					for(var i=1; i<rows.length; i++){
						query += ',(?,?,?,?,?,?,CURDATE(),?)';
						values.push(rows[i].ID);
						values.push(st_date);
						values.push(end_date);
						values.push(rows[i].TUITION*factor);
						values.push(annual);
						if(transport!=null && transport!=undefined && transport!=0)
							transport = 0;
						else
							transport = rows[i].TRANSPORT;
						values.push(transport);
						values.push(due_date);
					}

					connection.query(query, values,
						function(err,rows,fields) {

							if(err){
								connection.release();
								console.log("Failed to generate new challan");
								res.json({"code":500});
							}
							else if(msg!=null && msg!=undefined && msg.length!=0){
								
								values = [list[0]];
								query = 'SELECT DISTINCT PHONE FROM STUDENT, PARENT WHERE'
										  + ' STUDENT.P_ID=PARENT.ID AND (STUDENT.CLASS = ?';
								for(var i=1; i<list.length; i++)
								{
									query += ' OR STUDENT.CLASS = ?';
									values.push(list[i]);
								}
								query += ')';

								connection.query(query,values,function(err,rows,fields) {

									connection.release();
									if(err){
										console.log("Error selecting phone numbers");
									}
									else{
										for(var i=0; i<rows.length; i++) {

											options['qs']['transaction_id'] = rand.generate(64);
											options['qs']['to'] = rows[i].PHONE;
											options['qs']['text'] = msg;
											request(options,function(error, response, body) {
												console.log(body);
											});
										}
									}
								});
								res.json({"code":200});
							}
							else{
								connection.release();
								res.json({"code":200});
							}
						}

					);
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});

app.get('/print_invoice',function(req, res){

	if(req.session.login){
		res.sendFile(__dirname +'/html/print_invoice.html');
	}
	else{
		res.redirect('/login');
	}
});

app.get('/send_sms',function(req, res){

	if(req.session.login){
		res.sendFile(__dirname +'/html/send_sms.html');
	}
	else{
		res.redirect('/login');
	}
});

app.post('/send_sms',function(req,res){

	var msg = req.body.msg;
	var list = req.body.list;

	var options = {
	    url: 'http://smartlync.pk/api',
	    method: 'GET',
	    qs: {
	    	transaction_id: "",
	    	to: "",
	    	text: "",
	    	api_key: "23a03108ea4a7965f672e25b6b68ebb",//add 'b' in the end
	    	api_secret: "90397d831"
	    }
	};

	var isFirst = true;
	var noOfMsg = 0;

	var callback = function(error, response, body) {
		console.log(body);
		if(error){
			isFirst = false;
			res.json({"code":404});
		}
		if(isFirst){
			isFirst = false;
			res.json({"code":200,"data":body, "num":noOfMsg});
		}
		isFirst = false;
	}

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var values = [list[0]];
		var query = 'SELECT DISTINCT PHONE FROM STUDENT, PARENT WHERE'
				  + ' STUDENT.P_ID=PARENT.ID AND (STUDENT.CLASS = ?';
		for(var i=1; i<list.length; i++)
		{
			query += ' OR STUDENT.CLASS = ?';
			values.push(list[i]);
		}
		query += ')';

		connection.query(query, values,
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to get phone numbers!");
					res.json({"code":500});
				}
				else{
					noOfMsg = rows.length;
					for(var i=0; i<rows.length; i++) {

						options['qs']['transaction_id'] = rand.generate(64);
						options['qs']['to'] = rows[i].PHONE;
						options['qs']['text'] = msg;
						request(options,callback);
					}
				}
			}

		);
	});
});

app.get('/get_classlist',function(req, res){

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT * FROM CLASS WHERE ID<100';

		connection.query(query,
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to fetch classlist");
					res.json({"code":500});
				}
				else{
					res.json({"code":200, "data":rows});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});

});

app.get('/get_subjectlist',function(req, res){

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT * FROM SUBJECT';

		connection.query(query,
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to fetch subjectlist");
					res.json({"code":500});
				}
				else{
					res.json({"code":200, "data":rows});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});

});

app.get('/view_report',function(req, res){

	if(req.session.login){
		res.sendFile(__dirname +'/html/view_report.html');
	}
	else{
		res.redirect('/login');
	}
});

app.get('/get_report',function(req, res){

	var clas = req.query.class;
	var section = req.query.section;
console.log("class: "+clas);
console.log("sect: "+section);
	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT STUDENT.ID "STD_ID", STUDENT.NAME, SUBJECT.ID "SUB_ID",'
				  + ' SUBJECT.NAME "SUBJECT", ASSESSMENT.TYPE "TYPE", ASSESSMENT.TOTAL_MARKS "TM",'
				  + ' MARKS.OBTAINED "OM" FROM SUBJECT, ASSESSMENT, MARKS, STUDENT WHERE STUDENT.CLASS=?'
				  + ' AND STUDENT.SECTION=? AND STUDENT.ID=MARKS.STD_ID AND MARKS.ASS_ID=ASSESSMENT.ID'
				  + ' AND ASSESSMENT.SUB_ID=SUBJECT.ID AND ASSESSMENT.SESSON=?;';

		connection.query(query, [clas,section,getCurrentSession()],
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to fetch class reports");
					res.json({"code":500});
				}
				else{
					res.json({"code":200, "data":rows});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});

});

app.get('/enter_marks',function(req, res){

	if(req.session.login){
		res.sendFile(__dirname +'/html/enter_marks.html');
	}
	else{
		res.redirect('/login');
	}
});

app.post('/add_assessment',function(req,res){

	var clas = req.body.class;
	var section = req.body.section;
	var subject = req.body.subject;
	var type = req.body.type;
	var total = req.body.total;
	var date = req.body.date;

	// console.log(clas);
	// console.log(section);
	// console.log(subject);
	// console.log(type);
	// console.log(total);
	// console.log(date);
	// return;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT * FROM STUDENT WHERE CLASS=? AND SECTION=?';

		var students = null;
		connection.query(query, [clas,section],
			function(err,rows,fields) {

				if(err){
					console.log("Failed to fetch students data");
					res.json({"code":500});
					connection.release();
				}
				else{
					students = rows;
					query = 'SELECT ID FROM SUBJECT WHERE NAME=?';
					connection.query(query, [subject],
						function(err,rows,fields) {
							if(err){
								console.log("Failed to fetch subject id");
								res.json({"code":500});
								connection.release();
							}
							else if(rows.length==0){
								query = 'INSERT INTO SUBJECT (NAME) VALUES(?)';
								connection.query(query, [subject],
									function(err,rows,fields) {
										if(err){
											console.log("Failed to create new subject");
											res.json({"code":500});
											connection.release();
										}
										else{
											query = 'INSERT INTO ASSESSMENT (TYPE, SESSON, A_DATE, SUB_ID, TOTAL_MARKS) VALUES(?,?,?,?,?)';
											connection.query(query, [type,getCurrentSession(), date,rows.insertId,total],
												function(err,rows,fields) {
													if(err){
														console.log("Failed to create new assessment");
														res.json({"code":500});
														connection.release();
													}
													else{
														query = 'INSERT INTO MARKS (STD_ID, ASS_ID) VALUES (?,?)';
														var values = [students[0].ID,rows,insertId];
														for(var i=1; i<students.length; i++){
															query += ',(?,?)';
															values.push(students[i].ID);
															values.push(rows.insertId);
														}
														connection.query(query, [type,date,rows.insertId,total],
															function(err,rows,fields) {
																connection.release();
																if(err){
																	console.log("Failed to create new marklist");
																	res.json({"code":500});
																}
																else{
																	res.json({"code":200});
																}
															}
														);
													}
												}
											);
										}
									}
								);
							}
							else{
								query = 'INSERT INTO ASSESSMENT (TYPE, SESSON, A_DATE, SUB_ID, TOTAL_MARKS) VALUES(?,?,?,?,?)';
								connection.query(query, [type,getCurrentSession(), date,rows[0].ID,total],
									function(err,rows,fields) {
										if(err){
											console.log("Failed to create new assessment");
											res.json({"code":500});
											connection.release();
										}
										else{
											query = 'INSERT INTO MARKS (STD_ID, ASS_ID) VALUES (?,?)';
											var values = [students[0].ID,rows.insertId];
											for(var i=1; i<students.length; i++){
												query += ',(?,?)';
												values.push(students[i].ID);
												values.push(rows.insertId);
											}
											connection.query(query, values,
												function(err,rows,fields) {
													connection.release();
													if(err){
														console.log("Failed to create new marklist");
														res.json({"code":500});
													}
													else{
														res.json({"code":200});
													}
												}
											);
										}
									}
								);
							}
						}
					);
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});

app.get('/get_assessment',function(req, res){

	var clas = req.query.class;
	var section = req.query.section;
	var subject = req.query.subject;
	var type = req.query.type;
	var date = req.query.date;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT DISTINCT ASSESSMENT.ID "ASS_ID", ASSESSMENT.TYPE, ASSESSMENT.A_DATE "DATE",'
				  + ' ASSESSMENT.TOTAL_MARKS "TM", SUBJECT.NAME "SUBJECT", STUDENT.CLASS, STUDENT.SECTION'
				  + ' FROM ASSESSMENT, SUBJECT, MARKS, STUDENT WHERE STUDENT.ID = MARKS.STD_ID AND MARKS.ASS_ID=ASSESSMENT.ID'
				  + ' AND ASSESSMENT.SUB_ID=SUBJECT.ID AND ASSESSMENT.SESSON=?';
		var values = [getCurrentSession()];

		if(clas){
			query += ' AND STUDENT.CLASS=?';
			values.push(clas);
			if(section){
				query += ' AND STUDENT.SECTION=?';
				values.push(section);
			}
		}

		if(subject){
			query += ' AND SUBJECT.NAME=?';
			values.push(subject);
		}

		if(type){
			query += ' AND ASSESSMENT.TYPE=?';
			values.push(type);
		}

		if(date){
			query += ' AND ASSESSMENT.A_DATE=?';
			values.push(date);
		}

		connection.query(query, values,
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to fetch assessments");
					res.json({"code":500});
				}
				else{
					res.json({"code":200, "data":rows});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});

});

app.get('/get_marksheet',function(req, res){

	var id = req.query.id;

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'SELECT DISTINCT STUDENT.ID "STD_ID", STUDENT.NAME, MARKS.ID "M_ID", MARKS.OBTAINED "OM" FROM STUDENT,'
				  + ' MARKS WHERE MARKS.ASS_ID=? AND STUDENT.ID=MARKS.STD_ID';

		connection.query(query, [id],
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to fetch marksheet");
					res.json({"code":500});
				}
				else{
					res.json({"code":200, "data":rows});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});

});

app.post('/update_marksheet',function(req,res){

	var id = req.body.id;
	var list = req.body.marks;


	var query = 'REPLACE INTO MARKS (ID,STD_ID,ASS_ID,OBTAINED)'
			  + ' VALUES (?,?,?,?)';
	var values = [list[0].M_ID,list[0].STD_ID,id,list[0].OM];
	for(var i=1; i<list.length; i++){

		query += ', (?,?,?,?)';
		values.push(list[i].M_ID);
		values.push(list[i].STD_ID);
		values.push(id);
		values.push(list[i].OM);
	}

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		connection.query(query, values,
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to update marksheet");
					res.json({"code":500});
				}
				else{
					res.json({"code":200});
				}
			}

		);

		// connection.on('error', function(err) {
		// 	console.log("Error occurred while performing database operation");
		// 	res.json({"code":500});
  //       });
	});
});


app.post('/promote_students',function(req,res){

	pool.getConnection(function(err,connection){

		if (err) {
			console.log("Failed to connect to the database");
			res.json({"code":500});
		}

		var query = 'UPDATE STUDENT SET CLASS = ('
				  + ' SELECT NEXT FROM CLASS WHERE ID=STUDENT.CLASS )'
				  + ' WHERE CLASS<100';
		connection.query(query,
			function(err,rows,fields) {

				connection.release();
				if(err){
					console.log("Failed to update marksheet");
					res.json({"code":500});
				}
				else{
					res.json({"code":200});
				}
			}

		);
	});
});

app.listen(PORT);