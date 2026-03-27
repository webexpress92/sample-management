/* ========================================
   Samples Management - Application Logic
   ======================================== */

// ----------------------------------------
// 1. Constants & Reference Data
// ----------------------------------------

const PRODUCT_TYPES = [
    "Upper body garments / tops",
    "Lower body garments / bottoms"
];

const PRODUCT_COLOURS = [
    "Blue", "Beige", "Black", "Red", "Green",
    "Yellow", "Brown", "Grey", "Orange", "Purple", "White"
];

const SIZE_SYSTEMS = {
    "Alpha (2XS - 6XL)": ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"],
    "Numeric (28 - 78)": ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56", "58", "60", "62", "64", "66", "68", "70", "72", "74", "76", "78"]
};

const TARGET_MARKETS = ["North", "South"];

const SPECIFIC_TESTS = {
    "High visibility": { samples: 1, sizes: ["min"], destructive: true },
    "Knee pocket": { samples: 3, sizes: ["min", "base", "max"], destructive: true, onlyFor: "Lower body garments / bottoms" },
    "Electric arc (box test)": { destructive: true, requiresColourSelection: true },
    "Electric arc (open arc)": { destructive: true, requiresColourSelection: true },
    "ESD": { samples: 3, sizes: ["base", "base", "base"], destructive: true }
};

const LEG_LENGTHS = ["X", "S", "R", "T"];

const COLOUR_CSS = {
    "White":  { bg: "#f5f5f5", border: "#ccc",    text: "#333" },
    "Orange": { bg: "#ffe0b2", border: "#fb8c00", text: "#333" },
    "Yellow": { bg: "#fff9c4", border: "#fdd835", text: "#333" },
    "Blue":   { bg: "#bbdefb", border: "#1e88e5", text: "#333" },
    "Green":  { bg: "#c8e6c9", border: "#43a047", text: "#333" },
    "Beige":  { bg: "#f5f0e1", border: "#c8b888", text: "#333" },
    "Black":  { bg: "#444444", border: "#222222", text: "#fff" },
    "Red":    { bg: "#ffcdd2", border: "#e53935", text: "#333" },
    "Brown":  { bg: "#d7ccc8", border: "#795548", text: "#333" },
    "Grey":   { bg: "#e0e0e0", border: "#9e9e9e", text: "#333" },
    "Purple": { bg: "#e1bee7", border: "#8e24aa", text: "#333" }
};

const STORAGE_KEY = "samples_management_state";

// ----------------------------------------
// 2. Application State
// ----------------------------------------

var defaultState = {
    collectionName: "",
    productType: "",
    productColours: [],
    coloursForShooting: [],
    sizeSystem: "",
    sizeOpening: [],
    baseSize: "",
    legLengths: [],
    smallestSize: "",
    largestSize: "",
    targetMarket: [],
    specificTests: [],
    firstMasterColour: "",
    electricArcColours: [],
    perfArc: { colours: [], testTypes: [], drying: [], cycles: [], size: "" },
    perfESD: { colours: [], drying: [], cycles: [], size: "" },
    calculationResult: null
};

let appState = JSON.parse(JSON.stringify(defaultState));

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
        // localStorage may not be available in some contexts
    }
}

function loadState() {
    try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            appState = JSON.parse(saved);
            return true;
        }
    } catch (e) {
        // ignore
    }
    return false;
}

// ----------------------------------------
// 3. SPA Navigation
// ----------------------------------------

function navigateTo(pageId) {
    document.querySelectorAll(".page").forEach(function (p) {
        p.classList.add("hidden");
    });
    document.getElementById(pageId).classList.remove("hidden");
}

// ----------------------------------------
// 4. Form Initialization
// ----------------------------------------

function isBottoms() {
    return appState.productType === "Lower body garments / bottoms" ||
           document.getElementById("product-type").value === "Lower body garments / bottoms";
}

function initForm() {
    // Product types
    var select = document.getElementById("product-type");
    PRODUCT_TYPES.forEach(function (type) {
        var opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        select.appendChild(opt);
    });

    // Product colours (checkboxes)
    var coloursDiv = document.getElementById("product-colours");
    PRODUCT_COLOURS.forEach(function (colour) {
        var label = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = colour;
        cb.name = "product-colour";
        label.appendChild(cb);
        label.appendChild(document.createTextNode(colour));
        coloursDiv.appendChild(label);
    });

    // Size systems
    var sizeSelect = document.getElementById("size-system");
    Object.keys(SIZE_SYSTEMS).forEach(function (system) {
        var opt = document.createElement("option");
        opt.value = system;
        opt.textContent = system;
        sizeSelect.appendChild(opt);
    });

    // Leg lengths (static checkboxes, hidden by default)
    var legDiv = document.getElementById("leg-lengths");
    LEG_LENGTHS.forEach(function (leg) {
        var label = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = leg;
        cb.name = "leg-length";
        label.appendChild(cb);
        label.appendChild(document.createTextNode(leg));
        legDiv.appendChild(label);
    });

    // Target markets (checkboxes)
    var marketDiv = document.getElementById("target-market");
    TARGET_MARKETS.forEach(function (market) {
        var label = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = market;
        cb.name = "target-market";
        label.appendChild(cb);
        label.appendChild(document.createTextNode(market));
        marketDiv.appendChild(label);
    });

    // Specific tests are built dynamically (filtered by product type)
    updateSpecificTests();
    updatePerfSizes();
}

// ----------------------------------------
// 5. Dynamic Dependencies
// ----------------------------------------

function updateProductTypeVisibility() {
    var bottoms = (document.getElementById("product-type").value === "Lower body garments / bottoms");

    // Leg lengths: only for bottoms
    document.getElementById("leg-lengths-group").classList.toggle("hidden", !bottoms);
    // Size grid (combinations + 3 dropdowns): only for bottoms
    document.getElementById("size-grid-group").classList.toggle("hidden", !bottoms);
    // Base size dropdown: only for tops
    document.getElementById("base-size-group").classList.toggle("hidden", bottoms);

    if (!bottoms) {
        // Clear bottoms-specific state
        document.querySelectorAll('input[name="leg-length"]').forEach(function (cb) {
            cb.checked = false;
        });
        document.getElementById("smallest-size").innerHTML = '<option value="">-- Select --</option>';
        document.getElementById("base-size-bottoms").innerHTML = '<option value="">-- Select --</option>';
        document.getElementById("largest-size").innerHTML = '<option value="">-- Select --</option>';
        document.getElementById("size-combinations-grid").innerHTML = "";
    }

    updateSpecificTests();
}

