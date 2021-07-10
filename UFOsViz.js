import consts from './consts.js'

main()

async function main() {
    let loading = document.getElementById('loading')
    let content = document.getElementById('wrapper')

    const contentHTML = content.innerHTML
    content.innerHTML = ''

    let sightings = await initData('ufos_data.csv')

    loading.id = 'doneLoading'
    content.innerHTML = contentHTML

    const sightingsPerYear = initSightingsPerYear(sightings)
    buildScatterPlot(sightingsPerYear)

    const sightingLocations = initSightingLocations(sightings)
    buildMap(sightingLocations)

    const figuresReported = initFiguresReported(sightings)
    buildBarGraph(figuresReported)

    initParams(sightingsPerYear, figuresReported)

    let tableState = {
        currPage: 1,
        filteredSightings: []
    }

    let optionLabels = document.getElementsByClassName('optionLabel')

    for (let i = 0; i < optionLabels.length; i++) {
        optionLabels[i].onchange = () => selectUnselectAll(optionLabels[i], sightings, tableState)
    }

    renderTable(sightings, tableState)
}

async function initData(dataURL) {
    let data = []
    await d3.csv(dataURL, rowOfData => data.push(rowOfData))
    return data
}

function initSightingsPerYear(sightings) {
    let sightingsPerYear = {}

    for (let i = 0; i < sightings.length; i++) {
        if (sightings[i].Date.length > 0) {
            const key = sightings[i].Date.substring(0, 4)

            if (key in sightingsPerYear) {
                sightingsPerYear[key]++
            } else {
                sightingsPerYear[key] = 1
            }

            sightings[i].Date = key
        }
    }

    return sightingsPerYear
}

function initSightingLocations(sightings) {
    let sightingLocations = []

    for (const sighting of sightings) {
        if (sighting.Longitude.length > 0 && consts.US_States.has(sighting.State)) {
            sightingLocations.push({lat: sighting.Latitude, long: sighting.Longitude})
        } else {
            sighting.State = 'Outside U.S'
        }
    }

    return sightingLocations
}

function initFiguresReported(sightings) {
    let figuresReported = {}

    for (let i = 0; i < sightings.length; i++) {
        if (sightings[i].Shape.length > 0) {
            const key = sightings[i].Shape.charAt(0).toUpperCase() + sightings[i].Shape.slice(1)

            if (key in figuresReported) {
                figuresReported[key]++
            } else {
                figuresReported[key] = 1
            }

            sightings[i].Shape = key
        }
    }

    return figuresReported
}

function buildScatterPlot(sightingsPerYear) {
    let data = []

    for (const year in sightingsPerYear) {
        data.push({Year: year, Count: sightingsPerYear[year]})
    }

    const width = 1100
    const height = 500
    const padding = {left: 45, right: 20, bottom: 30, top: 20}

    const xScale = d3.scaleLinear()
                        .domain([d3.min(data, d => d.Year), d3.max(data, d => d.Year)]).nice()
                        .range([padding.left, width - padding.right])

    const yScale = d3.scaleLinear()
                        .domain([d3.min(data, d => d.Count), d3.max(data, d => d.Count)]).nice()
                        .range([height - padding.bottom, padding.top])

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format('d'))
    const yAxis = d3.axisLeft(yScale)

    const svg = d3.select('#sightingsOverTime')
                    .attr('width', width)
                    .attr('height', height)

    svg.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
            .attr('r', 5)
            .attr('cx', d => xScale(d.Year))
            .attr('cy', d => yScale(d.Count))
            .style('fill', 'red')

    svg.append('g')
        .call(xAxis)
        .attr('transform', `translate(0, ${height - padding.bottom})`)

    svg.append('g')
        .call(yAxis)
        .attr('transform', `translate(${padding.left}, 0)`)

    svg.append('rect')
        .attr('x', 550)
        .attr('y', 80)
        .attr('width', 260)
        .attr('height', 70)
        .style('fill', '#121212')

    svg.append('text').text(`Notice the sharp increase in the number`)
        .attr('x', 560)
        .attr('y', 110)
        .attr('fill', 'white')
        .attr('font-size', '0.85rem')

    svg.append('text').text(`of sightings in recent years.`)
        .attr('x', 560)
        .attr('y', 130)
        .attr('fill', 'white')
        .attr('font-size', '0.85rem')
}

