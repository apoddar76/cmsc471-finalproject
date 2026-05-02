const width = 920;
const height = 720;
const margin = { top: 70, right: 40, bottom: 70, left: 40 };
const behaviorChartWidth = 920;
const behaviorChartHeight = 450;
const behaviorChartMargin = { top: 70, right: 34, bottom: 102, left: 70 };
const interactionChartWidth = 920;
const interactionChartHeight = 700;
const interactionChartMargin = { top: 88, right: 34, bottom: 120, left: 80 };
/** Space below SVG title/subtitle before the 2×2 grid. */
const interactionPlotGridTopPad = 28;

const behaviorOptions = [
    { value: "all", label: "All behaviors" },
    { value: "running", label: "Running" },
    { value: "chasing", label: "Chasing" },
    { value: "climbing", label: "Climbing" },
    { value: "eating", label: "Eating" },
    { value: "foraging", label: "Foraging" }
];

const humanInteractionOptions = [
    { value: "all", label: "All interactions" },
    { value: "approaches", label: "Approaches humans" },
    { value: "indifferent", label: "Indifferent" },
    { value: "runs_from", label: "Runs from humans" }
];
const majorBehaviors = ["running", "chasing", "climbing", "eating", "foraging"];
const behaviorColors = {
    "Ground Plane": "#5f8f68",
    "Above Ground": "#9f76b5"
};
const interactionCategories = [
    { key: "Approaches", color: "#d95f02" },
    { key: "Runs From", color: "#1b9e77" },
    { key: "Indifferent", color: "#7570b3" }
];
const interactionPanels = [
    { value: "overall", label: "Overall" },
    { value: "shift", label: "By shift" },
    { value: "location", label: "By location" },
    { value: "fur", label: "By fur color" }
];

const visContainer = d3.select("#vis");

visContainer.html(`
    <div class="vis-header">
        <div>
            <h2>Squirrel Sightings Map</h2>
            <p>
                Explore how squirrel behavior changes across Central Park by time of day,
                fur color, age, location, and interaction with humans.
            </p>
        </div>
    </div>

    <div class="controls-panel">
        <div class="control-group">
            <label for="colorBy">Color points by</label>
            <select id="colorBy">
                <option value="fur">Fur color</option>
                <option value="location">Location</option>
                <option value="human">Human reaction</option>
            </select>
        </div>

        <div class="control-group">
            <label for="shiftFilter">Shift</label>
            <select id="shiftFilter">
                <option value="all">All</option>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>

        <div class="control-group">
            <label for="furFilter">Fur color</label>
            <select id="furFilter">
                <option value="all">All</option>
                <option value="Gray">Gray</option>
                <option value="Cinnamon">Cinnamon</option>
                <option value="Black">Black</option>
            </select>
        </div>

        <div class="control-group">
            <label for="ageFilter">Age</label>
            <select id="ageFilter">
                <option value="all">All</option>
                <option value="Adult">Adult</option>
                <option value="Juvenile">Juvenile</option>
            </select>
        </div>

        <div class="control-group">
            <label for="behaviorFilter">Behavior</label>
            <select id="behaviorFilter"></select>
        </div>

        <div class="control-group">
            <label for="interactionFilter">Human interaction</label>
            <select id="interactionFilter"></select>
        </div>
    </div>

    <div class="timeline-panel">
        <button id="playButton" class="timeline-btn">Play</button>

        <div class="slider-wrap">
            <label for="dateSlider">Day</label>
            <input type="range" id="dateSlider" min="0" value="0" step="1">
        </div>

        <div class="timeline-date">
            <span id="dateLabel">All dates</span>
        </div>

        <div class="timeline-mode">
            <label>
                <input type="checkbox" id="showAllDates" checked>
                Show all dates
            </label>
        </div>
    </div>

    <div class="legend" id="legend"></div>
    <div class="chart-wrap">
        <svg id="mapSvg"></svg>
    </div>

    <section class="behavior-explorer-section">
        <div class="behavior-explorer-header">
            <div>
                <h3>Behavior Explorer</h3>
                <p>
                    Compare running, chasing, climbing, eating, and foraging by time of day and location plane.
                    Click a behavior group to filter the map points.
                </p>
            </div>
            <button id="reorderBehaviorBars" class="timeline-btn behavior-btn">Sort by frequency</button>
        </div>
        <div class="behavior-legend" id="behaviorLegend"></div>
        <div class="chart-wrap">
            <svg id="behaviorSvg"></svg>
        </div>
    </section>

    <section class="interaction-explorer-section">
        <div class="behavior-explorer-header interaction-explorer-header">
            <div>
                <h3>Human–Squirrel Interaction</h3>
                <p>
                    How do squirrels react to people? Hover to highlight on the map; click to lock a highlight.
                </p>
            </div>
            <div class="interaction-controls">
                <label class="interaction-toggle">
                    <input type="checkbox" id="interactionNormalize" checked>
                    100% stacked
                </label>
            </div>
        </div>
        <div class="behavior-legend interaction-legend" id="interactionLegend"></div>
        <div class="chart-wrap">
            <svg id="interactionSvg"></svg>
        </div>
    </section>
`);

const svg = d3
    .select("#mapSvg")
    .attr("width", width)
    .attr("height", height);

const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

const plot = svg.append("g");

const titleGroup = svg.append("g");
titleGroup
    .append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("class", "map-title")
    .text("Central Park Squirrel Sightings");

titleGroup
    .append("text")
    .attr("x", width / 2)
    .attr("y", 52)
    .attr("text-anchor", "middle")
    .attr("class", "map-subtitle")
    .text("Use filters and the timeline to explore patterns in activity");

const backgroundRect = plot
    .append("rect")
    .attr("class", "plot-bg")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("rx", 16)
    .attr("ry", 16);

const boundaryPath = plot.append("path").attr("class", "park-boundary");
const pointLayer = plot.append("g").attr("class", "points-layer");