function updateSpecificTests() {
    var testsDiv = document.getElementById("specific-tests");
    var currentType = document.getElementById("product-type").value;
    var previouslyChecked = getSelectedCheckboxes("specific-test");

    testsDiv.innerHTML = "";

    Object.keys(SPECIFIC_TESTS).forEach(function (test) {
        var def = SPECIFIC_TESTS[test];
        // Filter by onlyFor
        if (def.onlyFor && def.onlyFor !== currentType) return;

        var label = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = test;
        cb.name = "specific-test";
        // Restore check state if still visible
        if (previouslyChecked.indexOf(test) !== -1) cb.checked = true;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(test));
        testsDiv.appendChild(label);
    });

    updateElectricArcColoursSection();
    updatePerformanceSectionVisibility();
}

function updateFirstMasterColour() {
    var select = document.getElementById("first-master-colour");
    var currentValue = select.value;
    select.innerHTML = "";

    var selectedColours = getSelectedCheckboxes("product-colour");

    if (selectedColours.length === 0) {
        select.appendChild(new Option("-- Select a colour first --", ""));
        return;
    }

    select.appendChild(new Option("-- Select --", ""));
    selectedColours.forEach(function (colour) {
        select.appendChild(new Option(colour, colour));
    });

    if (selectedColours.indexOf(currentValue) !== -1) {
        select.value = currentValue;
    }
}

function updateElectricArcColoursSection() {
    var hasBoxTest = document.querySelector('input[name="specific-test"][value="Electric arc (box test)"]:checked');
    var hasOpenArc = document.querySelector('input[name="specific-test"][value="Electric arc (open arc)"]:checked');
    var hasArc = hasBoxTest || hasOpenArc;

    var group = document.getElementById("electric-arc-colours-group");
    group.classList.toggle("hidden", !hasArc);

    if (hasArc) {
        var container = document.getElementById("electric-arc-colours");
        var currentlyChecked = getSelectedCheckboxes("electric-arc-colour");
        container.innerHTML = "";

        getSelectedCheckboxes("product-colour").forEach(function (colour) {
            var label = document.createElement("label");
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.value = colour;
            cb.name = "electric-arc-colour";
            if (currentlyChecked.indexOf(colour) !== -1) cb.checked = true;
            label.appendChild(cb);
            label.appendChild(document.createTextNode(colour));
            container.appendChild(label);
        });
    }
}

function updatePerformanceSectionVisibility() {
    var hasBoxTest = document.querySelector('input[name="specific-test"][value="Electric arc (box test)"]:checked');
    var hasOpenArc = document.querySelector('input[name="specific-test"][value="Electric arc (open arc)"]:checked');
    var hasESD = document.querySelector('input[name="specific-test"][value="ESD"]:checked');
    var hasArc = hasBoxTest || hasOpenArc;
    var hasAny = hasArc || hasESD;

    document.getElementById("performance-tests-section").classList.toggle("hidden", !hasAny);
    document.getElementById("perf-arc-section").classList.toggle("hidden", !hasArc);
    document.getElementById("perf-esd-section").classList.toggle("hidden", !hasESD);

    if (hasAny) {
        updatePerfColoursFromProject();
        updatePerfSizes();
    }
}

function updatePerfColoursFromProject() {
    var projectColours = getSelectedCheckboxes("product-colour");

    [["perf-arc-colours", "perf-arc-colour"], ["perf-esd-colours", "perf-esd-colour"]].forEach(function (pair) {
        var container = document.getElementById(pair[0]);
        var name = pair[1];
        var currentlyChecked = getSelectedCheckboxes(name);
        container.innerHTML = "";

        projectColours.forEach(function (colour) {
            var label = document.createElement("label");
            var cb = document.createElement("input");
            cb.type = "checkbox";
            cb.value = colour;
            cb.name = name;
            if (currentlyChecked.indexOf(colour) !== -1) cb.checked = true;
            label.appendChild(cb);
            label.appendChild(document.createTextNode(colour));
            container.appendChild(label);
        });
    });
}

function updatePerfSizes() {
    var bottoms = (document.getElementById("product-type").value === "Lower body garments / bottoms");
    var allSizes;

    if (bottoms) {
        allSizes = [];
        getSelectedCheckboxes("size-opening").forEach(function (sz) {
            getSelectedCheckboxes("leg-length").forEach(function (leg) {
                allSizes.push(sz + "/" + leg);
            });
        });
    } else {
        allSizes = getSelectedCheckboxes("size-opening");
    }

    ["perf-arc-size", "perf-esd-size"].forEach(function (selectId) {
        var sel = document.getElementById(selectId);
        var currentValue = sel.value;
        sel.innerHTML = "";

        if (allSizes.length === 0) {
            sel.appendChild(new Option("-- Select a size first --", ""));
            return;
        }

        sel.appendChild(new Option("-- Select --", ""));
        allSizes.forEach(function (sz) {
            sel.appendChild(new Option(sz, sz));
        });

        if (allSizes.indexOf(currentValue) !== -1) sel.value = currentValue;
    });
}

function updateShootingColours() {
    var container = document.getElementById("colour-shooting");
    var currentlyChecked = getSelectedCheckboxes("colour-shooting");
    container.innerHTML = "";

    var selectedColours = getSelectedCheckboxes("product-colour");

    selectedColours.forEach(function (colour) {
        var label = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = colour;
        cb.name = "colour-shooting";
        if (currentlyChecked.indexOf(colour) !== -1) cb.checked = true;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(colour));
        container.appendChild(label);
    });
}

function updateSizeOpening() {
    var system = document.getElementById("size-system").value;
    var group = document.getElementById("size-opening-group");
    var container = document.getElementById("size-opening");
    container.innerHTML = "";

    if (!system) {
        group.classList.add("hidden");
        return;
    }

    group.classList.remove("hidden");
    var sizes = SIZE_SYSTEMS[system];

    sizes.forEach(function (sz) {
        var label = document.createElement("label");
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = sz;
        cb.name = "size-opening";
        label.appendChild(cb);
        label.appendChild(document.createTextNode(sz));
        container.appendChild(label);
    });

    // Clear dependent fields
    document.getElementById("base-size").innerHTML = '<option value="">-- Select a size system first --</option>';
    document.getElementById("size-combinations-grid").innerHTML = "";
    document.getElementById("smallest-size").innerHTML = '<option value="">-- Select --</option>';
    document.getElementById("base-size-bottoms").innerHTML = '<option value="">-- Select --</option>';
    document.getElementById("largest-size").innerHTML = '<option value="">-- Select --</option>';
}

