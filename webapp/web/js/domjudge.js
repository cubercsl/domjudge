function enableNotifications()
{
    'use strict';

    if ( !('Notification' in window) ) {
        alert('Your browser does not support desktop notifications.');
        return false;
    }
    if ( !('localStorage' in window) || window.localStorage===null ) {
        alert('Your browser does not support local storage;\n'+
              'this is required to keep track of sent notifications.');
        return false;
    }
    // Ask user (via browser) for permission if not already granted.
    if ( Notification.permission==='denied' ) {
        alert('Browser denied permission to send desktop notifications.\n' +
              'Re-enable notification permission in the browser and retry.');
        return false;
    }

    if ( Notification.permission!=='granted' ) {
        Notification.requestPermission(function (permission) {
            // Safari and Chrome don't support the static 'permission'
            // variable, so in this case we set it ourselves.
            if ( !('permission' in Notification) ) {
                Notification.permission = permission;
            }
            if ( Notification.permission!=='granted' ) {
                alert('Browser denied permission to send desktop notifications.');
                return false;
            }
        });
    }

    setCookie('domjudge_notify', 1);
    sendNotification('DOMjudge notifications enabled.');
    $("#notify_disable").removeClass('d-none');
    $("#notify_disable").show();
    $("#notify_enable").hide();
    return true;
}

function disableNotifications()
{
    'use strict';
    setCookie('domjudge_notify', 0);
    $("#notify_enable").removeClass('d-none');
    $("#notify_enable").show();
    $("#notify_disable").hide();
    return true;
}

// Send a notification if notifications have been enabled.
// The options argument is passed to the Notification constructor,
// except that the following tags (if found) are interpreted and
// removed from options:
// * link       URL to redirect to on click, relative to DOMjudge base
//
// We use HTML5 localStorage to keep track of which notifications the
// client has already received to display each notification only once.
function sendNotification(title, options)
{
    'use strict';
    if ( getCookie('domjudge_notify')!=1 ) return;

    // Check if we already sent this notification:
    var senttags = localStorage.getItem('domjudge_notifications_sent');
    if ( senttags===null || senttags==='' ) {
        senttags = [];
    } else {
        senttags = senttags.split(',');
    }
    if ( options.tag!==null && senttags.indexOf(options.tag)>=0 ) { return; }

    var link = null;
    if ( typeof options.link !== 'undefined' ) {
        link = options.link;
        delete options.link;
    }
    options['icon'] = domjudge_base_url + '/apple-touch-icon.png';

    var not = new Notification(title, options);

    if ( link!==null ) {
        not.onclick = function() { window.open(link); }
    }

    if ( options.tag!==null ) {
        senttags.push(options.tag);
        localStorage.setItem('domjudge_notifications_sent',senttags.join(','));
    }
}

// make corresponding testcase description editable
function editTcDesc(descid)
{
	'use strict';
	var node = document.getElementById('tcdesc_' + descid);
	node.parentNode.setAttribute('onclick', '');
	node.parentNode.removeChild(node.nextSibling);
	node.style.display = 'block';
	node.setAttribute('name', 'description[' + descid + ']');
}

// hides edit field if javascript is enabled
function hideTcDescEdit(descid)
{
	'use strict';
	var node = document.getElementById('tcdesc_' + descid);
	node.style.display = 'none';
	node.setAttribute('name', 'invalid');

	var span = document.createElement('span');
	span.innerHTML = node.innerHTML;
	node.parentNode.appendChild(span);
}

// make corresponding testcase sample dropdown editable
function editTcSample(tcid)
{
	'use strict';
	var node = document.getElementById('sample_' + tcid + '_');
	node.parentNode.setAttribute('onclick', '');
	var remove = node.nextSibling;
	while (remove.nodeName === '#text')
		remove = remove.nextSibling;
	node.parentNode.removeChild(remove);
	node.style.display = 'block';
	node.setAttribute('name', 'sample[' + tcid + ']');
}

// hides sample dropdown field if javascript is enabled
function hideTcSample(tcid, str)
{
	'use strict';
	var node = document.getElementById('sample_' + tcid + '_');
	node.style.display = 'none';
	node.setAttribute('name', 'invalid');

	var span = document.createElement('span');
	span.innerHTML = str;
	node.parentNode.appendChild(span);
}

