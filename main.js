let blankRe = /^$/;
let collectStartRe = /^GC\(.+\) =+/;
let sliceStartRe = /^  ---- Slice \d+ ----/;
let totalsStartRe = /^  ---- Totals ----/;
let timeRe = /^    ( *)([\w ]+): ([\d\.]+)ms/

let state;
let outputDiv;
let collectionCount;
let collectionLines;
let sliceTimes;
let sliceLines;

function processLog()
{
    state = "top";
    collectionCount = 0;
    outputDiv = document.getElementById("outputDiv");
    let data = document.getElementById("inputText").value;
    data.split("\n").forEach(line => {
        switch (state) {
        case "top":
            if (line.match(collectStartRe))
                startCollection();
            break;

        case "collection":
            if (line.match(sliceStartRe))
                startSlice();
            else
                collectionLines.push(line);
            break;

        case "slice":
            if (line.match(sliceStartRe)) {
                startSlice();
            } else if (line.match(totalsStartRe)) {
                startTotals();
            } else {
                let match = line.match(timeRe);
                if (match)
                    processTimes(...match);
                else
                    sliceLines.push(line);
            }
            break;

        case "totals":
            if (line.match(blankRe))
                state = "top";
            break;
        }
    });
}

function startCollection()
{
    collectionLines = [];
    state = "collection";
}

function finishCollection()
{
    collectionCount++;
    renderCollection();
    collectionLines = null;
}

function startSlice()
{
    if (collectionLines)
        finishCollection();
    if (sliceTimes)
        finishSlice();
    sliceTimes = [];
    sliceLines = []
    state = "slice";
}

function finishSlice()
{
    renderSlice();
    sliceTimes = null;
    sliceLines = null;
}

function startTotals()
{
    finishSlice();
    state = "totals";
}

function processTimes(line, indent, label, timeStr)
{
    let level = indent.length / 2;
    let time = parseFloat(timeStr);
    if (level === 1 && !ignorePhase(label))
        sliceTimes.push([label, time]);
    sliceLines.push(line);
}

function renderCollection()
{
    let node = document.createElement("p");
    node.textContent = `Collection ${collectionCount}`;
    node.title = collectionLines.join("\n");
    outputDiv.appendChild(node);
}

function renderSlice()
{
    const scalePixelsPerMs = 100 / 10;
    const sliceHeightPixels = 10;
    
    let totalTime = 0;
    sliceTimes.forEach(a => {
        let [label, time] = a;
        totalTime += time;
    });

    let canvas = document.createElement("canvas");
    canvas.width = totalTime * scalePixelsPerMs;
    canvas.height = sliceHeightPixels;
    canvas.title = sliceLines.join("\n");

    let x = 0;
    let ctx = canvas.getContext("2d");
    sliceTimes.forEach(a => {
        let [label, time] = a;
        let x1 = x + time * scalePixelsPerMs;
        ctx.fillStyle = mapColour(label);
        ctx.fillRect(x, 0, x1, sliceHeightPixels);
        x = x1;
    });

    let div = document.createElement("div");
    div.appendChild(canvas);
    outputDiv.appendChild(div);
}

function ignorePhase(label)
{
    // These things happen between slices so are ignored.
    switch (label) {
    case "All Minor GCs":
    case "Minor GCs to Evict Nursery":
    case "Trace Heap":
    case "Barriers":
    case "Unmark gray":
        return true;
    default:
        return false;
    }
}

function mapColour(label)
{
    switch (label) {
    case "Wait Background Thread":
        return "pink";
    case "Mark Discard Code":
        return "darksalmon";
    case "Relazify Functions":
        return "indianred";
    case "Purge ShapeTables":
        return "firebrick";
    case "Purge":
        return "darkred";
    case "Mark":
        return "yellow";
    case "Sweep":
        return "orange";
    case "Compact":
        return "red";
    case "Begin Callback":
    case "End Callback":
        return "palevioletred";
    default:
        return "magenta";
    }
}