function onSizeOpeningChange() {
    var checkedSizes = getSelectedCheckboxes("size-opening");
    var bottoms = (document.getElementById("product-type").value === "Lower body garments / bottoms");

    if (bottoms) {
        updateBottomsGrid();
    } else {
        updateBaseSizesFromOpening(checkedSizes);
    }
    updatePerfSizes();
}

function updateBaseSizesFromOpening(checkedSizes) {
    var baseSelect = document.getElementById("base-size");
    var currentValue = baseSelect.value;
    baseSelect.innerHTML = "";

    if (checkedSizes.length === 0) {
        var opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "-- Select a size first --";
        baseSelect.appendChild(opt);
        return;
    }

    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Select --";
    baseSelect.appendChild(placeholder);

    checkedSizes.forEach(function (sz) {
        var opt = document.createElement("option");
        opt.value = sz;
        opt.textContent = sz;
        baseSelect.appendChild(opt);
    });

    if (checkedSizes.indexOf(currentValue) !== -1) {
        baseSelect.value = currentValue;
    }
}

function updateBottomsGrid() {
    var checkedSizes = getSelectedCheckboxes("size-opening");
    var checkedLegs = getSelectedCheckboxes("leg-length");

    // Build visual grid
    var gridTable = document.getElementById("size-combinations-grid");
    gridTable.innerHTML = "";

    if (checkedSizes.length === 0 || checkedLegs.length === 0) {
        // Clear dropdowns
        document.getElementById("smallest-size").innerHTML = '<option value="">-- Select --</option>';
        document.getElementById("base-size-bottoms").innerHTML = '<option value="">-- Select --</option>';
        document.getElementById("largest-size").innerHTML = '<option value="">-- Select --</option>';
        return;
    }

    // Header row: empty cell + leg lengths
    var html = "<thead><tr><th></th>";
    checkedLegs.forEach(function (leg) {
        html += "<th>" + escapeHtml(leg) + "</th>";
    });
    html += "</tr></thead><tbody>";

    // One row per size
    var allCombinations = [];
    checkedSizes.forEach(function (sz) {
        html += "<tr><td><strong>" + escapeHtml(sz) + "</strong></td>";
        checkedLegs.forEach(function (leg) {
            var combo = sz + "/" + leg;
            allCombinations.push(combo);
            html += "<td>" + escapeHtml(combo) + "</td>";
        });
        html += "</tr>";
    });
    html += "</tbody>";
    gridTable.innerHTML = html;

    updatePerfSizes();

    // Populate the 3 dropdowns with all combinations
    var selects = ["smallest-size", "base-size-bottoms", "largest-size"];
    selects.forEach(function (id) {
        var sel = document.getElementById(id);
        var currentValue = sel.value;
        sel.innerHTML = "";

        var placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "-- Select --";
        sel.appendChild(placeholder);

        allCombinations.forEach(function (combo) {
            var opt = document.createElement("option");
            opt.value = combo;
            opt.textContent = combo;
            sel.appendChild(opt);
        });

        if (allCombinations.indexOf(currentValue) !== -1) {
            sel.value = currentValue;
        }
    });
}

// ----------------------------------------
// 6. Form Validation
// ----------------------------------------

function getSelectedCheckboxes(name) {
    var checked = [];
    document.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (cb) {
        checked.push(cb.value);
    });
    return checked;
}

function validateForm() {
    var valid = true;

    if (!document.getElementById("collection-name").value.trim()) valid = false;
    if (!document.getElementById("product-type").value) valid = false;
    if (getSelectedCheckboxes("product-colour").length === 0) valid = false;
    if (getSelectedCheckboxes("colour-shooting").length === 0) valid = false;
    if (!document.getElementById("size-system").value) valid = false;
    if (getSelectedCheckboxes("size-opening").length === 0) valid = false;
    if (getSelectedCheckboxes("target-market").length === 0) valid = false;

    var bottoms = (document.getElementById("product-type").value === "Lower body garments / bottoms");

    if (bottoms) {
        if (getSelectedCheckboxes("leg-length").length === 0) valid = false;
        if (!document.getElementById("smallest-size").value) valid = false;
        if (!document.getElementById("base-size-bottoms").value) valid = false;
        if (!document.getElementById("largest-size").value) valid = false;
    } else {
        if (!document.getElementById("base-size").value) valid = false;
    }

    // First master sample colour
    if (!document.getElementById("first-master-colour").value) valid = false;

    // Electric arc tests: colours required
    var hasBoxTest = document.querySelector('input[name="specific-test"][value="Electric arc (box test)"]:checked');
    var hasOpenArc = document.querySelector('input[name="specific-test"][value="Electric arc (open arc)"]:checked');
    if (hasBoxTest || hasOpenArc) {
        if (getSelectedCheckboxes("electric-arc-colour").length === 0) valid = false;
    }

    // Performance arc validation
    if (!document.getElementById("perf-arc-section").classList.contains("hidden")) {
        if (getSelectedCheckboxes("perf-arc-colour").length === 0) valid = false;
        if (getSelectedCheckboxes("perf-arc-type").length === 0) valid = false;
        if (getSelectedCheckboxes("perf-arc-drying").length === 0) valid = false;
        if (getSelectedCheckboxes("perf-arc-cycles").length === 0) valid = false;
        if (!document.getElementById("perf-arc-size").value) valid = false;
    }

    // Performance ESD validation
    if (!document.getElementById("perf-esd-section").classList.contains("hidden")) {
        if (getSelectedCheckboxes("perf-esd-colour").length === 0) valid = false;
        if (getSelectedCheckboxes("perf-esd-drying").length === 0) valid = false;
        if (getSelectedCheckboxes("perf-esd-cycles").length === 0) valid = false;
        if (!document.getElementById("perf-esd-size").value) valid = false;
    }

    document.getElementById("btn-calculate").disabled = !valid;
    return valid;
}