const colorSelect = d3.select("#colorBy");
const shiftFilter = d3.select("#shiftFilter");
const furFilter = d3.select("#furFilter");
const ageFilter = d3.select("#ageFilter");
const behaviorFilter = d3.select("#behaviorFilter");
const interactionFilter = d3.select("#interactionFilter");
const slider = d3.select("#dateSlider");
const dateLabel = d3.select("#dateLabel");
const playButton = d3.select("#playButton");
const showAllDates = d3.select("#showAllDates");
const legend = d3.select("#legend");
const behaviorLegend = d3.select("#behaviorLegend");
const behaviorSvg = d3
    .select("#behaviorSvg")
    .attr("width", behaviorChartWidth)
    .attr("height", behaviorChartHeight);
const behaviorPlot = behaviorSvg
    .append("g")
    .attr("transform", `translate(${behaviorChartMargin.left},${behaviorChartMargin.top})`);
const behaviorInnerWidth = behaviorChartWidth - behaviorChartMargin.left - behaviorChartMargin.right;
const behaviorInnerHeight = behaviorChartHeight - behaviorChartMargin.top - behaviorChartMargin.bottom;
const behaviorXAxisGroup = behaviorPlot
    .append("g")
    .attr("class", "behavior-axis behavior-axis-x")
    .attr("transform", `translate(0,${behaviorInnerHeight + 32})`);
const behaviorYAxisGroup = behaviorPlot
    .append("g")
    .attr("class", "behavior-axis behavior-axis-y");