// Autodetection of problem, language, and entry_point in websubmit
function detectProblemLanguageEntryPoint(filename)
{
	'use strict';
	var addfile = document.getElementById("addfile");
	if ( addfile ) addfile.disabled = false;

	filename = filename.replace(/^.*[\\\/]/, '');
	var parts = filename.split('.').reverse();
	if ( parts.length < 2 ) return;
	var lc_parts = [parts[0].toLowerCase(), parts[1].toLowerCase()];

	// problem ID

	var elt=document.getElementById('probid');
	// the "autodetect" option has empty value
	if ( elt.value !== '' ) return;

	for (var i=0;i<elt.length;i++) {
		if ( elt.options[i].text.split(/ - /)[0].toLowerCase() === lc_parts[1] ) {
			elt.selectedIndex = i;
		}
	}

	// language ID

	var elt=document.getElementById('langid');
	// the "autodetect" option has empty value
	if ( elt.value !== '' ) return;

	var langid = getMainExtension(lc_parts[0]);
	for (var i=0;i<elt.length;i++) {
		if ( elt.options[i].value === langid ) {
			elt.selectedIndex = i;
		}
	}

	// entry point
	var elt=document.getElementById('entry_point');

	maybeShowEntryPoint(langid, filename);
}

function checkUploadForm()
{
	'use strict';
	var langelt = document.getElementById("langid");
	var language = langelt.options[langelt.selectedIndex].value;
	var languagetxt = langelt.options[langelt.selectedIndex].text;
	var fileelt = document.getElementById("maincode");
	var filenames = fileelt.files;
	var filename = filenames[0].name;
	var probelt = document.getElementById("probid");
	var problem = probelt.options[probelt.selectedIndex].value;
	var problemtxt = probelt.options[probelt.selectedIndex].text;

	var error = false;
	if ( language === "" ) {
		langelt.focus();
		langelt.className = langelt.className + " errorfield";
		error = true;
	}
	if ( problem === "" ) {
		probelt.focus();
		probelt.className = probelt.className + " errorfield";
		error = true;
	}
	if ( filename === "" ) {
		error = true;
	}
	if ( error ) return false;

	var auxfileno = 0;
	// start at one; skip maincode file field
	for (var i = 1; i < filenames.length; i++) {
		if ( filenames[i].value !== "" ) {
			auxfileno++;
		}
	}
	var extrafiles = '';
	if ( auxfileno > 0 ) {
		extrafiles = "Additional source files: " + auxfileno + '\n';
	}
	var question =
		'Main source file: ' + filename + '\n' +
		extrafiles + '\n' +
		'Problem: ' + problemtxt + '\n'+
		'Language: ' + languagetxt + '\n' +
		'\nMake submission?';
	return confirm (question);
}

function resetUploadForm(refreshtime, maxfiles)
{
	'use strict';
	var addfile = document.getElementById("addfile");
	var auxfiles = document.getElementById("auxfiles");
	addfile.disabled = true;
	auxfiles.innerHTML = "";
	doReload = true;
	setTimeout(function() { reloadPage(); }, refreshtime * 1000);
}

var doReload = true;

function reloadPage()
{
	'use strict';
	if (doReload) {
		location.reload();
	}
}

function initReload(refreshtime)
{
	// interval is in seconds
	setTimeout(function() { reloadPage(); }, refreshtime * 1000);
}

function maybeShowEntryPoint(langid, filename = null)
{
	var entry_point = document.getElementById('entry_point');
	var entry_point_text = document.getElementById('entry_point_text');
	var entry_point_help = document.getElementById('entrypointhelp');

	var entry_point_desc = getEntryPoints(langid);
	var display = entry_point_desc ? 'inline' : 'none';
	entry_point.style.display = entry_point_text.style.display = entry_point_help.style.display = display;
	if ( entry_point_desc ) {
		entry_point_text.innerHTML = entry_point_desc + ':';
		entry_point.required = true;
	} else {
		entry_point.required = false;
	}

	if ( filename ) {
		switch (langid) {
			case 'java':
				entry_point.value = entryPointDetectJava(filename);
				break;
			case 'kt':
				entry_point.value = entryPointDetectKt(filename);
				break;
			default:
				entry_point.value = filename;
		}
	}
}

function entryPointDetectJava(filename)
{
	'use strict';
	var filebase = filename.replace(/\.[^\.]*$/, '');
	return filebase;
}