function buildMap(sightingLocations) {
    const width = 1100
    const height = 500
    const rightShift = 65

    const svg = d3.select('#sightingsByLocation')
                    .attr('width', width)
                    .attr('height', height)

    Promise.all([d3.json('us.json')]).then(data => {
        document.getElementById('loadingMap').innerHTML = ''
    
        const projection = d3.geoAlbersUsa().scale(1060)
        const path = d3.geoPath().projection(projection)
        const states = topojson.feature(data[0], data[0].objects.states).features

        svg.selectAll('state')
            .data(states)
            .enter()
            .append('path')
                .attr('d', path)
                .style('stroke', 'white')
                .style('stroke-width', 0.2)
                .attr('transform', `translate(${rightShift}, 0)`)

        svg.selectAll('sighting')
            .data(sightingLocations)
            .enter()
            .append('circle')
                .attr('r', 1)
                .attr('cx', d => {
                    const coords = projection([d.long, d.lat])
                    return coords ? coords[0] : -1
                })
                .attr('cy', d => {
                    const coords = projection([d.long, d.lat])
                    return coords ? coords[1] : -1
                })
                .attr('transform', `translate(${rightShift}, 0)`)
                .style('fill', 'red')
                svg.append('rect')
                .attr('x', 870)
                .attr('y', 170)
                .attr('width', 230)
                .attr('height', 50)
                .style('fill', '#121212')
        
        svg.append('text').text(`Many sightings along the east coast.`)
            .attr('x', 875)
            .attr('y', 200)
            .attr('fill', 'white')
            .attr('font-size', '0.85rem')
        
        svg.append('rect')
            .attr('x', 840)
            .attr('y', 360)
            .attr('width', 255)
            .attr('height', 65)
            .style('fill', '#121212')
        
        svg.append('text').text(`Naturally, areas with higher populations`)
            .attr('x', 850)
            .attr('y', 390)
            .attr('fill', 'white')
            .attr('font-size', '0.85rem')
        
        svg.append('text').text(`have more reported sightings.`)
            .attr('x', 850)
            .attr('y', 410)
            .attr('fill', 'white')
            .attr('font-size', '0.85rem')
    })
}

function buildBarGraph(figuresReported) {
    let data = []

    for (const figure in figuresReported) {
        data.push({Figure: figure, Count: figuresReported[figure]})
    }

    const width = 1100
    const height = 500
    const padding = {left: 47, right: -10, top: 20, bottom: 30}

    const svg = d3.select('#figuresReported')
                    .attr('width', width)
                    .attr('height', height)

    const xScale = d3.scaleBand()
                        .domain(d3.range(data.length))
                        .range([padding.left, width - padding.right])
                        .padding(0.3)
    
    const yScale = d3.scaleLinear()
                        .domain([0, d3.max(data, d => d.Count)]).nice()
                        .range([height - padding.bottom, padding.top])

    const xAxis = d3.axisBottom(xScale).tickFormat(i => data[i].Figure)
    const yAxis = d3.axisLeft(yScale)

    svg.append('g')
        .attr('fill', 'red')
        .selectAll('rect')
            .data(data.sort((a, b) => d3.descending(a.Count, b.Count)))
            .join('rect')
                .attr('x', (d, i) => xScale(i))
                .attr('y', d => yScale(d.Count))
                .attr('height', d => yScale(0) - yScale(d.Count))
                .attr('width', xScale.bandwidth())

    svg.append('g')
        .call(xAxis)
        .attr('transform', `translate(0, ${height - padding.bottom})`)

    svg.append('g')
        .call(yAxis)
        .attr('transform', `translate(${padding.left}, 0)`)

    svg.append('rect')
        .attr('x', 130)
        .attr('y', 90)
        .attr('width', 255)
        .attr('height', 70)
        .style('fill', '#121212')

    svg.append('text').text(`Most reported figures are symmetrical,`)
        .attr('x', 140)
        .attr('y', 120)
        .attr('fill', 'white')
        .attr('font-size', '0.85rem')

    svg.append('text').text(`similar, common, and universal.`)
        .attr('x', 140)
        .attr('y', 140)
        .attr('fill', 'white')
        .attr('font-size', '0.85rem')
}

