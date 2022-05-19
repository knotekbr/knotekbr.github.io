class DataSet {

    constructor(timeCol = 0, tempCol = 0, dateTimeReg = /[\s\S]*/, { year = 1, month = 2, day = 3 } = {}, twelveHour = false) {
        this.cols = {
            time: timeCol,
            temp: tempCol
        };
        this.dateTimeReg = dateTimeReg;
        this.dti = {
            year: year,
            month: month,
            day: day,
            hour: 4,
            min: 5,
            sec: 6,
            ampm: 7
        };
        this.twelveHour = twelveHour;

        this.parsedRows = 0;
        this.droppedRows = 0;
        this.measurements = [];
        this.measurementIndices = {};

        this.minTime = null;
        this.maxTime = new Date(-8640000000000000);
        this.minTemp = Number.MAX_VALUE;
        this.maxTemp = Number.MIN_VALUE;

        this.unsorted = false;
    }

    addMeasurement(row) {
        let timeVal = row[this.cols.time],
            tempVal = row[this.cols.temp],
            timeRef;
        
        if (timeVal && tempVal && !isNaN(Date.parse(timeVal)) && !isNaN(tempVal)) {
            this.parsedRows++;
            tempVal = Number(tempVal);

            timeVal = this.dateTimeReg.exec(timeVal);
            [timeVal, timeRef] = this.createTime(timeVal);

            if (this.minTime == null) { this.minTime = timeVal; }
            if (!this.unsorted && timeVal < this.maxTime) { this.unsorted = true; }
            this.maxTime = timeVal;

            if (tempVal < this.minTemp) { this.minTemp = tempVal; }
            if (tempVal > this.maxTemp) { this.maxTemp = tempVal; }

            timeRef[timeVal.getSeconds()] = this.measurements.length;
            this.measurements.push({ time: timeVal, temp: tempVal });
        }
        else {
            this.droppedRows++;
        }
    }

    createTime(values) {
        var date = new Date(),
            year = parseInt(values[this.dti.year]),
            month = parseInt(values[this.dti.month]) - 1,
            day = parseInt(values[this.dti.day]),
            hour = parseInt(values[this.dti.hour]),
            min = parseInt(values[this.dti.min]),
            sec = parseInt(values[this.dti.sec]),
            ampm = values[this.dti.ampm],
            currLevel = this.measurementIndices;

        if (this.twelveHour) {
            if (ampm.toUpperCase() == "AM" && hour == 12) {
                hour = 0;
            }
            else if (ampm.toUpperCase() == "PM" && hour != 12) {
                hour += 12;
            }
        }

        date.setFullYear(year, month, day);
        date.setHours(hour, min, sec);

        for (const key of [year, month, day, hour, min]) {
            currLevel = currLevel[key] = currLevel[key] || {};
        }

        return [date, currLevel];
    }

    generateSVGPath(width, height) {
        var xFactor = width / (this.maxTime - this.minTime),
            yFactor = (height - 4) / (this.maxTemp - this.minTemp),
            pathStr = "M 0 ";

        pathStr += yFactor * (this.maxTemp - this.measurements[0].temp);

        for (let i = 1; i < this.measurements.length; i++) {
            let m = this.measurements[i];

            pathStr += " L ";
            pathStr += xFactor * (m.time - this.minTime);
            pathStr += " ";
            pathStr += yFactor * (this.maxTemp - m.temp) + 2;
        }

        return pathStr;
    }

    get status() {
        return `Parsed Rows: ${this.parsedRows}, Dropped Rows: ${this.droppedRows}, Sorted: ${!this.unsorted}`;
    }

}

class BWETCaclulator {

    constructor() {
        this.dataSet = null;
        this.selectFile = document.getElementById('select-file');
        this.statusText = document.getElementById('import-status');

        this.selectFile.addEventListener('change', () => {
            const
                [file] = this.selectFile.files,
                reader = new FileReader();
            
            reader.addEventListener('load', () => {
                this.data = [];
                this.parseCSV(reader.result);
            }, { once:true });

            if (file) {
                reader.readAsText(file);
            }
        });

        window.addEventListener('resize', () => {
            if (this.dataSet) {
                this.createGraph(this.dataSet);
            }
        });
    }