function collectFormState() {
    appState.collectionName = document.getElementById("collection-name").value.trim();
    appState.productType = document.getElementById("product-type").value;
    appState.productColours = getSelectedCheckboxes("product-colour");
    appState.coloursForShooting = getSelectedCheckboxes("colour-shooting");
    appState.sizeSystem = document.getElementById("size-system").value;
    appState.sizeOpening = getSelectedCheckboxes("size-opening");
    appState.targetMarket = getSelectedCheckboxes("target-market");
    appState.specificTests = getSelectedCheckboxes("specific-test");
    appState.firstMasterColour = document.getElementById("first-master-colour").value;
    appState.electricArcColours = getSelectedCheckboxes("electric-arc-colour");
    appState.perfArc = {
        colours: getSelectedCheckboxes("perf-arc-colour"),
        testTypes: getSelectedCheckboxes("perf-arc-type"),
        drying: getSelectedCheckboxes("perf-arc-drying"),
        cycles: getSelectedCheckboxes("perf-arc-cycles"),
        size: document.getElementById("perf-arc-size").value
    };
    appState.perfESD = {
        colours: getSelectedCheckboxes("perf-esd-colour"),
        drying: getSelectedCheckboxes("perf-esd-drying"),
        cycles: getSelectedCheckboxes("perf-esd-cycles"),
        size: document.getElementById("perf-esd-size").value
    };

    var bottoms = (appState.productType === "Lower body garments / bottoms");

    if (bottoms) {
        appState.legLengths = getSelectedCheckboxes("leg-length");
        appState.smallestSize = document.getElementById("smallest-size").value;
        appState.baseSize = document.getElementById("base-size-bottoms").value;
        appState.largestSize = document.getElementById("largest-size").value;
    } else {
        appState.baseSize = document.getElementById("base-size").value;
        appState.legLengths = [];
        appState.smallestSize = appState.sizeOpening[0] || "";
        appState.largestSize = appState.sizeOpening[appState.sizeOpening.length - 1] || "";
    }
}

function restoreFormFromState() {
    document.getElementById("collection-name").value = appState.collectionName || "";
    document.getElementById("product-type").value = appState.productType || "";

    // Restore colour checkboxes
    document.querySelectorAll('input[name="product-colour"]').forEach(function (cb) {
        cb.checked = (appState.productColours || []).indexOf(cb.value) !== -1;
    });

    updateShootingColours();
    document.querySelectorAll('input[name="colour-shooting"]').forEach(function (cb) {
        cb.checked = (appState.coloursForShooting || []).indexOf(cb.value) !== -1;
    });

    updateFirstMasterColour();
    document.getElementById("first-master-colour").value = appState.firstMasterColour || "";

    document.getElementById("size-system").value = appState.sizeSystem || "";

    // Rebuild size opening checkboxes
    updateSizeOpening();
    // Restore checked sizes
    if (appState.sizeOpening && appState.sizeOpening.length > 0) {
        document.querySelectorAll('input[name="size-opening"]').forEach(function (cb) {
            cb.checked = appState.sizeOpening.indexOf(cb.value) !== -1;
        });
    }

    // Update product type visibility (shows/hides bottoms fields)
    updateProductTypeVisibility();

    var bottoms = (appState.productType === "Lower body garments / bottoms");

    if (bottoms) {
        // Restore leg length checkboxes
        document.querySelectorAll('input[name="leg-length"]').forEach(function (cb) {
            cb.checked = (appState.legLengths || []).indexOf(cb.value) !== -1;
        });
        // Rebuild grid and dropdowns
        updateBottomsGrid();
        document.getElementById("smallest-size").value = appState.smallestSize || "";
        document.getElementById("base-size-bottoms").value = appState.baseSize || "";
        document.getElementById("largest-size").value = appState.largestSize || "";
    } else {
        // Rebuild base size dropdown from opening
        updateBaseSizesFromOpening(appState.sizeOpening || []);
        document.getElementById("base-size").value = appState.baseSize || "";
    }

    // Restore market checkboxes
    document.querySelectorAll('input[name="target-market"]').forEach(function (cb) {
        cb.checked = (appState.targetMarket || []).indexOf(cb.value) !== -1;
    });

    // Restore specific tests checkboxes
    document.querySelectorAll('input[name="specific-test"]').forEach(function (cb) {
        cb.checked = (appState.specificTests || []).indexOf(cb.value) !== -1;
    });

    // Restore arc colours + performance sections
    updateElectricArcColoursSection();
    document.querySelectorAll('input[name="electric-arc-colour"]').forEach(function (cb) {
        cb.checked = (appState.electricArcColours || []).indexOf(cb.value) !== -1;
    });

    updatePerformanceSectionVisibility();

    var pArc = appState.perfArc || {};
    document.querySelectorAll('input[name="perf-arc-colour"]').forEach(function (cb) {
        cb.checked = (pArc.colours || []).indexOf(cb.value) !== -1;
    });
    document.querySelectorAll('input[name="perf-arc-type"]').forEach(function (cb) {
        cb.checked = (pArc.testTypes || []).indexOf(cb.value) !== -1;
    });
    document.querySelectorAll('input[name="perf-arc-drying"]').forEach(function (cb) {
        cb.checked = (pArc.drying || []).indexOf(cb.value) !== -1;
    });
    document.querySelectorAll('input[name="perf-arc-cycles"]').forEach(function (cb) {
        cb.checked = (pArc.cycles || []).indexOf(cb.value) !== -1;
    });
    if (pArc.size) document.getElementById("perf-arc-size").value = pArc.size;

    var pESD = appState.perfESD || {};
    document.querySelectorAll('input[name="perf-esd-colour"]').forEach(function (cb) {
        cb.checked = (pESD.colours || []).indexOf(cb.value) !== -1;
    });
    document.querySelectorAll('input[name="perf-esd-drying"]').forEach(function (cb) {
        cb.checked = (pESD.drying || []).indexOf(cb.value) !== -1;
    });
    document.querySelectorAll('input[name="perf-esd-cycles"]').forEach(function (cb) {
        cb.checked = (pESD.cycles || []).indexOf(cb.value) !== -1;
    });
    if (pESD.size) document.getElementById("perf-esd-size").value = pESD.size;

    validateForm();
}

// ----------------------------------------
// 7. Sample Calculation Engine
// ----------------------------------------

function calculateSamples() {
    var C = appState.productColours.length;
    var M = appState.targetMarket.length;
    var tSpec = 0;

    appState.specificTests.forEach(function (testName) {
        var test = SPECIFIC_TESTS[testName];
        if (!test) return;
        if (test.requiresColourSelection) {
            tSpec += 2 * (appState.electricArcColours || []).length;
        } else if (test.samples) {
            tSpec += test.samples;
        }
    });

    var hasArc = appState.specificTests.indexOf("Electric arc (box test)") !== -1 ||
                 appState.specificTests.indexOf("Electric arc (open arc)") !== -1;
    var pArc = appState.perfArc || {};
    var perfArcCount = hasArc
        ? (pArc.colours || []).length * (pArc.testTypes || []).length *
          (pArc.drying || []).length * (pArc.cycles || []).length * 2
        : 0;

    var pESD = appState.perfESD || {};
    var perfESDCount = appState.specificTests.indexOf("ESD") !== -1
        ? (pESD.colours || []).length * (pESD.drying || []).length *
          (pESD.cycles || []).length * 3
        : 0;

    var total = 1 + (C * M) + M + (appState.coloursForShooting || []).length + tSpec + perfArcCount + perfESDCount;

    var samples = generateSampleInstances();

    return {
        total: total,
        samples: samples
    };
}