const behaviorBarsLayer = behaviorPlot.append("g").attr("class", "behavior-bars-layer");
const behaviorTitle = behaviorSvg
    .append("text")
    .attr("class", "behavior-title")
    .attr("x", behaviorChartWidth / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .text("Major Behaviors by Shift and Plane");
const behaviorSubtitle = behaviorSvg
    .append("text")
    .attr("class", "behavior-subtitle")
    .attr("x", behaviorChartWidth / 2)
    .attr("y", 52)
    .attr("text-anchor", "middle")
    .text("AM vs PM bars are split into Ground Plane and Above Ground");
const reorderBehaviorBarsButton = d3.select("#reorderBehaviorBars");

const interactionNormalize = d3.select("#interactionNormalize");
const interactionLegend = d3.select("#interactionLegend");
const interactionSvg = d3
    .select("#interactionSvg")
    .attr("width", interactionChartWidth)
    .attr("height", interactionChartHeight);
const interactionPlot = interactionSvg
    .append("g")
    .attr("transform", `translate(${interactionChartMargin.left},${interactionChartMargin.top})`);
const interactionInnerWidth =
    interactionChartWidth - interactionChartMargin.left - interactionChartMargin.right;
const interactionInnerHeight =
    interactionChartHeight - interactionChartMargin.top - interactionChartMargin.bottom;
const interactionBarsLayer = interactionPlot
    .append("g")
    .attr("class", "interaction-bars-layer")
    .attr("transform", `translate(0,${interactionPlotGridTopPad})`);
interactionSvg
    .append("text")
    .attr("class", "interaction-title")
    .attr("x", interactionChartWidth / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .text("Reactions to Humans");
interactionSvg
    .append("text")
    .attr("class", "interaction-subtitle")
    .attr("x", interactionChartWidth / 2)
    .attr("y", 52)
    .attr("text-anchor", "middle")
    .text("Hover a segment to highlight on the map; click to lock the highlight");

behaviorFilter
    .selectAll("option")
    .data(behaviorOptions)
    .join("option")
    .attr("value", d => d.value)
    .text(d => d.label);

interactionFilter
    .selectAll("option")
    .data(humanInteractionOptions)
    .join("option")
    .attr("value", d => d.value)
    .text(d => d.label);

let rawData = [];
let cleanedData = [];
let uniqueDates = [];
let currentDateIndex = 0;
let timer = null;
let xScale, yScale;
let selectedBehaviorFromChart = null;
let selectedShiftFromChart = null;
let selectedLocationFromChart = null;
let sortBehaviorByFrequency = false;
let lockedInteractionHighlight = null; // { breakdown, group, reaction }
let hoveredInteractionHighlight = null; // { breakdown, group, reaction }

function truthy(value) {
    if (value === true) return true;
    if (value === false) return false;
    if (value == null) return false;
    const normalized = String(value).trim().toLowerCase();
    return normalized === "true" || normalized === "1";
}

function parseDateValue(value) {
    if (value == null || value === "") return null;

    const str = String(value).trim();

    // Handles 10142018 -> Oct 14 2018
    if (/^\d{8}$/.test(str)) {
        const month = +str.slice(0, 2);
        const day = +str.slice(2, 4);
        const year = +str.slice(4, 8);
        return new Date(year, month - 1, day);
    }

    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateDisplay(date) {
    if (!date) return "Unknown date";
    return d3.timeFormat("%b %d, %Y")(date);
}

function getBehaviors(d) {
    const list = [];
    if (d.running) list.push("running");
    if (d.chasing) list.push("chasing");
    if (d.climbing) list.push("climbing");
    if (d.eating) list.push("eating");
    if (d.foraging) list.push("foraging");
    if (d.other_activities && d.other_activities.trim() !== "") {
        list.push(d.other_activities.trim());
    }
    return list;
}

function getHumanReaction(d) {
    if (d.approaches) return "Approaches";
    if (d.runs_from) return "Runs From";
    if (d.indifferent) return "Indifferent";
    return "Unknown";
}

function reactionMatches(d, reaction) {
    if (!reaction) return false;
    return getHumanReaction(d) === reaction;
}

function matchesInteractionGroup(d, breakdown, groupValue) {
    if (!breakdown || breakdown === "overall") return true;
    if (breakdown === "shift") return (d.shift || "Unknown") === groupValue;
    if (breakdown === "location") return (d.location || "Unknown") === groupValue;
    if (breakdown === "fur") return (d.primary_fur_color || "Unknown") === groupValue;
    return true;
}

function getPointColor(d) {
    const mode = colorSelect.property("value");

    if (mode === "fur") {
        const fur = d.primary_fur_color || "Unknown";
        return (
            {
                Gray: "#8f8f8f",
                Cinnamon: "#c47b44",
                Black: "#222222",
                Unknown: "#bdbdbd"
            }[fur] || "#bdbdbd"
        );
    }

    if (mode === "location") {
        const loc = d.location || "Unknown";
        return (
            {
                "Ground Plane": "#3b7a57",
                "Above Ground": "#8e5ea2",
                Unknown: "#bdbdbd"
            }[loc] || "#bdbdbd"
        );
    }

    if (mode === "human") {
        const reaction = getHumanReaction(d);
        return (
            {
                Approaches: "#d95f02",
                "Runs From": "#1b9e77",
                Indifferent: "#7570b3",
                Unknown: "#bdbdbd"
            }[reaction] || "#bdbdbd"
        );
    }

    return "#8f8f8f";
}

function updateLegend() {
    const mode = colorSelect.property("value");

    let items = [];
    if (mode === "fur") {
        items = [
            { label: "Gray", color: "#8f8f8f" },
            { label: "Cinnamon", color: "#c47b44" },
            { label: "Black", color: "#222222" },
            { label: "Unknown", color: "#bdbdbd" }
        ];
    } else if (mode === "location") {
        items = [
            { label: "Ground Plane", color: "#3b7a57" },
            { label: "Above Ground", color: "#8e5ea2" },
            { label: "Unknown", color: "#bdbdbd" }
        ];
    } else {
        items = [
            { label: "Approaches", color: "#d95f02" },
            { label: "Runs From", color: "#1b9e77" },
            { label: "Indifferent", color: "#7570b3" },
            { label: "Unknown", color: "#bdbdbd" }
        ];
    }

    const entries = legend.selectAll(".legend-item").data(items, d => d.label);

    const enter = entries
        .enter()
        .append("div")
        .attr("class", "legend-item");

    enter.append("span").attr("class", "legend-swatch");
    enter.append("span").attr("class", "legend-label");

    entries.merge(enter).select(".legend-swatch").style("background", d => d.color);
    entries.merge(enter).select(".legend-label").text(d => d.label);

    entries.exit().remove();
}

function getFilteredData(options = {}) {
    const skipBehaviorFilter = options.skipBehaviorFilter === true;
    const shiftVal = shiftFilter.property("value");
    const furVal = furFilter.property("value");
    const ageVal = ageFilter.property("value");
    const behaviorVal = behaviorFilter.property("value");
    const interactionVal = interactionFilter.property("value");
    const showAll = showAllDates.property("checked");

    return cleanedData.filter(d => {
        const shiftMatch = shiftVal === "all" || d.shift === shiftVal;
        const furMatch = furVal === "all" || d.primary_fur_color === furVal;
        const ageMatch = ageVal === "all" || d.age === ageVal;
        const behaviorMatch = skipBehaviorFilter || behaviorVal === "all" || d[behaviorVal] === true;
        const interactionMatch = interactionVal === "all" || d[interactionVal] === true;
        const chartShiftMatch = !selectedShiftFromChart || d.shift === selectedShiftFromChart;
        const chartLocationMatch = !selectedLocationFromChart || d.location === selectedLocationFromChart;

        const dateMatch =
            showAll ||
            (uniqueDates[currentDateIndex] &&
                d.dateObj &&
                d3.timeDay.count(d.dateObj, uniqueDates[currentDateIndex]) === 0);

        return (
            shiftMatch &&
            furMatch &&
            ageMatch &&
            behaviorMatch &&
            interactionMatch &&
            chartShiftMatch &&
            chartLocationMatch &&
            dateMatch
        );
    });
}

function formatBehaviorLabel(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getBehaviorSeriesData() {
    const source = getFilteredData({ skipBehaviorFilter: true });
    const totalSightings = source.length;
    const shifts = ["AM", "PM"];
    const locations = ["Ground Plane", "Above Ground"];

    const series = majorBehaviors.map(behavior => {
        const shiftCounts = shifts.map(shift => {
            const segments = locations.map(location => {
                const count = source.filter(
                    d => d[behavior] && d.shift === shift && d.location === location
                ).length;
                return { location, count };
            });
            const total = d3.sum(segments, s => s.count);
            return { shift, total, segments };
        });

        return {
            behavior,
            label: formatBehaviorLabel(behavior),
            total: d3.sum(shiftCounts, d => d.total),
            shifts: shiftCounts
        };
    });

    return { series, totalSightings };
}

function updateBehaviorLegend() {
    const items = [
        { label: "Ground Plane", color: behaviorColors["Ground Plane"] },
        { label: "Above Ground", color: behaviorColors["Above Ground"] }
    ];

    const entries = behaviorLegend.selectAll(".legend-item").data(items, d => d.label);
    const enter = entries.enter().append("div").attr("class", "legend-item");
    enter.append("span").attr("class", "legend-swatch");
    enter.append("span").attr("class", "legend-label");

    entries.merge(enter).select(".legend-swatch").style("background", d => d.color);
    entries.merge(enter).select(".legend-label").text(d => d.label);
    entries.exit().remove();
}

function applyBehaviorFilter(behavior, shift = null, location = null) {
    const sameSelection =
        selectedBehaviorFromChart === behavior &&
        selectedShiftFromChart === shift &&
        selectedLocationFromChart === location;

    if (sameSelection) {
        selectedBehaviorFromChart = null;
        selectedShiftFromChart = null;
        selectedLocationFromChart = null;
        behaviorFilter.property("value", "all");
    } else {
        selectedBehaviorFromChart = behavior;
        selectedShiftFromChart = shift;
        selectedLocationFromChart = location;
        behaviorFilter.property("value", behavior);
    }

    stopPlayback();
    updatePoints();
}

function updateBehaviorExplorer() {
    const { series, totalSightings } = getBehaviorSeriesData();
    const shifts = ["AM", "PM"];
    const x0Domain = sortBehaviorByFrequency
        ? [...series].sort((a, b) => d3.descending(a.total, b.total)).map(d => d.behavior)
        : majorBehaviors;

    const x0 = d3
        .scaleBand()
        .domain(x0Domain)
        .range([0, behaviorInnerWidth])
        .paddingInner(0.24);
    const x1 = d3
        .scaleBand()
        .domain(shifts)
        .range([0, x0.bandwidth()])
        .padding(0.18);
    const maxCount = d3.max(series, d => d3.max(d.shifts, s => s.total)) || 0;
    const y = d3
        .scaleLinear()
        .domain([0, Math.max(1, maxCount)])
        .nice()
        .range([behaviorInnerHeight, 0]);

    behaviorXAxisGroup
        .transition()
        .duration(500)
        .call(
            d3.axisBottom(x0).tickFormat(key => formatBehaviorLabel(key))
        );

    behaviorYAxisGroup
        .transition()
        .duration(500)
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")));

    const groups = behaviorBarsLayer
        .selectAll(".behavior-group")
        .data(series, d => d.behavior)
        .join(enter => {
            const g = enter.append("g").attr("class", "behavior-group");
            g.append("text").attr("class", "behavior-shift-label behavior-shift-label-am").text("AM");
            g.append("text").attr("class", "behavior-shift-label behavior-shift-label-pm").text("PM");
            return g;
        });

    groups
        .transition()
        .duration(500)
        .attr("transform", d => `translate(${x0(d.behavior)},0)`);

    groups.each(function (behaviorDatum) {
        const group = d3.select(this);
        const shiftGroups = group
            .selectAll(".behavior-shift-group")
            .data(behaviorDatum.shifts, d => `${behaviorDatum.behavior}-${d.shift}`)
            .join("g")
            .attr("class", "behavior-shift-group")
            .attr("transform", d => `translate(${x1(d.shift)},0)`);

        shiftGroups.each(function (shiftDatum) {
            const shiftGroup = d3.select(this);
            let runningY = y(0);
            const stacked = shiftDatum.segments.map(segment => {
                const y1 = runningY;
                const y0 = y1 - (y(0) - y(segment.count));
                runningY = y0;
                return { ...segment, y0, y1, shift: shiftDatum.shift };
            });

            shiftGroup
                .selectAll("rect")
                .data(stacked, d => `${behaviorDatum.behavior}-${shiftDatum.shift}-${d.location}`)
                .join(
                    enter =>
                        enter
                            .append("rect")
                            .attr("class", "behavior-segment")
                            .attr("x", 0)
                            .attr("width", x1.bandwidth())
                            .attr("y", y(0))
                            .attr("height", 0)
                            .attr("fill", d => behaviorColors[d.location])
                            .attr("stroke", "#fffdf7")
                            .attr("stroke-width", 1)
                            .style("cursor", "pointer")
                            .on("click", () =>
                                applyBehaviorFilter(
                                    behaviorDatum.behavior,
                                    shiftDatum.shift,
                                    d.location
                                )
                            )
                            .on("mouseover", function (event, d) {
                                d3.select(this).attr("opacity", 0.82);
                                const pctTotal = totalSightings ? (d.count / totalSightings) * 100 : 0;
                                const pctBehavior = behaviorDatum.total ? (d.count / behaviorDatum.total) * 100 : 0;
                                tooltip
                                    .style("opacity", 1)
                                    .html(`
                                        <div><strong>Behavior:</strong> ${behaviorDatum.label}</div>
                                        <div><strong>Shift:</strong> ${d.shift}</div>
                                        <div><strong>Plane:</strong> ${d.location}</div>
                                        <div><strong>Count:</strong> ${d.count}</div>
                                        <div><strong>% of visible sightings:</strong> ${pctTotal.toFixed(1)}%</div>
                                        <div><strong>% within ${behaviorDatum.label}:</strong> ${pctBehavior.toFixed(1)}%</div>
                                    `);
                            })
                            .on("mousemove", function (event) {
                                tooltip
                                    .style("left", `${event.pageX + 14}px`)
                                    .style("top", `${event.pageY - 18}px`);
                            })
                            .on("mouseout", function () {
                                d3.select(this).attr("opacity", 1);
                                tooltip.style("opacity", 0);
                            })
                            .call(enter =>
                                enter
                                    .transition()
                                    .duration(500)
                                    .attr("y", d => d.y0)
                                    .attr("height", d => Math.max(0, d.y1 - d.y0))
                            ),
                    update =>
                        update.call(update =>
                            update
                                .transition()
                                .duration(500)
                                .attr("x", 0)
                                .attr("width", x1.bandwidth())
                                .attr("y", d => d.y0)
                                .attr("height", d => Math.max(0, d.y1 - d.y0))
                                .attr("fill", d => behaviorColors[d.location])
                        )
                );
        });

        group
            .select(".behavior-shift-label-am")
            .attr("x", x1("AM") + x1.bandwidth() / 2)
            .attr("y", behaviorInnerHeight + 14);

        group
            .select(".behavior-shift-label-pm")
            .attr("x", x1("PM") + x1.bandwidth() / 2)
            .attr("y", behaviorInnerHeight + 14);
    });

    behaviorBarsLayer
        .selectAll(".behavior-group")
        .classed("behavior-selected", d => d.behavior === selectedBehaviorFromChart)
        .on("click", (_, d) => applyBehaviorFilter(d.behavior));

    behaviorBarsLayer
        .selectAll(".behavior-segment")
        .classed("behavior-segment-selected", function (d) {
            return (
                selectedBehaviorFromChart &&
                selectedShiftFromChart &&
                selectedLocationFromChart &&
                this.parentNode &&
                d.shift === selectedShiftFromChart &&
                d.location === selectedLocationFromChart
            );
        });
}

function updateDateLabel() {
    if (showAllDates.property("checked")) {
        dateLabel.text("All dates");
    } else {
        const currentDate = uniqueDates[currentDateIndex];
        dateLabel.text(currentDate ? formatDateDisplay(currentDate) : "Unknown date");
    }
}

function updatePoints() {
    const filtered = getFilteredData();

    const circles = pointLayer.selectAll("circle").data(filtered, d => d.unique_squirrel_id);

    circles
        .join(
            enter =>
                enter
                    .append("circle")
                    .attr("cx", d => xScale(d.long))
                    .attr("cy", d => yScale(d.lat))
                    .attr("r", 0)
                    .attr("fill", d => getPointColor(d))
                    .attr("opacity", 0.45)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 0.4)
                    .on("mouseover", function (event, d) {
                        d3.select(this)
                            .attr("stroke", "#3b2613")
                            .attr("stroke-width", 1.2)
                            .attr("opacity", 0.9);

                        const behaviors = getBehaviors(d);
                        const behaviorText = behaviors.length ? behaviors.join(", ") : "None recorded";

                        tooltip
                            .style("opacity", 1)
                            .html(`
                                <div><strong>ID:</strong> ${d.unique_squirrel_id || "Unknown"}</div>
                                <div><strong>Shift:</strong> ${d.shift || "Unknown"}</div>
                                <div><strong>Fur color:</strong> ${d.primary_fur_color || "Unknown"}</div>
                                <div><strong>Age:</strong> ${d.age || "Unknown"}</div>
                                <div><strong>Behaviors:</strong> ${behaviorText}</div>
                                <div><strong>Human reaction:</strong> ${getHumanReaction(d)}</div>
                                <div><strong>Date:</strong> ${formatDateDisplay(d.dateObj)}</div>
                            `);
                    })
                    .on("mousemove", function (event) {
                        tooltip
                            .style("left", `${event.pageX + 14}px`)
                            .style("top", `${event.pageY - 18}px`);
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .attr("stroke", "#fff")
                            .attr("stroke-width", 0.4)
                            .attr("opacity", 0.45);

                        tooltip.style("opacity", 0);
                    })
                    .call(enter =>
                        enter
                            .transition()
                            .duration(400)
                            .attr("r", 4.2)
                    ),
            update =>
                update.call(update =>
                    update
                        .transition()
                        .duration(300)
                        .attr("cx", d => xScale(d.long))
                        .attr("cy", d => yScale(d.lat))
                        .attr("fill", d => getPointColor(d))
                        .attr("opacity", 0.45)
                        .attr("r", 4.2)
                ),
            exit =>
                exit.call(exit =>
                    exit
                        .transition()
                        .duration(250)
                        .attr("r", 0)
                        .remove()
                )
        );

    updateLegend();
    updateBehaviorExplorer();
    updateInteractionExplorer();
    applyInteractionHighlightToPoints();
}

function drawBoundary() {
    const lons = cleanedData.map(d => d.long);
    const lats = cleanedData.map(d => d.lat);

    const lonMin = d3.min(lons);
    const lonMax = d3.max(lons);
    const latMin = d3.min(lats);
    const latMax = d3.max(lats);

    xScale = d3
        .scaleLinear()
        .domain([lonMin, lonMax])
        .range([margin.left + 30, width - margin.right - 30]);

    yScale = d3
        .scaleLinear()
        .domain([latMin, latMax])
        .range([height - margin.bottom, margin.top + 30]);

    const boundaryCoords = [
        [lonMin, latMax],
        [lonMax, latMax],
        [lonMax, latMin],
        [lonMin, latMin]
    ];

    const line = d3
        .line()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]))
        .curve(d3.curveCatmullRomClosed.alpha(0.4));

    backgroundRect
        .attr("x", xScale(lonMin) - 20)
        .attr("y", yScale(latMax) - 20)
        .attr("width", xScale(lonMax) - xScale(lonMin) + 40)
        .attr("height", yScale(latMin) - yScale(latMax) + 40);

    boundaryPath.attr("d", line(boundaryCoords));

    ensureCompass();
}