function initParams(sightingsPerYear, figuresReported) {
    let yearOptions = document.getElementById('yearOptions')
    let regionOptions = document.getElementById('regionOptions')
    let figureOptions = document.getElementById('figureOptions')

    let years = Object.keys(sightingsPerYear)
    years.sort()

    for (const year of years) {
        yearOptions.innerHTML += `
                                    <span class="option">
                                        <input type="checkbox" id="${year}" name="option" value="${year}" checked>
                                        <label for="${year}">${year}</label>
                                    </span>
                                    <br />
                                 `

    }

    const states = Array.from(consts.US_States)

    for (const state of states) {
        regionOptions.innerHTML +=  `
                                        <span class="option">
                                            <input type="checkbox" id="${state}" name="option" value="${state}" checked>
                                            <label for="${state}">${state}</label>
                                        </span>
                                        <br />
                                    `
    }

    regionOptions.innerHTML +=  `
                                    <span class="option">
                                        <input type="checkbox" id="outsideUS" name="option" value="Outside U.S" checked>
                                        <label for="outsideUS">Outside U.S</label>
                                    </span>
                                `

    let figures = Object.keys(figuresReported)
    figures.sort()

    for (const figure of figures) {
        figureOptions.innerHTML +=  `
                                        <span class="option">
                                            <input type="checkbox" id="${figure}" name="option" value="${figure}" checked>
                                            <label for="${figure}">${figure}</label>
                                        </span>
                                        <br />
                                    `
    }
}

function selectUnselectAllHelper(elementID, checked) {
    let options = document.getElementById(elementID).getElementsByClassName('option')

    for (let i = 0; i < options.length; i++) {
        let input = options[i].querySelector('input[name="option"]')
        input.checked = checked ? true : false
    }
}

function selectUnselectAll(input, sightings, tableState) {
    if (input !== undefined) {
        if (input.id == 'yearLabel') {
            selectUnselectAllHelper('yearOptions', input.checked)
        } else if (input.id == 'regionLabel') {
            selectUnselectAllHelper('regionOptions', input.checked)
        } else if (input.id == 'figureLabel') {
            selectUnselectAllHelper('figureOptions', input.checked)
        }
    }

    renderTable(sightings, tableState)
}

function renderTable(sightings, tableState) {
    let years = new Set()
    let regions = new Set()
    let figures = new Set()

    let yearOptions = document.getElementById('yearOptions').getElementsByClassName('option')
    let regionOptions = document.getElementById('regionOptions').getElementsByClassName('option')
    let figureOptions = document.getElementById('figureOptions').getElementsByClassName('option')

    for (let i = 0; i < yearOptions.length; i++) {
        if (yearOptions[i].children[0].checked) {
            years.add(yearOptions[i].children[0].value)
        }
        yearOptions[i].onchange = () => renderTable(sightings, tableState)
    }

    for (let i = 0; i < regionOptions.length; i++) {
        if (regionOptions[i].children[0].checked) {
            regions.add(regionOptions[i].children[0].value)
        }
        regionOptions[i].onchange = () => renderTable(sightings, tableState)
    }

    for (let i = 0; i < figureOptions.length; i++) {
        if (figureOptions[i].children[0].checked) {
            figures.add(figureOptions[i].children[0].value)
        }
        figureOptions[i].onchange = () => renderTable(sightings, tableState)
    }

    tableState.filteredSightings = sightings.filter((sighting => years.has(sighting.Date) &&
                                                     regions.has(sighting.State) &&
                                                     figures.has(sighting.Shape)))

    renderPage(tableState)
}