function entryPointDetectKt(filename)
{
	'use strict';
	var filebase = filename.replace(/\.[^\.]*$/, '');
	if ( filebase === '' ) return '_Kt';

	filebase = filebase.replace(/[^a-zA-Z0-9]/, '_');
	if ( filebase.charAt(0).match(/^[a-zA-Z]$/) ) {
		return filebase.charAt(0).toUpperCase() + filebase.slice(1) + 'Kt';
	} else {
		return '_' + filebase + 'Kt';
	}
}

function initFileUploads(maxfiles)
{
	'use strict';
	var fileelt = document.getElementById("maincode");

	fileelt.onchange = fileelt.onmouseout = function () {
		if ( this.value !== "" ) {
			detectProblemLanguageEntryPoint(this.value);
		}
	}

	var langid_element = document.getElementById("langid");
	if ( langid_element == null ) return;
	langid_element.onchange = langid_element.onmouseout = function () {
		if ( this.value !== "" ) {
			maybeShowEntryPoint(this.value);
		}
	}

	var entry_point_element = document.getElementById('entry_point');
	var entry_point_text_element = document.getElementById('entry_point_text');
	var entry_point_help_element = document.getElementById('entrypointhelp');
	entry_point_element.style.display = entry_point_text_element.style.display = entry_point_help_element.style.display = 'none';
}

function collapse(x)
{
	'use strict';
	var oTemp=document.getElementById("detail"+x);
	if (oTemp.style.display==="none") {
		oTemp.style.display="block";
	} else {
		oTemp.style.display="none";
	}
}

function addFileUpload()
{
	'use strict';
	var input = document.createElement('input');
	input.type = 'file';
	input.name = 'code[]';
	var br = document.createElement('br');

	document.getElementById('auxfiles').appendChild( input );
	document.getElementById('auxfiles').appendChild( br );
}

function togglelastruns()
{
	'use strict';
	var names = {'lastruntime':0, 'lastresult':1, 'lasttcruns':2};
	for (var name in names) {
		var cells = document.getElementsByClassName(name);
		for (var i = 0; i < cells.length; i++) {
			var style = 'inline';
			if (name === 'lasttcruns') {
				style = 'table-row';
			}
			cells[i].style.display = (cells[i].style.display === 'none') ? style : 'none';
		}
	}
}

// TODO: We should probably reload the page if the clock hits contest
// start (and end?).
function updateClock()
{
	'use strict';
	var curtime = initial+offset;
	date.setTime(curtime*1000);

	var fmt = "";
	if ( timeleftelt.innerHTML=='start delayed' || timeleft.innerHTML == 'no contest' ) { // FIXME
		var left = 0;
		var what = timeleftelt.innerHTML;
	} else if (curtime >= starttime && curtime < endtime ) {
		var left = endtime - curtime;
		var what = "";
	} else if (curtime >= activatetime && curtime < starttime ) {
		var left = starttime - curtime;
		var what = "time to start: ";
	} else {
		var left = 0;
		var what = "contest over";
	}

	if ( left ) {
		if ( left > 24*60*60 ) {
			var d = Math.floor(left/(24*60*60));
			fmt += d + "d ";
			left -= d * 24*60*60;
		}
		if ( left > 60*60 ) {
			var h = Math.floor(left/(60*60));
			fmt += h + ":";
			left -= h * 60*60;
		}
		var m = Math.floor(left/60);
		if ( m < 10 ) { fmt += "0"; }
		fmt += m + ":";
		left -= m * 60;
		if ( left < 10 ) { fmt += "0"; }
		fmt += left;
	}

	timeleftelt.innerHTML = what + fmt;
	offset++;
}

function setCookie(name, value)
{
	'use strict';
	var expire = new Date();
	expire.setDate(expire.getDate() + 3); // three days valid
	document.cookie = name + "=" + escape(value) + "; expires=" + expire.toUTCString();
}

function getCookie(name)
{
	'use strict';
	var cookies = document.cookie.split(";");
	for (var i = 0; i < cookies.length; i++) {
		var idx = cookies[i].indexOf("=");
		var key = cookies[i].substr(0, idx);
		var value = cookies[i].substr(idx+1);
		key = key.replace(/^\s+|\s+$/g,""); // trim
		if (key === name) {
			return unescape(value);
		}
	}
	return "";
}