function ensureCompass() {
    const padRight = margin.right + 24 + 50;
    const padBottom = margin.bottom + 45;
    const compassX = width - padRight;
    const compassY = height - padBottom;

    const armInner = 19;
    const tipOut = 11;
    const arrowHalf = 4.5;
    const armNorthTip = -(armInner + tipOut);
    const armSouthTip = armInner + tipOut;
    const armEwTip = armInner + tipOut;

    let g = svg.select("g.map-compass");
    if (g.empty()) {
        g = svg.append("g").attr("class", "map-compass compass-rose");

        g.append("line")
            .attr("class", "compass-axis compass-axis-ns")
            .attr("x1", 0)
            .attr("y1", armInner)
            .attr("x2", 0)
            .attr("y2", -armInner);

        g.append("line")
            .attr("class", "compass-axis compass-axis-ew")
            .attr("x1", -armInner)
            .attr("y1", 0)
            .attr("x2", armInner)
            .attr("y2", 0);

        g.append("path")
            .attr("class", "compass-arrowhead compass-arrow-n")
            .attr(
                "d",
                `M 0 ${armNorthTip} L ${-arrowHalf} ${-armInner} L ${arrowHalf} ${-armInner} Z`
            );

        g.append("path")
            .attr("class", "compass-arrowhead compass-arrow-s")
            .attr(
                "d",
                `M 0 ${armSouthTip} L ${-arrowHalf} ${armInner} L ${arrowHalf} ${armInner} Z`
            );

        g.append("path")
            .attr("class", "compass-arrowhead compass-arrow-e")
            .attr(
                "d",
                `M ${armEwTip} 0 L ${armInner} ${-arrowHalf} L ${armInner} ${arrowHalf} Z`
            );

        g.append("path")
            .attr("class", "compass-arrowhead compass-arrow-w")
            .attr(
                "d",
                `M ${-armEwTip} 0 L ${-armInner} ${-arrowHalf} L ${-armInner} ${arrowHalf} Z`
            );

        g.append("circle").attr("class", "compass-center-dot").attr("cx", 0).attr("cy", 0).attr("r", 2.2);

        g.append("text")
            .attr("class", "compass-label compass-dir-n")
            .attr("x", 0)
            .attr("y", armNorthTip - 6)
            .attr("text-anchor", "middle")
            .text("N");

        g.append("text")
            .attr("class", "compass-label compass-dir-s")
            .attr("x", 0)
            .attr("y", armSouthTip + 14)
            .attr("text-anchor", "middle")
            .text("S");

        g.append("text")
            .attr("class", "compass-label compass-dir-e")
            .attr("x", armEwTip + 12)
            .attr("y", 5)
            .attr("text-anchor", "middle")
            .text("E");

        g.append("text")
            .attr("class", "compass-label compass-dir-w")
            .attr("x", -armEwTip - 12)
            .attr("y", 5)
            .attr("text-anchor", "middle")
            .text("W");
    }

    g.attr("transform", `translate(${compassX},${compassY})`);
    g.raise();
}

