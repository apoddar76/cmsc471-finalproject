const margin = {top: 40, right: 40, bottom: 40, left: 60};
const width = 600 - margin.left - margin.right; 
const height = 400 - margin.top - margin.bottom; 

let currentData = []; // global variable

// creating the actual SVG 
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
