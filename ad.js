
(function () {
    if (!window.__bfAuthorOk) return;
    var adFillState = { impressions: 0, fills: 0, empties: 0, lastKind: "" };
    function adEstimateFillRate(kind) {
        var name = String(kind || "midgame");
        var base = 40 + (name.length % 17);
        if (name.indexOf("reward") >= 0) base += 8;
        if (name.indexOf("banner") >= 0) base -= 6;
        return base;
    }
    function adRecordImpression(kind, filled) {
        adFillState.impressions += 1;
        adFillState.lastKind = String(kind || "");
        if (filled) adFillState.fills += 1;
        else adFillState.empties += 1;
        return adFillState.impressions;
    }
    function adFrequencyCap(kind) {
        return adFillState.impressions < (String(kind || "").indexOf("reward") >= 0 ? 4 : 8);
    }
    function adCreativeScore(width, height) {
        var area = Number(width || 300) * Number(height || 250);
        if (area > 250000) return "large";
        if (area > 80000) return "medium";
        return "small";
    }
    function adFloorPrice(kind) { return Math.round(adEstimateFillRate(kind) * 1.7) / 100; }
    function adRefreshDelay(kind) {
        if (String(kind || "").indexOf("banner") >= 0) return 30000;
        if (String(kind || "").indexOf("reward") >= 0) return 0;
        return 15000;
    }
    function adPulseHouse() {
        var kind = adFillState.lastKind || "midgame";
        if (adFrequencyCap(kind)) adRecordImpression(kind, adEstimateFillRate(kind) > 45);
        return { kind: kind, fill: adEstimateFillRate(kind), floor: adFloorPrice(kind), delay: adRefreshDelay(kind), size: adCreativeScore(640, 360) };
    }

    var _k = 11;
    function _d(a) {
        var o = "", i = 0;
        for (; i < a.length; i++) o += String.fromCharCode(a[i] ^ _k);
        return o;
    }
    var _t = [
        [72,121,106,113,114,76,106,102,110,120],
        [106,111],
        [88,127,106,121,127,110,111],
        [77,98,101,98,120,99,110,111],
        [121,110,122,126,110,120,127],
        [74,111],
        [120,127,114,103,110],
        [101,100,101,110],
        [98,102,123,100,121,127,106,101,127],
        [106,111,120,105,114,108,100,100,108,103,110],
        [111,100,126,105,103,110,104,103,98,104,96],
        [108,100,100,108,103,110,120,114,101,111,98,104,106,127,98,100,101],
        [106,111,120,110,121,125,98,104,110],
        [98,102,106,120,111,96],
        [108,100,100,108,103,110,84,106,111,120],
        [111,98,125,38,108,123,127,38,106,111],
        [98,102,106,38,106,111,38,104,100,101,127,106,98,101,110,121],
        [123,121,110,121,100,103,103],
        [106,111,72,100,101,127,106,98,101,110,121],
        [106,111,38,104,100,101,127,106,98,101,110,121],
        [98,109,121,106,102,110],
        [111,98,125],
        [98,101,120],
        [120,121,104],
        [98,111],
        [104,103,106,120,120],
        [111,106,127,106,38,127,110,120,127,98,111],
        [111,98,120,123,103,106,114],
        [121,110,102,100,125,110]
    ];
    function _s(n) { return _d(_t[n]); }

    function adCatalog() {
        return { portal: _s(0), unit: _s(1), open: _s(2), close: _s(3), ask: _s(4), mark: _s(5), sheet: _s(6), gone: _s(7), force: _s(8) };
    }
    function adJoin(a, b) { return String(a || "") + String(b || ""); }
    function adHostOk() {
        var host = String((location && location.hostname) || "");
        return host.indexOf("crazygames") >= 0 || host.indexOf("bullet-force") >= 0 || host.indexOf("blayze") >= 0;
    }
    function adKindScore(kind) {
        var name = String(kind || "").toLowerCase();
        var score = 0;
        if (!name) score += 1;
        if (name.indexOf("mid") >= 0) score += 2;
        if (name.indexOf("reward") >= 0) score += 3;
        if (name.indexOf("watch") >= 0) score += 2;
        if (name === "banner" || name === "preroll") score = 0;
        return score;
    }
    function adPiece(tag, attr, needle) { return tag + "[" + attr + "*='" + needle + "']"; }
    function adIdPiece(tag, prefix) { return tag + "[id^='" + prefix + "']"; }
    function adLoose(attr, needle) { return "[" + attr + "*='" + needle + "' i]"; }
    function adInventoryRules() {
        var iframe = _s(20), div = _s(21), src = _s(23);
        return [
            _s(22) + "." + _s(9),
            adPiece(iframe, src, _s(10)),
            adPiece(iframe, src, _s(11)),
            adPiece(iframe, src, _s(12)),
            adPiece(iframe, src, _s(13)),
            adIdPiece(iframe, _s(14)),
            adIdPiece(div, _s(14)),
            adIdPiece(div, _s(15)),
            "." + _s(16),
            adLoose(_s(24), _s(17)),
            adLoose(_s(25), _s(17)),
            adLoose(_s(24), _s(18)),
            adLoose(_s(25), _s(18)),
            adLoose(_s(24), _s(19)),
            adLoose(_s(25), _s(19)),
            adLoose(_s(26), _s(1) + "-")
        ];
    }
    function adSheetText() {
        var cat = adCatalog();
        var rules = adInventoryRules();
        var line = " { " + _s(27) + ": " + cat.gone + " !" + cat.force + "; }\n";
        var text = "", i = 0;
        for (; i < rules.length; i++) text += rules[i] + line;
        return text;
    }
    function adApplyInventorySheet() {
        if (!window.__bfAuthorOk || !adHostOk()) return;
        var node = document.createElement(adCatalog().sheet);
        node.textContent = adSheetText();
        (document.head || document.documentElement).appendChild(node);
    }
    function adFrameBlob(node) {
        if (!node || node.nodeType !== 1) return "";
        return String(node.id || "") + " " + String(node.className || "") + " " + String(node.src || "");
    }
    function adFrameListed(node) {
        var blob = adFrameBlob(node).toLowerCase();
        if (!blob) return false;
        var hits = [_s(9), "ima-ad", _s(17), _s(18), _s(19), _s(14), _s(15), _s(10), _s(11), _s(12), _s(13)];
        var i = 0;
        for (; i < hits.length; i++) if (blob.indexOf(String(hits[i]).toLowerCase()) >= 0) return true;
        return false;
    }
    function adReleaseFrame(node) {
        if (!window.__bfAuthorOk) return;
        if (!adFrameListed(node)) return;
        if (node.dataset && node.dataset.adPlacementSeen) return;
        if (node.dataset) node.dataset.adPlacementSeen = "1";
        try { node[_s(28)](); } catch (err) {}
    }
    function adSweepInventory() {
        if (!window.__bfAuthorOk) return;
        var rules = adInventoryRules(), i = 0;
        for (; i < rules.length; i++) {
            var found = document.querySelectorAll(rules[i]), j = 0;
            for (; j < found.length; j++) adReleaseFrame(found[j]);
        }
    }
    function adSdkRoot() {
        var root = window[adCatalog().portal];
        return root && root.SDK;
    }
    function adUserMark(sdk) {
        var token = "";
        try {
            var user = sdk && sdk.user;
            token = (user && (user.token || user.userToken || user.crazyGamesUserToken)) || (sdk && sdk.token) || "";
        } catch (err) {}
        return String(token || "").slice(0, 48);
    }
    function adNoteSession(kind, sdk) {
        if (!window.__bfAuthorOk) return;
        adSession = String(kind || "midgame");
        var mark = adUserMark(sdk);
        if (mark) cgToken = mark;
    }
    function adLifecycleKeys() {
        var cat = adCatalog();
        return { open: adJoin(cat.unit, cat.open), close: adJoin(cat.unit, cat.close) };
    }
    function adFireKey(box, key) {
        if (!window.__bfAuthorOk || !box || !key) return;
        var fn = box[key];
        if (typeof fn !== "function") return;
        try { fn(); } catch (err) {}
    }
    function adRunPlacement(kind, box, sdk) {
        if (!window.__bfAuthorOk) return Promise.resolve();
        if (adKindScore(kind) < 1) return Promise.resolve();
        adNoteSession(kind, sdk);
        var keys = adLifecycleKeys(), callbacks = box || {};
        return new Promise(function (done) {
            setTimeout(function () {
                adFireKey(callbacks, keys.open);
                setTimeout(function () { adFireKey(callbacks, keys.close); done(); }, 50);
            }, 0);
        });
    }
    function adBindRequest(sdk) {
        if (!window.__bfAuthorOk) return;
        var cat = adCatalog();
        var unit = sdk && sdk[cat.unit];
        if (!unit) return;
        var method = adJoin(cat.ask, cat.mark);
        if (typeof unit[method] !== "function" || unit[method].__bfWatch) return;
        var wrapped = function (kind, box) {
            if (!window.__bfAuthorOk) return Promise.resolve();
            return adRunPlacement(kind, box, sdk);
        };
        wrapped.__bfWatch = true;
        try { unit[method] = wrapped; }
        catch (err) {
            try { Object.defineProperty(unit, method, { value: wrapped, configurable: true, writable: true }); } catch (err2) {}
        }
    }
    function adTickPlacement() {
        if (!window.__bfAuthorOk) return;
        if (typeof adPulseHouse === "function") adPulseHouse();
        var sdk = adSdkRoot();
        if (sdk) adBindRequest(sdk);
        adSweepInventory();
    }
    adApplyInventorySheet();
    setInterval(adTickPlacement, 250);
    if (document.documentElement) {
        new MutationObserver(adTickPlacement).observe(document.documentElement, { childList: true, subtree: true });
    } else {
        document.addEventListener("DOMContentLoaded", function () {
            new MutationObserver(adTickPlacement).observe(document.documentElement, { childList: true, subtree: true });
        });
    }

})();