function getSelectedTeams()
{
	'use strict';
	var cookieVal = getCookie("domjudge_teamselection");
	if (cookieVal === null || cookieVal === "") {
		return new Array();
	}
	return JSON.parse(cookieVal);
}

function getScoreboard()
{
	'use strict';
	var scoreboard = document.getElementsByClassName("scoreboard");
	if (scoreboard === null || scoreboard[0] === null) {
		return null;
	}
	return scoreboard[0].rows;
}

function getRank(row)
{
	'use strict';
	return row.getElementsByTagName("td")[0];
}

function getHeartCol(row) {
	'use strict';
	var tds = row.getElementsByTagName("td");
	// search for td before the team name
	for (var i = 1; i < 4; i++) {
		if (tds[i].className == "scoretn") {
			return tds[i - 1];
		}
	}
	return tds[1];
}

function getTeamname(row)
{
	'use strict';
	var res = row.getAttribute("id");
	if ( res === null ) return res;
	return res.replace(/^team:/, '');
}

function toggle(id, show)
{
	'use strict';
	var scoreboard = getScoreboard();
	if (scoreboard === null) return;

	var favTeams = getSelectedTeams();
	// count visible favourite teams (if filtered)
	var visCnt = 0;
	for (var i = 0; i < favTeams.length; i++) {
		for (var j = 0; j < scoreboard.length; j++) {
			var scoreTeamname = getTeamname(scoreboard[j]);
			if (scoreTeamname === null) {
				continue;
			}
			if (scoreTeamname === favTeams[i]) {
				visCnt++;
				break;
			}
		}
	}
	var teamname = getTeamname(scoreboard[id + visCnt]);
	if (show) {
		favTeams[favTeams.length] = teamname;
	} else {
		// copy all other teams
		var newFavTeams = new Array();
		for (var i = 0; i < favTeams.length; i++) {
			if (favTeams[i] !== teamname) {
				newFavTeams[newFavTeams.length] = favTeams[i];
			}
		}
		favTeams = newFavTeams;
	}

	var cookieVal = JSON.stringify(favTeams);
	setCookie("domjudge_teamselection", cookieVal);

	window.location.reload();
}

function addHeart(rank, row, id, isFav)
{
	'use strict';
	var heartCol = getHeartCol(row);
	var color = isFav ? "red" : "gray";
	return heartCol.innerHTML + "<span class=\"heart\" style=\"color:" + color + ";\" onclick=\"toggle(" + id + "," + (isFav ? "false" : "true") + ")\">&#9829;</span>";
}

function initFavouriteTeams()
{
	'use strict';
	var scoreboard = getScoreboard();
	if (scoreboard === null) {
		return;
	}

	var favTeams = getSelectedTeams();
	var toAdd = new Array();
	var cntFound = 0;
	var lastRank = 0;
	for (var j = 0; j < scoreboard.length - 1; j++) {
		var found = false;
		var teamname = getTeamname(scoreboard[j]);
		if (teamname === null) {
			continue;
		}
		var firstCol = getRank(scoreboard[j]);
		var heartCol = getHeartCol(scoreboard[j]);
		var rank = firstCol.innerHTML;
		for (var i = 0; i < favTeams.length; i++) {
			if (teamname === favTeams[i]) {
				found = true;
				heartCol.innerHTML = addHeart(rank, scoreboard[j], j, found);
				toAdd[cntFound] = scoreboard[j].cloneNode(true);
				if (rank === "") {
					// make rank explicit in case of tie
					getRank(toAdd[cntFound]).innerHTML += lastRank;
				}
				scoreboard[j].style.background = "lightyellow";
				cntFound++;
				break;
			}
		}
		if (!found) {
			heartCol.innerHTML = addHeart(rank, scoreboard[j], j, found);
		}
		if (rank !== "") {
			lastRank = rank;
		}
	}

	// copy favourite teams to the top of the scoreboard
	for (var i = 0; i < cntFound; i++) {
		var copy = toAdd[i];
		var firstCol = getRank(copy);
		var color = "red";
		var style = "";
		if (i === 0) {
			style += "border-top: 2px solid black;";
		}
		if (i === cntFound - 1) {
			style += "border-bottom: thick solid black;";
		}
		copy.setAttribute("style", style);
		var tbody = scoreboard[1].parentNode;
		tbody.insertBefore(copy, scoreboard[i + 1]);
	}
}