// ----------------------------------------
// 7b. Generate Concrete Sample Instances
// ----------------------------------------

function generateSampleInstances() {
    var bottoms = (appState.productType === "Lower body garments / bottoms");
    var sizeMin, sizeMax, sizeBase;

    if (bottoms) {
        sizeMin = appState.smallestSize;
        sizeMax = appState.largestSize;
        sizeBase = appState.baseSize;
    } else {
        sizeMin = appState.sizeOpening[0];
        sizeMax = appState.sizeOpening[appState.sizeOpening.length - 1];
        sizeBase = appState.baseSize;
    }

    var C = appState.productColours.length;
    var samples = [];
    var counter = 1;

    // 0. First master sample: 1 sample (wardrobe, user-selected colour, base size)
    samples.push({
        id: "#" + counter++,
        colour: appState.firstMasterColour || (appState.productColours[0] || ""),
        size: sizeBase,
        source: "First master sample",
        destructive: false,
        wardrobe: true
    });

    // 1. Wash tests: C × M samples (destructive)
    var isFirstWash = true;
    appState.targetMarket.forEach(function (market) {
        appState.productColours.forEach(function (colour) {
            var size = sizeBase;
            // First wash test gets sizeMax to cover Size Set Control
            if (isFirstWash && sizeMax !== sizeBase) {
                size = sizeMax;
                isFirstWash = false;
            }
            samples.push({
                id: "#" + counter++,
                colour: colour,
                size: size,
                source: "Wash tests",
                destructive: true
            });
        });
    });

    // 2. Personalization guide: M samples (destructive, sizeMin)
    var colourIndex = 0;
    appState.targetMarket.forEach(function (market) {
        var colour = appState.productColours[colourIndex % C];
        samples.push({
            id: "#" + counter++,
            colour: colour,
            size: sizeMin,
            source: "Personalization guide",
            destructive: true
        });
        colourIndex++;
    });

    // 3. Photo shooting: 1 sample per shooting colour (non-destructive, sizeBase)
    appState.coloursForShooting.forEach(function (colour) {
        samples.push({
            id: "#" + counter++,
            colour: colour,
            size: sizeBase,
            source: "Photo shooting",
            destructive: false
        });
    });

    // 4. Specific tests
    appState.specificTests.forEach(function (testName) {
        var test = SPECIFIC_TESTS[testName];
        if (!test) return;

        if (test.requiresColourSelection) {
            // Electric arc tests: 2 samples per colour, fixed size L
            (appState.electricArcColours || []).forEach(function (colour) {
                for (var i = 0; i < 2; i++) {
                    samples.push({
                        id: "#" + counter++,
                        colour: colour,
                        size: "L",
                        source: testName,
                        destructive: true
                    });
                }
            });
        } else {
            for (var i = 0; i < test.samples; i++) {
                var testSize = sizeBase;
                if (test.sizes[i] === "min") testSize = sizeMin;
                else if (test.sizes[i] === "max") testSize = sizeMax;
                else if (test.sizes[i] === "base") testSize = sizeBase;

                samples.push({
                    id: "#" + counter++,
                    colour: appState.productColours[0],
                    size: testSize,
                    source: testName,
                    destructive: test.destructive
                });
            }
        }
    });

    // 5. Performance tests — Electric arc
    var hasArc = appState.specificTests.indexOf("Electric arc (box test)") !== -1 ||
                 appState.specificTests.indexOf("Electric arc (open arc)") !== -1;
    var pArc = appState.perfArc || {};
    if (hasArc && (pArc.colours || []).length > 0) {
        (pArc.colours || []).forEach(function (colour) {
            (pArc.testTypes || []).forEach(function (testType) {
                (pArc.drying || []).forEach(function (drying) {
                    (pArc.cycles || []).forEach(function (cycle) {
                        for (var i = 0; i < 2; i++) {
                            samples.push({
                                id: "#" + counter++,
                                colour: colour,
                                size: pArc.size || sizeBase,
                                source: "Perf - Electric arc",
                                destructive: true
                            });
                        }
                    });
                });
            });
        });
    }

    // 6. Performance tests — ESD
    var pESD = appState.perfESD || {};
    if (appState.specificTests.indexOf("ESD") !== -1 && (pESD.colours || []).length > 0) {
        (pESD.colours || []).forEach(function (colour) {
            (pESD.drying || []).forEach(function (drying) {
                (pESD.cycles || []).forEach(function (cycle) {
                    for (var i = 0; i < 3; i++) {
                        samples.push({
                            id: "#" + counter++,
                            colour: colour,
                            size: pESD.size || sizeBase,
                            source: "Perf - ESD",
                            destructive: true
                        });
                    }
                });
            });
        });
    }

    return samples;
}

// ----------------------------------------
// 7c. Build Order Grid (Colour × Size)
// ----------------------------------------

function buildOrderGrid(samples) {
    var bottoms = (appState.productType === "Lower body garments / bottoms");
    var allSizes;

    if (bottoms) {
        allSizes = [];
        appState.sizeOpening.forEach(function (sz) {
            appState.legLengths.forEach(function (leg) {
                allSizes.push(sz + "/" + leg);
            });
        });
    } else {
        allSizes = appState.sizeOpening;
    }

    // Collect unique sizes used, sorted by allSizes order
    var usedSizesSet = {};
    samples.forEach(function (s) { usedSizesSet[s.size] = true; });
    var usedSizes = allSizes.filter(function (sz) { return usedSizesSet[sz]; });

    // Build grid: { colour -> { size -> count } }
    var grid = {};
    appState.productColours.forEach(function (colour) {
        grid[colour] = {};
        usedSizes.forEach(function (sz) { grid[colour][sz] = 0; });
    });

    samples.forEach(function (s) {
        if (grid[s.colour] !== undefined) {
            grid[s.colour][s.size] = (grid[s.colour][s.size] || 0) + 1;
        }
    });

    return {
        sizes: usedSizes,
        colours: appState.productColours,
        grid: grid
    };
}

