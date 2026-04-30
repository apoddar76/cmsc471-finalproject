const width = 920;
const height = 720;
const margin = { top: 70, right: 40, bottom: 70, left: 40 };

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

function getFilteredData() {
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
        const behaviorMatch = behaviorVal === "all" || d[behaviorVal] === true;
        const interactionMatch = interactionVal === "all" || d[interactionVal] === true;

        const dateMatch =
            showAll ||
            (uniqueDates[currentDateIndex] &&
                d.dateObj &&
                d3.timeDay.count(d.dateObj, uniqueDates[currentDateIndex]) === 0);

        return shiftMatch && furMatch && ageMatch && behaviorMatch && interactionMatch && dateMatch;
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

    const northArrowX = width - 80;
    const northArrowY = 105;

    svg.append("text")
        .attr("class", "north-label")
        .attr("x", northArrowX)
        .attr("y", northArrowY - 18)
        .attr("text-anchor", "middle")
        .text("N");

    svg.append("line")
        .attr("x1", northArrowX)
        .attr("x2", northArrowX)
        .attr("y1", northArrowY + 18)
        .attr("y2", northArrowY - 8)
        .attr("stroke", "#5a3d22")
        .attr("stroke-width", 2.4);

    svg.append("path")
        .attr(
            "d",
            `M ${northArrowX} ${northArrowY - 18}
             L ${northArrowX - 7} ${northArrowY - 3}
             L ${northArrowX + 7} ${northArrowY - 3}
             Z`
        )
        .attr("fill", "#5a3d22");
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
        updatePoints();
    });
    interactionFilter.on("change", () => {
        stopPlayback();
        updatePoints();
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
    initializeEvents();
    updatePoints();
}).catch(error => {
    console.error("Error loading squirrel data:", error);

    visContainer.append("p")
        .attr("class", "error-message")
        .text("Could not load data/nyc_squirrels.csv. Check that the file path is correct and that you are running the project from a local server.");
});