function renderPage(tableState) {
    const numSightings = tableState.filteredSightings.length
    
    const numPages = numSightings > 0 ? Math.ceil(numSightings / consts.sightingsPerPage) : 1
    const currPage = tableState.currPage <= numPages ? tableState.currPage : numPages

    const startIdx = (currPage * consts.sightingsPerPage) - consts.sightingsPerPage
    const endIdx = startIdx + consts.sightingsPerPage - 1 < numSightings ? startIdx + consts.sightingsPerPage - 1 : numSightings - 1

    let tableBody = document.getElementById('sightingsTable').getElementsByTagName('tbody')[0]

    clearPage(tableBody)

    if (numSightings == 0) {
        let newRow = tableBody.insertRow()
        let newCell = newRow.insertCell()
        newCell.appendChild(document.createTextNode('No Sightings Found Matching Currently Selected Filters.'))
        newCell.colSpan = 6
    }

    for (let i = startIdx; i <= endIdx; i++) {
        let newRow = tableBody.insertRow()
        newRow.insertCell().appendChild(document.createTextNode(`${tableState.filteredSightings[i].Date}`))
        newRow.insertCell().appendChild(document.createTextNode(`${tableState.filteredSightings[i].City}`))
        newRow.insertCell().appendChild(document.createTextNode(`${tableState.filteredSightings[i].State}`))
        newRow.insertCell().appendChild(document.createTextNode(`${tableState.filteredSightings[i].Shape}`))
        newRow.insertCell().appendChild(document.createTextNode(`${tableState.filteredSightings[i].Description}`))

        const link = document.createElement('a')
        link.innerHTML = `<a class="link" href="${tableState.filteredSightings[i].Link}" target="_blank" rel="noopener noreferrer">Link</a>`
        newRow.insertCell().appendChild(link)
    }

    renderPagination(currPage, numPages, tableState)
}

function renderPagination(currPage, numPages, tableState) {
    let pages = document.getElementById('pagesDiv')

    pages.innerHTML =  `
                            <div class="pagesAtRight" id="forAlignment">
                                <label for="quantity">Page (1 - ${numPages}):</label>
                                <input type="number" id="quantity" name="quantity" min="1" max="${numPages}" />
                                <button>Go</button>
                            </div>

                            <div id="pagesInMiddle">
                                <button id="prevBtn" class="pageBtn">Previous</button>
                                <span id="pageTxt">${currPage} / ${numPages}</span>
                                <button id="nextBtn" class="pageBtn">Next</button>
                            </div>

                            <div class="pagesAtRight" id="searchForPage">
                                <label for="quantity" id="pagesLabel">Page (1 - ${numPages}):</label>
                                <input type="number" id="pageInput" name="quantity" min="1" max="${numPages}" />
                                <button class="pageBtn" id="goBtn">Go</button>
                            </div>
                        `

    let prevBtn = document.getElementById('prevBtn')
    let nextBtn = document.getElementById('nextBtn')

    if (currPage == 1) {
        if (numPages > 1) {
            nextBtn.classList.remove('hover')
            nextBtn.onclick = () => updatePage(nextBtn, currPage + 1, tableState)
        }

        prevBtn.disabled = true
        prevBtn.style['cursor'] = 'not-allowed'
        prevBtn.classList.add('hover')
    }
    
    if (currPage == numPages) {
        if (numPages > 1) {
            prevBtn.classList.remove('hover')
            prevBtn.onclick = () => updatePage(prevBtn, currPage - 1, tableState)
        }

        nextBtn.disabled = true
        nextBtn.style['cursor'] = 'not-allowed'
        nextBtn.classList.add('hover')
    } else {
        prevBtn.classList.remove('hover')
        nextBtn.classList.remove('hover')

        prevBtn.onclick = () => updatePage(prevBtn, parseInt(currPage) - 1, tableState)
        nextBtn.onclick = () => updatePage(nextBtn, parseInt(currPage) + 1, tableState)
    }
    
    let goBtn = document.getElementById('goBtn')
    goBtn.onclick = () => {
        let inputPage = document.getElementById('pageInput').value
        if (inputPage > 0 && inputPage <= numPages) {
            updatePage(goBtn, document.getElementById('pageInput').value, tableState)
        } else {
            alert(`Invalid page entered, please enter a page between 1 and ${numPages}`)
        }
    }
}

function updatePage(source, newPage, tableState) {
    if (newPage.toString().length > 0) {
        tableState.currPage = newPage
    }
    renderPage(tableState)
}

function clearPage(tableBody) {
    for (let i = 1; i <= consts.sightingsPerPage && tableBody.rows.length > 1; i++) {
        tableBody.deleteRow(1)
    }
}