// ----------------------------------------
// 7d. Build Action Flow (stock tracking)
// ----------------------------------------

function buildActionFlow(samples) {
    var bottoms = (appState.productType === "Lower body garments / bottoms");
    var sizeMin, sizeMax, sizeBase;

    if (bottoms) {
        sizeMin = appState.smallestSize;
        sizeMax = appState.largestSize;
        sizeBase = appState.baseSize;
    } else {
        sizeMin = appState.sizeOpening[0];
        sizeMax = appState.sizeOpening[appState.sizeOpening.length - 1];
        sizeBase = appState.baseSize;
    }

    // Define ordered actions — Photo shooting always last
    var actions = [
        { name: "First master sample", destructive: false, wardrobe: true }
    ];

    // Arc tests after first master sample
    ["Electric arc (box test)", "Electric arc (open arc)"].forEach(function (testName) {
        if (appState.specificTests.indexOf(testName) !== -1) {
            actions.push({ name: testName, destructive: true });
        }
    });

    // ESD after arc tests
    if (appState.specificTests.indexOf("ESD") !== -1) {
        actions.push({ name: "ESD", destructive: true });
    }

    actions.push({ name: "Size set control", destructive: false });
    actions.push({ name: "Wash tests", destructive: true });
    actions.push({ name: "Personalization guide", destructive: true });

    // Knee pocket and High visibility
    ["Knee pocket", "High visibility"].forEach(function (testName) {
        if (appState.specificTests.indexOf(testName) !== -1) {
            var test = SPECIFIC_TESTS[testName];
            if (test) {
                actions.push({ name: testName, destructive: test.destructive });
            }
        }
    });

    // Performance tests
    var hasArcInFlow = appState.specificTests.indexOf("Electric arc (box test)") !== -1 ||
                       appState.specificTests.indexOf("Electric arc (open arc)") !== -1;
    if (hasArcInFlow && ((appState.perfArc || {}).colours || []).length > 0) {
        actions.push({ name: "Perf - Electric arc", destructive: true });
    }
    if (appState.specificTests.indexOf("ESD") !== -1 && ((appState.perfESD || {}).colours || []).length > 0) {
        actions.push({ name: "Perf - ESD", destructive: true });
    }

    // Photo shooting always last
    actions.push({ name: "Photo shooting", destructive: false });

    // Track stock
    var stockIds = samples.map(function (s) { return s.id; });
    var flow = [];

    actions.forEach(function (action) {
        var usedSamples = [];

        if (action.name === "Size set control") {
            var neededSizes = [sizeMin, sizeBase, sizeMax];
            var uniqueSizes = [];
            neededSizes.forEach(function (sz) {
                if (uniqueSizes.indexOf(sz) === -1) uniqueSizes.push(sz);
            });

            uniqueSizes.forEach(function (sz) {
                for (var i = 0; i < samples.length; i++) {
                    if (samples[i].size === sz && stockIds.indexOf(samples[i].id) !== -1) {
                        usedSamples.push(samples[i]);
                        break;
                    }
                }
            });
        } else {
            samples.forEach(function (s) {
                if (s.source === action.name && stockIds.indexOf(s.id) !== -1) {
                    usedSamples.push(s);
                }
            });
        }

        // Update stock: remove destroyed samples (and wardrobe samples)
        if (action.destructive || action.wardrobe) {
            usedSamples.forEach(function (s) {
                var idx = stockIds.indexOf(s.id);
                if (idx !== -1) stockIds.splice(idx, 1);
            });
        }

        var remainingStock = samples.filter(function (s) {
            return stockIds.indexOf(s.id) !== -1;
        });

        flow.push({
            action: action.name,
            destructive: action.destructive,
            wardrobe: action.wardrobe || false,
            used: usedSamples,
            remainingStock: remainingStock
        });
    });

    return flow;
}

// ----------------------------------------
// 8. Dashboard Rendering
// ----------------------------------------

function renderDashboard() {
    var result = appState.calculationResult;
    var bottoms = (appState.productType === "Lower body garments / bottoms");

    // Project summary
    var summaryDiv = document.getElementById("project-summary");
    var summaryHtml =
        "<div><strong>Collection:</strong> " + escapeHtml(appState.collectionName) + "</div>" +
        "<div><strong>Product type:</strong> " + escapeHtml(appState.productType) + "</div>" +
        "<div><strong>Colours:</strong> " + escapeHtml(appState.productColours.join(", ")) + "</div>" +
        "<div><strong>Shooting colour(s):</strong> " + escapeHtml((appState.coloursForShooting || []).join(", ")) + "</div>" +
        "<div><strong>First master colour:</strong> " + escapeHtml(appState.firstMasterColour || "") + "</div>" +
        "<div><strong>Size system:</strong> " + escapeHtml(appState.sizeSystem) + "</div>" +
        "<div><strong>Size opening:</strong> " + escapeHtml(appState.sizeOpening.join(", ")) + "</div>";

    if (bottoms) {
        summaryHtml += "<div><strong>Leg lengths:</strong> " + escapeHtml(appState.legLengths.join(", ")) + "</div>";
        summaryHtml += "<div><strong>Smallest size:</strong> " + escapeHtml(appState.smallestSize) + "</div>";
        summaryHtml += "<div><strong>Base size:</strong> " + escapeHtml(appState.baseSize) + "</div>";
        summaryHtml += "<div><strong>Largest size:</strong> " + escapeHtml(appState.largestSize) + "</div>";
    } else {
        summaryHtml += "<div><strong>Base size:</strong> " + escapeHtml(appState.baseSize) + "</div>";
    }

    summaryHtml += "<div><strong>Target market:</strong> " + escapeHtml(appState.targetMarket.join(", ")) + "</div>";

    if (appState.specificTests.length > 0) {
        summaryHtml += "<div><strong>Specific tests:</strong> " + escapeHtml(appState.specificTests.join(", ")) + "</div>";
    }
    if ((appState.electricArcColours || []).length > 0) {
        summaryHtml += "<div><strong>Arc test colours:</strong> " + escapeHtml(appState.electricArcColours.join(", ")) + "</div>";
    }
    var pArc = appState.perfArc || {};
    if ((pArc.colours || []).length > 0) {
        summaryHtml += "<div><strong>Perf arc:</strong> " + escapeHtml(
            (pArc.testTypes || []).join("+") + " | " +
            (pArc.drying || []).join("+") + " | " +
            (pArc.cycles || []).join("c, ") + "c | size " + (pArc.size || "")
        ) + "</div>";
    }
    var pESD = appState.perfESD || {};
    if ((pESD.colours || []).length > 0) {
        summaryHtml += "<div><strong>Perf ESD:</strong> " + escapeHtml(
            (pESD.drying || []).join("+") + " | " +
            (pESD.cycles || []).join("c, ") + "c | size " + (pESD.size || "")
        ) + "</div>";
    }

    summaryHtml += "<div><strong>Total samples:</strong> " + result.total + "</div>";
    summaryDiv.innerHTML = summaryHtml;

    // Render Order Grid
    var orderGrid = buildOrderGrid(result.samples);
    renderOrderGrid(orderGrid);

    // Render Action Flow
    var actionFlow = buildActionFlow(result.samples);
    renderActionFlow(actionFlow);
}