// This function is a specific addition for using DOMjudge within a
// ICPC analyst setup, to automatically include an analyst's comment
// on the submission in the iCAT system.
// Note that team,prob,submission IDs are as expected by iCAT.
function postVerifyCommentToICAT(url, user, teamid, probid, submissionid)
{
	'use strict';
	var form = document.createElement("form");
	form.setAttribute("method", "post");
	form.setAttribute("action", url);
	form.setAttribute("hidden", true);

	// setting form target to a window named 'formresult'
	form.setAttribute("target", "formresult");

	function addField(name, value) {
		var field = document.createElement("input");
		field.setAttribute("name", name);
		field.setAttribute("id",   name);
		field.setAttribute("value", value);
		form.appendChild(field);
	}

	var msg = document.getElementById("comment").value;

	addField("user", user);
	addField("priority", 1);
	addField("submission", submissionid);
	addField("text", "Team #t"+teamid+" on problem #p"+probid+": "+msg);

	document.body.appendChild(form);

	// creating the 'formresult' window prior to submitting the form
	window.open('about:blank', 'formresult');

	form.submit();
}

function toggleExpand(event)
{
	var node = event.target.parentNode.querySelector('[data-expanded]');
	if (event.target.getAttribute('data-expanded') === '1') {
		node.innerHTML = node.getAttribute('data-collapsed');
		event.target.setAttribute('data-expanded', 0);
		event.target.innerHTML = '[expand]';
	} else {
		node.innerHTML = node.getAttribute('data-expanded');
		event.target.setAttribute('data-expanded', 1);
		event.target.innerHTML = '[collapse]';
	}
}

function clarificationAppendAnswer() {
    'use strict';
    if ( $('#clar_answers').val() == '_default' ) { return; }
    var selected = $("#clar_answers option:selected").text();
    var textbox = $('#bodytext');
    textbox.append('\n' + selected);
    textbox.scrollTop(textbox[0].scrollHeight);
}

function confirmLogout() {
	'use strict';
	return confirm("Really log out?");
}

function addRow(templateid, tableid) {
    var $template = $('#' + templateid);
    var $table = $('#' + tableid);
    var maxId = $table.data('max-id');

    if ( maxId === undefined ) {
        // If not set on the table yet, we start at 0
        maxId = 0;
    } else {
        // Oterwise we should add 1 to the old value
        maxId++;
    }

    // Set it back on the table
    $table.data('max-id', maxId);

    var templateContents = $template.text().replace(/\{id\}/g, maxId);

    $('tbody', $table).append(templateContents);
}

// Add the first row of a table if none exist yet
function addFirstRow(templateid, tableid) {
    var $table = $('#' + tableid);
    var maxId = $table.data('max-id');

    if ( maxId === undefined || maxId === 0 ) {
        addRow(templateid, tableid);
    }
}

var refreshHandler = null;
var refreshEnabled = false;
function enableRefresh($url, $after, usingAjax) {
    if (refreshEnabled) {
        return;
    }
    var refresh = function () {
        if (usingAjax) {
            $.ajax({
                url: $url
            }).done(function(data, status, jqXHR) {
                if (jqXHR.getResponseHeader('X-Login-Page')) {
                    window.location = jqXHR.getResponseHeader('X-Login-Page');
                } else {
                    var $refreshTarget = $('[data-ajax-refresh-target]');
                    $refreshTarget.html(data);
                    if ($refreshTarget.data('ajax-refresh-after')) {
                        window[$refreshTarget.data('ajax-refresh-after')]();
                    }
                }
            });
        } else {
            window.location = $url;
        }
    };
    if (usingAjax) {
        refreshHandler = setInterval(refresh, $after * 1000);
    } else {
        refreshHandler = setTimeout(refresh, $after * 1000);
    }
    refreshEnabled = true;
    setCookie('domjudge_refresh', 1);

    if(window.location.href == localStorage.getItem('lastUrl')) {
    	window.scrollTo(0, localStorage.getItem('scrollTop'));
    } else {
    	localStorage.setItem('lastUrl', window.location.href);
    	localStorage.setItem('scrollTop', 42);
    }
    var scrollTimeout;
    document.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function() {
        localStorage.setItem('scrollTop', $(window).scrollTop());
      }, 100)
    });
}