    parseCSV(str) {
        const csvLines = str.replace(/\r\n?/g, '\n').split('\n');
        var firstRow = 0,
            dataSet = null;

        // First we need to create a new data set that is aware of which format the given .csv file
        // uses (either "NUMBER,TIME,TEMP,..." or "TIME,TEMP..."). This loop looks for the first
        // valid row of data and tries to use it to create a new data set
        for (let i = 0; i < csvLines.length; i++) {
            let row = csvLines[i].split(',');

            // Skip title/header rows
            if (row.length > 1 && this.isDataColumn(row[0])) {
                // Record this row as the first row of data and attempt to create a data set
                firstRow = i;
                dataSet = this.createDataSet(row);
            }

            // If the data set was successfully created, break the loop
            if (dataSet !== null) {
                break;
            }
        }

        // If the whole file was checked but a data set wasn't created, the parse has failed
        if (dataSet == null) {
            console.error("ERROR: Unable to parse CSV file");
            return;
        }

        // Data set created, .csv file can now be parsed
        dataSet.droppedRows = firstRow;
        for (let i = firstRow; i < csvLines.length; i++) {
            let row = csvLines[i].split(',');

            // Add the current row to the data set
            dataSet.addMeasurement(row);
        }

        this.dataSet = dataSet;
        this.statusText.innerText = dataSet.status;

        this.createGraph(this.dataSet);
    }

    isDataColumn(str) {
        return (str && (!isNaN(str) || !isNaN(Date.parse(str))));
    }

    createDataSet(row) {
        const allDateTimeRegs = [
            // Matches YYYY/MM/DD HH:MM:SS[ AM | PM]
            new RegExp('^(\\d{4})[-\\/](\\d{2})[-\\/](\\d{2})[T ](\\d{2}):(\\d{2}):(\\d{2}) *([AaPp][Mm])?$'),
            // Matches MM/DD/YY[YY] HH:MM:SS[ AM | PM]
            new RegExp('^(\\d{2})[-\\/](\\d{2})[-\\/](\\d{4}|\\d{2})[T ](\\d{2}):(\\d{2}):(\\d{2}) *([AaPp][Mm])?$')
        ];
        const allDateIndices = [
            { year: 1, month: 2, day: 3 },
            { year: 3, month: 1, day: 2 }
        ];
        var numbCol = null,
            timeCol = null,
            tempCol = null,
            dateTimeReg = null,
            dateIndices = null,
            twelveHour = false;
        
        for (let i = 0; i < row.length; i++) {
            let col = row[i];

            if (!col) {
                continue;
            }

            // If the TIME column has not yet been found
            if (timeCol == null) {
                // If this column contains a number, it is the NUMBER column
                if (!isNaN(col)) {
                    numbCol = i;
                }
                // Else if this column contains a date, it is the TIME column
                else if (!isNaN(Date.parse(col))) {
                    timeCol = i;
                    
                    // Determine which date format is used
                    for (let j = 0; j < allDateTimeRegs.length; j++) {
                        let reg = allDateTimeRegs[j];

                        if (reg.test(col)) {
                            let testExec = reg.exec(col),
                                apReg = new RegExp('^[AaPp][Mm]$', 'g');
                            
                            // Check if the date format uses 12-hour (AM/PM) time
                            if (typeof testExec[7] == 'string' && apReg.test(testExec[7])) {
                                twelveHour = true;
                            }

                            // Note which regular expression and corresponding date indices to use
                            // for this date format
                            dateTimeReg = reg;
                            dateIndices = allDateIndices[j];
                            break;
                        }
                    }
                }
            }
            // Else if the TIME column has been found and this column contains a number, it
            // is the TEMP column
            else if (!isNaN(col)) {
                tempCol = i;
            }

            // Break loop if TIME and TEMP columns have both been found
            if (timeCol !== null && tempCol !== null) {
                break;
            }
        }

        if (timeCol == null || tempCol == null || dateTimeReg == null || dateIndices == null) {
            return null;
        }
        else {
            return new DataSet(timeCol, tempCol, dateTimeReg, dateIndices, twelveHour);
        }
    }

    createGraph(dataSet) {
        var xmlns = "http://www.w3.org/2000/svg",
            container = document.getElementById('display'),
            width = container.clientWidth,
            height = container.clientHeight;

        var svgElem = document.createElementNS(xmlns, 'svg');
        svgElem.setAttributeNS(null, 'version', 1.1);
        svgElem.setAttributeNS(null, 'width', width);
        svgElem.setAttributeNS(null, 'height', height);
        svgElem.style.display = "block";

        var pathElem = document.createElementNS(xmlns, 'path');
        pathElem.setAttributeNS(null, 'fill', "none");
        pathElem.setAttributeNS(null, 'stroke', "blue");
        pathElem.setAttributeNS(null, 'stroke-width', 1);
        pathElem.setAttributeNS(null, 'd', this.dataSet.generateSVGPath(width, height));
        pathElem.id = "graph";

        if (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        svgElem.appendChild(pathElem);
        container.appendChild(svgElem);
    }

}

const BWETApp = new BWETCaclulator();