// ----------------------------------------
// 8b. Render Order Grid (Tableau 1)
// ----------------------------------------

function renderOrderGrid(data) {
    var table = document.getElementById("order-grid");
    var html = "";

    // Wrap in scrollable div for wide tables
    html += "<thead><tr><th></th>";
    data.sizes.forEach(function (sz) {
        html += "<th>" + escapeHtml(sz) + "</th>";
    });
    html += "<th>Total</th></tr></thead>";

    html += "<tbody>";
    var colTotals = {};
    data.sizes.forEach(function (sz) { colTotals[sz] = 0; });
    var grandTotal = 0;

    data.colours.forEach(function (colour) {
        html += "<tr><td><strong>" + escapeHtml(colour) + "</strong></td>";
        var rowTotal = 0;
        data.sizes.forEach(function (sz) {
            var count = data.grid[colour][sz] || 0;
            rowTotal += count;
            colTotals[sz] += count;
            var cellClass = count === 0 ? ' class="cell-zero"' : "";
            html += "<td" + cellClass + ">" + count + "</td>";
        });
        grandTotal += rowTotal;
        html += "<td><strong>" + rowTotal + "</strong></td></tr>";
    });
    html += "</tbody>";

    html += "<tfoot><tr><td><strong>Total</strong></td>";
    data.sizes.forEach(function (sz) {
        html += "<td><strong>" + colTotals[sz] + "</strong></td>";
    });
    html += "<td><strong>" + grandTotal + "</strong></td></tr></tfoot>";

    table.innerHTML = html;
}

// ----------------------------------------
// 8c. Render Sample Chip (coloured square)
// ----------------------------------------

function renderSampleChip(sample) {
    var css = COLOUR_CSS[sample.colour] || { bg: "#eee", border: "#999", text: "#333" };
    return '<span class="sample-chip" style="' +
        "background:" + css.bg + ";" +
        "border-color:" + css.border + ";" +
        "color:" + css.text + ";" +
        '">' + escapeHtml(sample.size) + "</span>";
}

function renderSampleChips(sampleList) {
    if (sampleList.length === 0) return "—";
    return sampleList.map(renderSampleChip).join("");
}

// ----------------------------------------
// 8d. Render Action Flow (Tableau 2)
// ----------------------------------------

function renderActionFlow(flow) {
    var table = document.getElementById("action-flow");
    var html = "";

    html += "<thead><tr>";
    html += "<th>#</th>";
    html += "<th>Action</th>";
    html += "<th>Samples used</th>";
    html += "<th>Remaining stock</th>";
    html += "</tr></thead>";

    html += "<tbody>";
    flow.forEach(function (step, index) {
        var destructLabel;
        if (step.wardrobe) {
            destructLabel = '<span class="tag-wardrobe">wardrobe</span>';
        } else if (step.destructive) {
            destructLabel = '<span class="tag-destructive">destructive</span>';
        } else {
            destructLabel = '<span class="tag-safe">non-destructive</span>';
        }

        html += "<tr>";
        html += "<td>" + (index + 1) + "</td>";
        html += "<td>" + escapeHtml(step.action) + " " + destructLabel + "</td>";
        html += "<td>" + renderSampleChips(step.used) + "</td>";
        html += "<td>" + renderSampleChips(step.remainingStock) + "</td>";
        html += "</tr>";
    });
    html += "</tbody>";

    table.innerHTML = html;
}

function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

// ----------------------------------------
// 9. Import / Export
// ----------------------------------------