function disableRefresh(usingAjax) {
    if (!refreshEnabled) {
        return;
    }
    if (usingAjax) {
        clearInterval(refreshHandler);
    } else {
        clearTimeout(refreshHandler);
    }
    refreshEnabled = false;
    setCookie('domjudge_refresh', 0);
}

function toggleRefresh($url, $after, usingAjax) {
    if ( refreshEnabled ) {
        disableRefresh(usingAjax);
    } else {
        enableRefresh($url, $after, usingAjax);
    }

    var text = refreshEnabled ? 'Disable refresh' : 'Enable refresh';
    $('#refresh-toggle').val(text);
    $('#refresh-toggle').text(text);
}

function updateMenuAlerts()
{
    'use strict';
    $.getJSON( $('#menuDefault').data('update-url'), function( json ) {
      updateMenuClarifications(json.clarifications);
      updateMenuRejudgings(json.rejudgings);
      updateMenuJudgehosts(json.judgehosts);
      updateMenuInternalErrors(json.internal_error);
    });
}

function updateMenuClarifications(data)
{
    'use strict';
    var num = data.length;
    if ( num == 0 ) {
        $("#num-alerts-clarifications").hide();
        $("#menu_clarifications").removeClass("text-info");
    } else {
        $("#num-alerts-clarifications").html(num);
        $("#num-alerts-clarifications").show();
        $("#menu_clarifications").addClass("text-info");
        for (var i=0; i<num; i++) {
            sendNotification('New clarification requested.',
                 {'tag': 'clar_' + data[i].clarid,
                  'link': domjudge_base_url + '/jury/clarifications/'+data[i].clarid,
                  'body': data[i].body });
	}
    }
}

function updateMenuRejudgings(data)
{
    'use strict';
    var num = data.length;
    if ( num == 0 ) {
        $("#num-alerts-rejudgings").hide();
        $("#menu_rejudgings").removeClass("text-info");
    } else {
        $("#num-alerts-rejudgings").html(num);
        $("#num-alerts-rejudgings").show();
        $("#menu_rejudgings").addClass("text-info");
    }
}

function updateMenuJudgehosts(data)
{
    'use strict';
    var num = data.length;
    if ( num == 0 ) {
        $("#num-alerts-judgehosts").hide();
        $("#num-alerts-judgehosts-sub").html("");
        $("#menu_judgehosts").removeClass("text-danger");
    } else {
        $("#num-alerts-judgehosts").html(num);
        $("#num-alerts-judgehosts").show();
        $("#num-alerts-judgehosts-sub").html(num + " down");
        $("#menu_judgehosts").addClass("text-danger");
        for(var i=0; i<num; i++) {
            sendNotification('Judgehost down.',
                {'tag': 'host_'+data[i].hostname+'@'+
                 Math.floor(data[i].polltime),
                 'link': domjudge_base_url + '/jury/judgehosts/' + encodeURIComponent(data[i].hostname),
	         'body': data[i].hostname + ' is down'});
        }
    }
}

function updateMenuInternalErrors(data)
{
    'use strict';
    var num = data.length;
    if ( num == 0 ) {
        $("#num-alerts-internalerrors").hide();
        $("#num-alerts-internalerrors-sub").html("");
        $("#menu_internal_error").removeClass("text-danger").addClass("disabled");
    } else {
        $("#num-alerts-internalerrors").html(num);
        $("#num-alerts-internalerrors").show();
        $("#num-alerts-internalerrors-sub").html(num + " new");
        $("#menu_internal_error").addClass("text-danger").removeClass("disabled");
        for(var i=0; i<num; i++) {
            sendNotification('Judgehost internal error occurred.',
                {'tag': 'ie_'+data[i].errorid,
                 'link': domjudge_base_url + '/internal-errors/' + data[i].errorid,
	         'body': data[i].description});
        }
    }
}

function initializeAjaxModals()
{
	var $body = $('body');
	$body.on('click', '[data-ajax-modal]', function() {
		var url = $(this).attr('href');
		$.ajax({
			url: url
		}).done(function(data) {
			var $data = $(data);
			$('body').append($data);
			$data.modal('show');
		});
		return false;
	});

	$body.on('click', '.modal-dialog button[data-url]', function() {
		var url = $(this).data('url');
		$.ajax({
			url: url,
			method: 'POST'
		}).done(function(data) {
			window.location = data.url;
		});
	});
}