function stopPlayback() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    playButton.text("Play");
}

function startPlayback() {
    if (showAllDates.property("checked")) {
        showAllDates.property("checked", false);
    }

    playButton.text("Pause");

    timer = setInterval(() => {
        currentDateIndex = (currentDateIndex + 1) % uniqueDates.length;
        slider.property("value", currentDateIndex);
        updateDateLabel();
        updatePoints();
    }, 900);
}

function togglePlayback() {
    if (timer) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

function setupTimeline() {
    slider.attr("max", Math.max(uniqueDates.length - 1, 0));

    slider.on("input", function () {
        currentDateIndex = +this.value;
        showAllDates.property("checked", false);
        stopPlayback();
        updateDateLabel();
        updatePoints();
    });

    showAllDates.on("change", function () {
        stopPlayback();
        updateDateLabel();
        updatePoints();
    });

    playButton.on("click", togglePlayback);
    updateDateLabel();
}

function initializeEvents() {
    colorSelect.on("change", updatePoints);
    shiftFilter.on("change", () => {
        stopPlayback();
        updatePoints();
    });
    furFilter.on("change", () => {
        stopPlayback();
        updatePoints();
    });
    ageFilter.on("change", () => {
        stopPlayback();
        updatePoints();
    });
    behaviorFilter.on("change", () => {
        stopPlayback();
        const val = behaviorFilter.property("value");
        selectedBehaviorFromChart = val === "all" ? null : val;
        selectedShiftFromChart = null;
        selectedLocationFromChart = null;
        updatePoints();
    });
    interactionFilter.on("change", () => {
        stopPlayback();
        updatePoints();
    });
    reorderBehaviorBarsButton.on("click", function () {
        sortBehaviorByFrequency = !sortBehaviorByFrequency;
        d3.select(this).text(sortBehaviorByFrequency ? "Reset order" : "Sort by frequency");
        updateBehaviorExplorer();
    });
    interactionNormalize.on("change", () => {
        updateInteractionExplorer();
    });
}

d3.select(window).on("keydown", event => {
    if (event.key === "Escape") {
        hoveredInteractionHighlight = null;
        lockedInteractionHighlight = null;
        updatePoints();
    }
});

function updateInteractionLegend() {
    const entries = interactionLegend
        .selectAll(".legend-item")
        .data(interactionCategories, d => d.key);

    const enter = entries.enter().append("div").attr("class", "legend-item");
    enter.append("span").attr("class", "legend-swatch");
    enter.append("span").attr("class", "legend-label");

    entries.merge(enter).select(".legend-swatch").style("background", d => d.color);
    entries.merge(enter).select(".legend-label").text(d => d.key);
    entries.exit().remove();
}

function getInteractionGroups(breakdown) {
    if (breakdown === "shift") return ["AM", "PM"];
    if (breakdown === "location") return ["Ground Plane", "Above Ground"];
    if (breakdown === "fur") return ["Gray", "Cinnamon", "Black", "Unknown"];
    return ["Overall"];
}

function getInteractionSeriesData(breakdown, source) {
    const groups = getInteractionGroups(breakdown);

    const series = groups.map(group => {
        const subset =
            breakdown === "overall"
                ? source
                : source.filter(d => matchesInteractionGroup(d, breakdown, group));

        const totalsByReaction = new Map(interactionCategories.map(d => [d.key, 0]));

        subset.forEach(d => {
            const reaction = getHumanReaction(d);
            if (totalsByReaction.has(reaction)) {
                totalsByReaction.set(reaction, totalsByReaction.get(reaction) + 1);
            }
        });

        const segments = interactionCategories.map(cat => ({
            reaction: cat.key,
            color: cat.color,
            count: totalsByReaction.get(cat.key) || 0
        }));

        const total = d3.sum(segments, s => s.count);

        return {
            group,
            label: group,
            total,
            segments
        };
    });

    return { breakdown, series };
}

function setInteractionHighlight(next, { lock }) {
    if (lock) {
        const same =
            lockedInteractionHighlight &&
            next &&
            lockedInteractionHighlight.breakdown === next.breakdown &&
            lockedInteractionHighlight.group === next.group &&
            lockedInteractionHighlight.reaction === next.reaction;
        lockedInteractionHighlight = same ? null : next;
        hoveredInteractionHighlight = null;
    } else {
        hoveredInteractionHighlight = next;
    }

    applyInteractionHighlightToPoints();
}

function applyInteractionHighlightToPoints() {
    const active = hoveredInteractionHighlight || lockedInteractionHighlight;
    const hasActive =
        active && active.reaction && active.reaction !== "Unknown" && active.reaction !== "";

    pointLayer
        .selectAll("circle")
        .attr("opacity", d => {
            if (!hasActive) return 0.45;
            const isMatch =
                reactionMatches(d, active.reaction) &&
                matchesInteractionGroup(d, active.breakdown, active.group);
            return isMatch ? 0.92 : 0.08;
        })
        .attr("stroke", d => {
            if (!hasActive) return "#fff";
            const isMatch =
                reactionMatches(d, active.reaction) &&
                matchesInteractionGroup(d, active.breakdown, active.group);
            return isMatch ? "#3b2613" : "#fff";
        })
        .attr("stroke-width", d => {
            if (!hasActive) return 0.4;
            const isMatch =
                reactionMatches(d, active.reaction) &&
                matchesInteractionGroup(d, active.breakdown, active.group);
            return isMatch ? 1.2 : 0.4;
        });
}

function updateInteractionExplorer() {
    updateInteractionLegend();
    const normalize = interactionNormalize.property("checked");
    const source = getFilteredData({ skipBehaviorFilter: true });
    const panels = interactionPanels.map(panel => ({
        ...panel,
        ...getInteractionSeriesData(panel.value, source)
    }));

    const panelCols = 2;
    const panelRows = 2;
    const panelGapX = 22;
    const panelGapY = 104;
    const gridInnerHeight = interactionInnerHeight - interactionPlotGridTopPad;
    const panelWidth = (interactionInnerWidth - panelGapX * (panelCols - 1)) / panelCols;
    const panelHeight = (gridInnerHeight - panelGapY * (panelRows - 1)) / panelRows;

    const globalMaxTotal = d3.max(panels, p => d3.max(p.series, d => d.total)) || 1;
    const y = d3
        .scaleLinear()
        .domain([0, normalize ? 1 : Math.max(1, globalMaxTotal)])
        .nice()
        .range([panelHeight, 0]);

    const panelGroups = interactionBarsLayer
        .selectAll(".interaction-panel")
        .data(panels, d => d.value)
        .join(enter => {
            const g = enter.append("g").attr("class", "interaction-panel");
            g.append("rect").attr("class", "interaction-panel-bg").attr("rx", 14).attr("ry", 14);
            g.append("text").attr("class", "interaction-panel-title");
            g.append("g").attr("class", "interaction-axis interaction-axis-y");
            g.append("g").attr("class", "interaction-axis interaction-axis-x");
            g.append("g").attr("class", "interaction-panel-bars");
            return g;
        });

    panelGroups
        .transition()
        .duration(450)
        .attr("transform", (d, i) => {
            const col = i % panelCols;
            const row = Math.floor(i / panelCols);
            return `translate(${col * (panelWidth + panelGapX)},${row * (panelHeight + panelGapY)})`;
        });

    panelGroups.each(function (panelDatum, panelIndex) {
        const panel = d3.select(this);
        const breakdown = panelDatum.value;
        const series = panelDatum.series;
        const col = panelIndex % panelCols;
        const row = Math.floor(panelIndex / panelCols);

        const x = d3
            .scaleBand()
            .domain(series.map(d => d.group))
            .range([0, panelWidth])
            .padding(0.22);

        panel
            .select(".interaction-panel-bg")
            .attr("x", -10)
            .attr("y", -12)
            .attr("width", panelWidth + 20)
            .attr("height", panelHeight + 62)
            .classed(
                "interaction-panel-selected",
                () => lockedInteractionHighlight && lockedInteractionHighlight.breakdown === breakdown
            );

        panel
            .select(".interaction-panel-title")
            .attr("x", panelWidth / 2)
            .attr("y", -22)
            .attr("text-anchor", "middle")
            .text(panelDatum.label);

        panel
            .select(".interaction-axis-x")
            .attr("transform", `translate(0,${panelHeight + 18})`)
            .transition()
            .duration(450)
            .call(axis => {
                const axisGen = d3.axisBottom(x).tickSizeOuter(0);
                axis.call(axisGen);

                axis
                    .selectAll("text")
                    .style("text-anchor", "middle")
                    .style("font-style", "normal")
                    .attr("transform", "")
                    .attr("dx", "0")
                    .attr("dy", "0.9em");
            });

        const showYAxis = col === 0;
        const yAxis = panel
            .select(".interaction-axis-y")
            .transition()
            .duration(450)
            .call(
                (showYAxis ? d3.axisLeft(y) : d3.axisLeft(y).tickValues([]))
                    .ticks(6)
                    .tickFormat(normalize ? d3.format(".0%") : d3.format("d"))
            );

        yAxis.selection && yAxis.selection().selectAll("text").attr("dx", "-0.2em");

        const barsLayer = panel.select(".interaction-panel-bars");

        const barGroups = barsLayer
            .selectAll(".interaction-group")
            .data(series, d => d.group)
            .join(enter => enter.append("g").attr("class", "interaction-group"));

        barGroups
            .classed("interaction-selected", d => {
                if (!lockedInteractionHighlight) return false;
                return (
                    lockedInteractionHighlight.breakdown === breakdown &&
                    lockedInteractionHighlight.group === d.group
                );
            })
            .transition()
            .duration(450)
            .attr("transform", d => `translate(${x(d.group)},0)`);

        barGroups.each(function (groupDatum) {
            const g = d3.select(this);
            const total = groupDatum.total || 0;

            let runningY = y(0);
            const stacked = groupDatum.segments.map(seg => {
                const value = normalize ? (total ? seg.count / total : 0) : seg.count;
                const y1 = runningY;
                const y0 = y1 - (y(0) - y(value));
                runningY = y0;
                return {
                    ...seg,
                    value,
                    y0,
                    y1,
                    group: groupDatum.group,
                    breakdown
                };
            });

            g.selectAll("rect")
                .data(stacked, d => `${d.breakdown}-${d.group}-${d.reaction}`)
                .join(
                    enter =>
                        enter
                            .append("rect")
                            .attr("class", "interaction-segment")
                            .attr("x", 0)
                            .attr("width", x.bandwidth())
                            .attr("y", y(0))
                            .attr("height", 0)
                            .attr("fill", d => d.color)
                            .attr("stroke", "#fffdf7")
                            .attr("stroke-width", 1)
                            .style("cursor", "pointer")
                            .on("mouseover", function (event, d) {
                                d3.select(this).attr("opacity", 0.85);
                                setInteractionHighlight(
                                    { breakdown: d.breakdown, group: d.group, reaction: d.reaction },
                                    { lock: false }
                                );

                                const pct = total ? (d.count / total) * 100 : 0;
                                tooltip
                                    .style("opacity", 1)
                                    .html(`
                                        <div><strong>${panelDatum.label}:</strong> ${groupDatum.label}</div>
                                        <div><strong>Reaction:</strong> ${d.reaction}</div>
                                        <div><strong>Count:</strong> ${d.count}</div>
                                        <div><strong>% within group:</strong> ${pct.toFixed(1)}%</div>
                                    `);
                            })
                            .on("mousemove", function (event) {
                                tooltip
                                    .style("left", `${event.pageX + 14}px`)
                                    .style("top", `${event.pageY - 18}px`);
                            })
                            .on("mouseout", function () {
                                d3.select(this).attr("opacity", 1);
                                tooltip.style("opacity", 0);
                                setInteractionHighlight(null, { lock: false });
                            })
                            .on("click", (event, d) => {
                                event.stopPropagation();
                                setInteractionHighlight(
                                    { breakdown: d.breakdown, group: d.group, reaction: d.reaction },
                                    { lock: true }
                                );
                                updateInteractionExplorer();
                            })
                            .call(enter =>
                                enter
                                    .transition()
                                    .duration(450)
                                    .attr("y", d => d.y0)
                                    .attr("height", d => Math.max(0, d.y1 - d.y0))
                            ),
                    update =>
                        update
                            .on("mouseover", null)
                            .on("mouseout", null)
                            .on("mousemove", null)
                            .on("click", null)
                            .call(update =>
                                update
                                    .transition()
                                    .duration(450)
                                    .attr("x", 0)
                                    .attr("width", x.bandwidth())
                                    .attr("y", d => d.y0)
                                    .attr("height", d => Math.max(0, d.y1 - d.y0))
                                    .attr("fill", d => d.color)
                            )
                            .call(update =>
                                update
                                    .style("cursor", "pointer")
                                    .on("mouseover", function (event, d) {
                                        d3.select(this).attr("opacity", 0.85);
                                        setInteractionHighlight(
                                            {
                                                breakdown: d.breakdown,
                                                group: d.group,
                                                reaction: d.reaction
                                            },
                                            { lock: false }
                                        );

                                        const pct = total ? (d.count / total) * 100 : 0;
                                        tooltip
                                            .style("opacity", 1)
                                            .html(`
                                                <div><strong>${panelDatum.label}:</strong> ${groupDatum.label}</div>
                                                <div><strong>Reaction:</strong> ${d.reaction}</div>
                                                <div><strong>Count:</strong> ${d.count}</div>
                                                <div><strong>% within group:</strong> ${pct.toFixed(1)}%</div>
                                            `);
                                    })
                                    .on("mousemove", function (event) {
                                        tooltip
                                            .style("left", `${event.pageX + 14}px`)
                                            .style("top", `${event.pageY - 18}px`);
                                    })
                                    .on("mouseout", function () {
                                        d3.select(this).attr("opacity", 1);
                                        tooltip.style("opacity", 0);
                                        setInteractionHighlight(null, { lock: false });
                                    })
                                    .on("click", (event, d) => {
                                        event.stopPropagation();
                                        setInteractionHighlight(
                                            {
                                                breakdown: d.breakdown,
                                                group: d.group,
                                                reaction: d.reaction
                                            },
                                            { lock: true }
                                        );
                                        updateInteractionExplorer();
                                    })
                            )
                );
        });

        barsLayer
            .selectAll(".interaction-segment")
            .classed("interaction-segment-locked", d => {
                if (!lockedInteractionHighlight) return false;
                return (
                    lockedInteractionHighlight.breakdown === d.breakdown &&
                    lockedInteractionHighlight.group === d.group &&
                    lockedInteractionHighlight.reaction === d.reaction
                );
            });
    });
}

d3.csv("data/nyc_squirrels.csv").then(data => {
    rawData = data;

    cleanedData = rawData
        .map(d => {
            const dateObj = parseDateValue(d.date);

            return {
                ...d,
                long: +d.long,
                lat: +d.lat,
                dateObj,
                running: truthy(d.running),
                chasing: truthy(d.chasing),
                climbing: truthy(d.climbing),
                eating: truthy(d.eating),
                foraging: truthy(d.foraging),
                kuks: truthy(d.kuks),
                quaas: truthy(d.quaas),
                moans: truthy(d.moans),
                tail_flags: truthy(d.tail_flags),
                tail_twitches: truthy(d.tail_twitches),
                approaches: truthy(d.approaches),
                indifferent: truthy(d.indifferent),
                runs_from: truthy(d.runs_from)
            };
        })
        .filter(d => !Number.isNaN(d.long) && !Number.isNaN(d.lat));

    uniqueDates = Array.from(
        new Map(
            cleanedData
                .filter(d => d.dateObj)
                .map(d => [d3.timeDay.floor(d.dateObj).getTime(), d3.timeDay.floor(d.dateObj)])
        ).values()
    ).sort((a, b) => a - b);

    drawBoundary();
    setupTimeline();
    updateBehaviorLegend();
    updateInteractionLegend();
    initializeEvents();
    updatePoints();
}).catch(error => {
    console.error("Error loading squirrel data:", error);

    visContainer.append("p")
        .attr("class", "error-message")
        .text("Could not load data/nyc_squirrels.csv. Check that the file path is correct and that you are running the project from a local server.");
});