function exportProject() {
    var data = JSON.stringify(appState, null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);

    var now = new Date();
    var dateStr = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

    var a = document.createElement("a");
    a.href = url;
    a.download = "samples_" + dateStr + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportExcel() {
    var result = appState.calculationResult;
    if (!result) return;

    var orderGrid = buildOrderGrid(result.samples);
    var actionFlow = buildActionFlow(result.samples);

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';

    // Styles
    xml += '<Styles>\n';
    xml += '<Style ss:ID="Default"><Font ss:Size="11"/></Style>\n';
    xml += '<Style ss:ID="Header"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#F0F0F0" ss:Pattern="Solid"/></Style>\n';
    xml += '<Style ss:ID="Bold"><Font ss:Bold="1" ss:Size="11"/></Style>\n';
    xml += '<Style ss:ID="Footer"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#F8F8F8" ss:Pattern="Solid"/></Style>\n';
    xml += '</Styles>\n';

    // Sheet 1: Samples to order
    xml += '<Worksheet ss:Name="Samples to order">\n<Table>\n';

    xml += '<Row ss:StyleID="Header">';
    xml += '<Cell><Data ss:Type="String"></Data></Cell>';
    orderGrid.sizes.forEach(function (sz) {
        xml += '<Cell><Data ss:Type="String">' + escapeXml(sz) + '</Data></Cell>';
    });
    xml += '<Cell><Data ss:Type="String">Total</Data></Cell>';
    xml += '</Row>\n';

    var colTotals = {};
    orderGrid.sizes.forEach(function (sz) { colTotals[sz] = 0; });
    var grandTotal = 0;

    orderGrid.colours.forEach(function (colour) {
        xml += '<Row>';
        xml += '<Cell ss:StyleID="Bold"><Data ss:Type="String">' + escapeXml(colour) + '</Data></Cell>';
        var rowTotal = 0;
        orderGrid.sizes.forEach(function (sz) {
            var count = orderGrid.grid[colour][sz] || 0;
            rowTotal += count;
            colTotals[sz] += count;
            xml += '<Cell><Data ss:Type="Number">' + count + '</Data></Cell>';
        });
        grandTotal += rowTotal;
        xml += '<Cell ss:StyleID="Bold"><Data ss:Type="Number">' + rowTotal + '</Data></Cell>';
        xml += '</Row>\n';
    });

    xml += '<Row ss:StyleID="Footer">';
    xml += '<Cell><Data ss:Type="String">Total</Data></Cell>';
    orderGrid.sizes.forEach(function (sz) {
        xml += '<Cell><Data ss:Type="Number">' + colTotals[sz] + '</Data></Cell>';
    });
    xml += '<Cell><Data ss:Type="Number">' + grandTotal + '</Data></Cell>';
    xml += '</Row>\n';

    xml += '</Table>\n</Worksheet>\n';

    // Sheet 2: Sample flow
    xml += '<Worksheet ss:Name="Sample flow">\n<Table>\n';

    xml += '<Row ss:StyleID="Header">';
    xml += '<Cell><Data ss:Type="String">#</Data></Cell>';
    xml += '<Cell><Data ss:Type="String">Action</Data></Cell>';
    xml += '<Cell><Data ss:Type="String">Destructive</Data></Cell>';
    xml += '<Cell><Data ss:Type="String">Samples used</Data></Cell>';
    xml += '<Cell><Data ss:Type="String">Remaining stock</Data></Cell>';
    xml += '</Row>\n';

    actionFlow.forEach(function (step, index) {
        var usedText = step.used.map(function (s) {
            return s.colour + " / " + s.size;
        }).join(", ");
        if (usedText === "") usedText = "-";

        var remainingText = step.remainingStock.map(function (s) {
            return s.colour + " / " + s.size;
        }).join(", ");
        if (remainingText === "") remainingText = "-";

        xml += '<Row>';
        xml += '<Cell><Data ss:Type="Number">' + (index + 1) + '</Data></Cell>';
        xml += '<Cell><Data ss:Type="String">' + escapeXml(step.action) + '</Data></Cell>';
        xml += '<Cell><Data ss:Type="String">' + (step.destructive ? "Yes" : "No") + '</Data></Cell>';
        xml += '<Cell><Data ss:Type="String">' + escapeXml(usedText) + '</Data></Cell>';
        xml += '<Cell><Data ss:Type="String">' + escapeXml(remainingText) + '</Data></Cell>';
        xml += '</Row>\n';
    });

    xml += '</Table>\n</Worksheet>\n';
    xml += '</Workbook>';

    var blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    var url = URL.createObjectURL(blob);

    var now = new Date();
    var dateStr = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");

    var a = document.createElement("a");
    a.href = url;
    a.download = "samples_" + dateStr + ".xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeXml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function importProject(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var imported = JSON.parse(e.target.result);

            // Migration: add new fields if missing (old JSON format)
            if (!imported.sizeOpening) imported.sizeOpening = [];
            if (!imported.legLengths) imported.legLengths = [];
            if (!imported.smallestSize) imported.smallestSize = "";
            if (!imported.largestSize) imported.largestSize = "";
            // Migration: colourForShooting (single) → coloursForShooting (array)
            if (!imported.coloursForShooting) {
                imported.coloursForShooting = imported.colourForShooting ? [imported.colourForShooting] : [];
            }
            if (!imported.firstMasterColour) imported.firstMasterColour = "";
            if (!imported.electricArcColours) imported.electricArcColours = [];
            if (!imported.perfArc) imported.perfArc = { colours: [], testTypes: [], drying: [], cycles: [], size: "" };
            if (!imported.perfESD) imported.perfESD = { colours: [], drying: [], cycles: [], size: "" };

            appState = imported;
            saveState();

            if (appState.calculationResult) {
                renderDashboard();
                navigateTo("page-dashboard");
            } else {
                navigateTo("page-config");
                restoreFormFromState();
            }
        } catch (err) {
            alert("Invalid file. Please select a valid project JSON file.");
        }
    };
    reader.readAsText(file);
}

// ----------------------------------------
// 10. Event Bindings & Initialization
// ----------------------------------------

document.addEventListener("DOMContentLoaded", function () {
    initForm();

    // Home page buttons
    document.getElementById("btn-create").addEventListener("click", function () {
        appState = JSON.parse(JSON.stringify(defaultState));
        saveState();
        restoreFormFromState();
        navigateTo("page-config");
    });

    document.getElementById("btn-import").addEventListener("click", function () {
        document.getElementById("import-file").click();
    });

    document.getElementById("import-file").addEventListener("change", function (e) {
        if (e.target.files.length > 0) {
            importProject(e.target.files[0]);
            e.target.value = "";
        }
    });

    // Product type change → visibility + specific tests
    document.getElementById("product-type").addEventListener("change", function () {
        updateProductTypeVisibility();
        validateForm();
    });

    // Colour checkboxes → shooting colour dropdown + first master + arc/perf colours
    document.getElementById("product-colours").addEventListener("change", function () {
        updateShootingColours();
        updateFirstMasterColour();
        updateElectricArcColoursSection();
        updatePerfColoursFromProject();
        validateForm();
    });

    // Specific tests → arc colour section + performance section
    document.getElementById("specific-tests").addEventListener("change", function () {
        updateElectricArcColoursSection();
        updatePerformanceSectionVisibility();
        validateForm();
    });

    // Size system change → rebuild size opening
    document.getElementById("size-system").addEventListener("change", function () {
        updateSizeOpening();
        validateForm();
    });

    // Size opening checkboxes → base size (tops) or grid (bottoms)
    document.getElementById("size-opening").addEventListener("change", function () {
        onSizeOpeningChange();
        validateForm();
    });

    // Leg lengths checkboxes → rebuild grid (bottoms)
    document.getElementById("leg-lengths").addEventListener("change", function () {
        updateBottomsGrid();
        validateForm();
    });

    // Validate on any form change
    document.getElementById("config-form").addEventListener("input", validateForm);
    document.getElementById("config-form").addEventListener("change", validateForm);

    // Calculate button
    document.getElementById("btn-calculate").addEventListener("click", function () {
        collectFormState();
        appState.calculationResult = calculateSamples();
        saveState();
        renderDashboard();
        navigateTo("page-dashboard");
    });

    // Dashboard buttons
    document.getElementById("btn-export").addEventListener("click", exportProject);
    document.getElementById("btn-export-excel").addEventListener("click", exportExcel);

    document.getElementById("btn-back-config").addEventListener("click", function () {
        navigateTo("page-config");
        restoreFormFromState();
    });

    document.getElementById("btn-back-home").addEventListener("click", function () {
        navigateTo("page-home");
    });

    // Start on home page
    navigateTo("page-home");
});
